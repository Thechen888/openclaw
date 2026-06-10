package matcher

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// RunResult summarises the outcome of a single matching run.
type RunResult struct {
	RunID         uuid.UUID `json:"run_id"`
	AutoMatched   int       `json:"auto_matched"`
	PendingReview int       `json:"pending_review"`
	Conflicts     int       `json:"conflicts"`
	Unmatched     int       `json:"unmatched"`
	Errors        int       `json:"errors"`
	DurationMs    int       `json:"duration_ms"`
}

// FieldConfig defines how a single field participates in scoring.
type FieldConfig struct {
	Field     string  `json:"field"`
	Weight    float64 `json:"weight"`
	MatchType string  `json:"match_type"` // exact, fuzzy, partial
}

// matchCandidate is a scored pairing of a chat account and a third-party account.
type matchCandidate struct {
	ThirdPartyID uuid.UUID
	Score        float64
	Evidence     map[string]fieldEvidence
}

type fieldEvidence struct {
	Field     string  `json:"field"`
	ChatVal   string  `json:"chat_val"`
	TPVal     string  `json:"tp_val"`
	Score     float64 `json:"score"`
	Weight    float64 `json:"weight"`
	MatchType string  `json:"match_type"`
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

// Matcher runs account-matching strategies that pair chat-platform identities
// with third-party system identities based on configurable field scoring.
type Matcher struct {
	db     *gorm.DB
	logger *zap.Logger
}

// New creates and returns a ready-to-use Matcher.
func New(db *gorm.DB, logger *zap.Logger) *Matcher {
	return &Matcher{db: db, logger: logger}
}

// ---------------------------------------------------------------------------
// RunMatching – main entry point
// ---------------------------------------------------------------------------

// RunMatching executes the matching strategy identified by strategyID.
// It loads all unmatched chat accounts, scores them against unmatched
// third-party accounts from the strategy's source system, applies thresholds,
// detects conflicts, and persists results.
func (m *Matcher) RunMatching(ctx context.Context, strategyID uuid.UUID, triggerType string) (*RunResult, error) {
	startTime := time.Now()

	// 1. Load strategy.
	var strategy model.AccountMatchStrategy
	if err := m.db.WithContext(ctx).Where("id = ? AND is_active = ?", strategyID, true).First(&strategy).Error; err != nil {
		return nil, fmt.Errorf("matcher: load strategy %s: %w", strategyID, err)
	}

	var fieldConfigs []FieldConfig
	if err := json.Unmarshal([]byte(strategy.FieldConfigs), &fieldConfigs); err != nil {
		return nil, fmt.Errorf("matcher: parse field_configs: %w", err)
	}
	if len(fieldConfigs) == 0 {
		return nil, fmt.Errorf("matcher: strategy %s has no field configs", strategyID)
	}

	strategySnapshot, _ := json.Marshal(strategy)

	// 2. Create run record.
	run := &model.AccountMatchRun{
		TriggerType:      triggerType,
		StrategySnapshot: string(strategySnapshot),
		StartedAt:        startTime,
	}
	if err := m.db.WithContext(ctx).Create(run).Error; err != nil {
		return nil, fmt.Errorf("matcher: create run record: %w", err)
	}

	// 3. Load unmatched chat accounts.
	var chatAccounts []model.ChatAccount
	if err := m.db.WithContext(ctx).
		Where("match_status = ? OR match_status = ?", model.MatchStatusUnmatched, "").
		Find(&chatAccounts).Error; err != nil {
		return nil, fmt.Errorf("matcher: load chat accounts: %w", err)
	}

	// 4. Load unmatched third-party accounts for this source system.
	var tpAccounts []model.ThirdPartyAccount
	tpQuery := m.db.WithContext(ctx).
		Where("match_status = ? OR match_status = ?", model.MatchStatusUnmatched, "")
	if strategy.SourceSystem != "" {
		tpQuery = tpQuery.Where("system_type = ?", strategy.SourceSystem)
	}
	if err := tpQuery.Find(&tpAccounts).Error; err != nil {
		return nil, fmt.Errorf("matcher: load third-party accounts: %w", err)
	}

	run.TotalAccounts = len(chatAccounts)

	// Build lookup for quick access.
	tpLookup := make(map[uuid.UUID]model.ThirdPartyAccount, len(tpAccounts))
	for _, tp := range tpAccounts {
		tpLookup[tp.ID] = tp
	}

	// 5. Load existing protected results to skip.
	protectedSet := m.loadProtectedSet(ctx, run.ID)

	// 6. Score each chat account against all candidate third-party accounts.
	autoMatched := 0
	pendingReview := 0
	conflicts := 0
	unmatched := 0
	errors := 0

	for _, chat := range chatAccounts {
		candidates := m.scoreChatAccount(chat, tpAccounts, fieldConfigs)

		if len(candidates) == 0 {
			unmatched++
			continue
		}

		// Sort candidates by score descending.
		sortCandidates(candidates)

		best := candidates[0]

		// Check if this pairing is protected.
		if protectedSet[best.ThirdPartyID] {
			m.logger.Debug("matcher: skipping protected match",
				zap.String("chat_id", chat.ID.String()),
				zap.String("tp_id", best.ThirdPartyID.String()),
			)
			unmatched++
			continue
		}

		// Detect conflicts: multiple candidates above auto_threshold.
		highScorers := 0
		for _, c := range candidates {
			if c.Score >= strategy.AutoThreshold {
				highScorers++
			}
		}
		if highScorers > 1 {
			// Conflict: multiple strong matches.
			conflicts++
			m.saveConflictResults(ctx, run, chat, candidates[:highScorers], strategy)
			continue
		}

		evidenceBytes, _ := json.Marshal(best.Evidence)

		if best.Score >= strategy.AutoThreshold {
			// Auto-match.
			result := model.AccountMatchResult{
				SourceType:      "chat",
				SourceAccountID: chat.ID,
				Status:          model.MatchStatusMatched,
				Score:           best.Score,
				Evidence:        string(evidenceBytes),
				StrategyVersion: strategy.ID.String(),
				RunID:           &run.ID,
			}
			// Try to resolve user from third-party account.
			if tp, ok := tpLookup[best.ThirdPartyID]; ok && tp.UserID != nil {
				result.UserID = tp.UserID
			}
			if err := m.db.WithContext(ctx).Create(&result).Error; err != nil {
				m.logger.Error("matcher: save auto-match result", zap.Error(err))
				errors++
				continue
			}

			// Update chat account match status.
			m.db.WithContext(ctx).Model(&model.ChatAccount{}).
				Where("id = ?", chat.ID).
				Updates(map[string]any{
					"match_status":   model.MatchStatusMatched,
					"match_score":    best.Score,
					"match_evidence": string(evidenceBytes),
				})

			// Update third-party account match status.
			m.db.WithContext(ctx).Model(&model.ThirdPartyAccount{}).
				Where("id = ?", best.ThirdPartyID).
				Updates(map[string]any{
					"match_status": model.MatchStatusMatched,
					"match_score":  best.Score,
				})

			autoMatched++

		} else if best.Score >= strategy.PendingThreshold {
			// Pending review.
			result := model.AccountMatchResult{
				SourceType:      "chat",
				SourceAccountID: chat.ID,
				Status:          model.MatchStatusPending,
				Score:           best.Score,
				Evidence:        string(evidenceBytes),
				StrategyVersion: strategy.ID.String(),
				RunID:           &run.ID,
			}
			if tp, ok := tpLookup[best.ThirdPartyID]; ok && tp.UserID != nil {
				result.UserID = tp.UserID
			}
			if err := m.db.WithContext(ctx).Create(&result).Error; err != nil {
				m.logger.Error("matcher: save pending result", zap.Error(err))
				errors++
				continue
			}

			m.db.WithContext(ctx).Model(&model.ChatAccount{}).
				Where("id = ?", chat.ID).
				Updates(map[string]any{
					"match_status":   model.MatchStatusPending,
					"match_score":    best.Score,
					"match_evidence": string(evidenceBytes),
				})

			pendingReview++

		} else {
			unmatched++
		}
	}

	// 7. Finalize run.
	duration := time.Since(startTime)
	now := time.Now()
	run.AutoMatched = autoMatched
	run.PendingReview = pendingReview
	run.Conflicts = conflicts
	run.Unmatched = unmatched
	run.Errors = errors
	run.DurationMs = int(duration.Milliseconds())
	run.CompletedAt = &now

	m.db.WithContext(ctx).Model(run).Updates(map[string]any{
		"total_accounts": run.TotalAccounts,
		"auto_matched":   autoMatched,
		"pending_review": pendingReview,
		"conflicts":      conflicts,
		"unmatched":      unmatched,
		"errors":         errors,
		"duration_ms":    run.DurationMs,
		"completed_at":   now,
	})

	return &RunResult{
		RunID:         run.ID,
		AutoMatched:   autoMatched,
		PendingReview: pendingReview,
		Conflicts:     conflicts,
		Unmatched:     unmatched,
		Errors:        errors,
		DurationMs:    run.DurationMs,
	}, nil
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

func (m *Matcher) scoreChatAccount(
	chat model.ChatAccount,
	tpAccounts []model.ThirdPartyAccount,
	fieldConfigs []FieldConfig,
) []matchCandidate {
	var candidates []matchCandidate

	// Compute total weight for normalisation.
	totalWeight := 0.0
	for _, fc := range fieldConfigs {
		totalWeight += fc.Weight
	}
	if totalWeight <= 0 {
		totalWeight = 1.0
	}

	for _, tp := range tpAccounts {
		evidence := make(map[string]fieldEvidence)
		weightedSum := 0.0

		for _, fc := range fieldConfigs {
			score := m.scoreField(fc, chat, tp)
			if score > 0 {
				weightedSum += score * fc.Weight
				chatVal, tpVal := extractFieldValues(fc.Field, chat, tp)
				evidence[fc.Field] = fieldEvidence{
					Field:     fc.Field,
					ChatVal:   chatVal,
					TPVal:     tpVal,
					Score:     score,
					Weight:    fc.Weight,
					MatchType: fc.MatchType,
				}
			}
		}

		normalisedScore := weightedSum / totalWeight
		// Clamp to [0, 1].
		if normalisedScore > 1.0 {
			normalisedScore = 1.0
		}
		if normalisedScore < 0 {
			normalisedScore = 0
		}

		// Only consider candidates with at least some signal.
		if normalisedScore > 0.1 && len(evidence) > 0 {
			candidates = append(candidates, matchCandidate{
				ThirdPartyID: tp.ID,
				Score:        normalisedScore,
				Evidence:     evidence,
			})
		}
	}

	return candidates
}

func (m *Matcher) scoreField(fc FieldConfig, chat model.ChatAccount, tp model.ThirdPartyAccount) float64 {
	switch fc.Field {
	case "phone":
		return scorePhone(chat.Phone, tp.Phone, fc.MatchType)
	case "email":
		return scoreEmail(chat.Email, tp.Email, fc.MatchType)
	case "name":
		return scoreName(chat.Nickname, tp.Name, fc.MatchType)
	case "company", "department":
		return scoreCompany(chat.Nickname, tp.Department, fc.MatchType) // chat may carry company in nickname/raw data
	default:
		// For unknown fields, try generic string comparison.
		chatVal, tpVal := extractFieldValues(fc.Field, chat, tp)
		if chatVal == "" || tpVal == "" {
			return 0
		}
		return genericScore(chatVal, tpVal, fc.MatchType)
	}
}

// ---------------------------------------------------------------------------
// Field scoring functions
// ---------------------------------------------------------------------------

// scorePhone compares phone numbers. Exact match = 1.0, otherwise 0.
func scorePhone(chatPhone, tpPhone, matchType string) float64 {
	a := normalizePhone(chatPhone)
	b := normalizePhone(tpPhone)
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1.0
	}
	// Check if one contains the other (partial match for short numbers).
	if matchType == "partial" {
		if strings.HasSuffix(a, b) || strings.HasSuffix(b, a) {
			return 0.7
		}
	}
	return 0
}

// scoreEmail compares email addresses. Exact match = 1.0, domain-only match lower.
func scoreEmail(chatEmail, tpEmail, matchType string) float64 {
	a := strings.ToLower(strings.TrimSpace(chatEmail))
	b := strings.ToLower(strings.TrimSpace(tpEmail))
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1.0
	}

	// Compare local parts and domains separately.
	aParts := strings.SplitN(a, "@", 2)
	bParts := strings.SplitN(b, "@", 2)

	if len(aParts) == 2 && len(bParts) == 2 {
		if aParts[0] == bParts[0] && aParts[1] != bParts[1] {
			// Same local part, different domain.
			return 0.5
		}
		if aParts[1] == bParts[1] && matchType == "partial" {
			// Same domain only: weak signal.
			return 0.2
		}
	}
	return 0
}

// scoreName compares display names using fuzzy matching.
// Exact = 1.0, high similarity = 0.8, partial overlap = 0.3-0.6.
func scoreName(chatName, tpName, matchType string) float64 {
	a := normalizeName(chatName)
	b := normalizeName(tpName)
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1.0
	}

	// Check if one is a substring of the other.
	if strings.Contains(a, b) || strings.Contains(b, a) {
		return 0.7
	}

	// Token-based overlap.
	tokensA := tokenize(a)
	tokensB := tokenize(b)
	if len(tokensA) == 0 || len(tokensB) == 0 {
		return 0
	}

	common := 0
	for _, ta := range tokensA {
		for _, tb := range tokensB {
			if ta == tb {
				common++
				break
			}
		}
	}
	maxLen := len(tokensA)
	if len(tokensB) > maxLen {
		maxLen = len(tokensB)
	}
	if maxLen == 0 {
		return 0
	}
	overlap := float64(common) / float64(maxLen)

	// Scale: 0.3-0.8 range for partial matches.
	if overlap > 0 {
		return 0.3 + overlap*0.5
	}

	// Edit distance based similarity for single-token names.
	if len(tokensA) == 1 && len(tokensB) == 1 {
		sim := similarity(a, b)
		if sim >= 0.8 {
			return 0.6
		}
		if sim >= 0.6 {
			return 0.4
		}
	}

	return 0
}

// scoreCompany compares company/department names.
// Exact = 1.0, fuzzy partial = 0.2-0.5.
func scoreCompany(chatCompany, tpCompany, matchType string) float64 {
	a := normalizeName(chatCompany)
	b := normalizeName(tpCompany)
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1.0
	}
	if strings.Contains(a, b) || strings.Contains(b, a) {
		return 0.5
	}
	// Token overlap.
	tokensA := tokenize(a)
	tokensB := tokenize(b)
	common := 0
	for _, ta := range tokensA {
		for _, tb := range tokensB {
			if ta == tb {
				common++
				break
			}
		}
	}
	maxLen := len(tokensA)
	if len(tokensB) > maxLen {
		maxLen = len(tokensB)
	}
	if maxLen == 0 {
		return 0
	}
	overlap := float64(common) / float64(maxLen)
	if overlap > 0 {
		return 0.2 + overlap*0.3 // 0.2 - 0.5
	}
	return 0
}

// genericScore is a fallback for unknown fields.
func genericScore(a, b, matchType string) float64 {
	a = strings.ToLower(strings.TrimSpace(a))
	b = strings.ToLower(strings.TrimSpace(b))
	if a == "" || b == "" {
		return 0
	}
	if a == b {
		return 1.0
	}
	if matchType == "partial" && (strings.Contains(a, b) || strings.Contains(b, a)) {
		return 0.5
	}
	if matchType == "fuzzy" {
		sim := similarity(a, b)
		if sim >= 0.8 {
			return 0.6
		}
		if sim >= 0.5 {
			return 0.3
		}
	}
	return 0
}

// ---------------------------------------------------------------------------
// Conflict handling
// ---------------------------------------------------------------------------

func (m *Matcher) saveConflictResults(
	ctx context.Context,
	run *model.AccountMatchRun,
	chat model.ChatAccount,
	candidates []matchCandidate,
	strategy model.AccountMatchStrategy,
) {
	for _, c := range candidates {
		evidenceBytes, _ := json.Marshal(c.Evidence)
		result := model.AccountMatchResult{
			SourceType:      "chat",
			SourceAccountID: chat.ID,
			Status:          model.MatchStatusConflict,
			Score:           c.Score,
			Evidence:        string(evidenceBytes),
			StrategyVersion: strategy.ID.String(),
			RunID:           &run.ID,
		}
		if err := m.db.WithContext(ctx).Create(&result).Error; err != nil {
			m.logger.Error("matcher: save conflict result", zap.Error(err))
		}
	}
	// Mark chat account as conflict.
	m.db.WithContext(ctx).Model(&model.ChatAccount{}).
		Where("id = ?", chat.ID).
		Update("match_status", model.MatchStatusConflict)
}

// ---------------------------------------------------------------------------
// Protected set
// ---------------------------------------------------------------------------

func (m *Matcher) loadProtectedSet(ctx context.Context, _ uuid.UUID) map[uuid.UUID]bool {
	var results []model.AccountMatchResult
	m.db.WithContext(ctx).
		Where("protected_from_auto = ?", true).
		Find(&results)
	set := make(map[uuid.UUID]bool, len(results))
	for _, r := range results {
		set[r.SourceAccountID] = true
	}
	return set
}

// ---------------------------------------------------------------------------
// Sorting helper (insertion sort – candidate lists are typically small)
// ---------------------------------------------------------------------------

func sortCandidates(candidates []matchCandidate) {
	for i := 1; i < len(candidates); i++ {
		key := candidates[i]
		j := i - 1
		for j >= 0 && candidates[j].Score < key.Score {
			candidates[j+1] = candidates[j]
			j--
		}
		candidates[j+1] = key
	}
}

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

func normalizePhone(phone string) string {
	var digits []rune
	for _, r := range phone {
		if unicode.IsDigit(r) {
			digits = append(digits, r)
		}
	}
	return string(digits)
}

func normalizeName(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	// Remove common punctuation.
	var cleaned []rune
	for _, r := range name {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
			cleaned = append(cleaned, r)
		}
	}
	// Collapse spaces.
	parts := strings.Fields(string(cleaned))
	return strings.Join(parts, " ")
}

func tokenize(s string) []string {
	return strings.Fields(strings.ToLower(strings.TrimSpace(s)))
}

func extractFieldValues(field string, chat model.ChatAccount, tp model.ThirdPartyAccount) (string, string) {
	switch field {
	case "phone":
		return chat.Phone, tp.Phone
	case "email":
		return chat.Email, tp.Email
	case "name":
		return chat.Nickname, tp.Name
	case "department", "company":
		return chat.Nickname, tp.Department
	case "login_name":
		return chat.Nickname, tp.LoginName
	default:
		// Try to extract from RawData JSON.
		chatRaw := extractFromJSON(chat.RawData, field)
		tpRaw := extractFromJSON(tp.RawData, field)
		return chatRaw, tpRaw
	}
}

func extractFromJSON(rawJSON, key string) string {
	if rawJSON == "" {
		return ""
	}
	var m map[string]any
	if err := json.Unmarshal([]byte(rawJSON), &m); err != nil {
		return ""
	}
	if val, ok := m[key]; ok {
		return fmt.Sprintf("%v", val)
	}
	return ""
}

// ---------------------------------------------------------------------------
// String similarity (Dice coefficient on bigrams)
// ---------------------------------------------------------------------------

func similarity(a, b string) float64 {
	if a == b {
		return 1.0
	}
	if len(a) < 2 || len(b) < 2 {
		return 0
	}
	bigramsA := bigrams(a)
	bigramsB := bigrams(b)
	intersection := 0
	for _, ba := range bigramsA {
		for _, bb := range bigramsB {
			if ba == bb {
				intersection++
				break
			}
		}
	}
	total := len(bigramsA) + len(bigramsB)
	if total == 0 {
		return 0
	}
	return 2.0 * float64(intersection) / float64(total)
}

func bigrams(s string) []string {
	runes := []rune(s)
	n := len(runes) - 1
	if n <= 0 {
		return nil
	}
	result := make([]string, n)
	for i := 0; i < n; i++ {
		result[i] = string(runes[i : i+2])
	}
	return result
}

// round to 4 decimal places for score storage.
func roundScore(f float64) float64 {
	return math.Round(f*10000) / 10000
}
