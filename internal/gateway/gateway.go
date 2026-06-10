package gateway

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

// CallRequest is the input to a proxied model call.
type CallRequest struct {
	PolicyID   uuid.UUID              `json:"policy_id"`
	BindingType string               `json:"binding_type"` // optional: resolve policy by binding
	BindingID  uuid.UUID              `json:"binding_id"`
	Messages   []map[string]string    `json:"messages"`
	Model      string                 `json:"model"`
	CallerType string                 `json:"caller_type"`
	CallerID   uuid.UUID              `json:"caller_id"`
	Stream     bool                   `json:"stream"`
}

// CallResponse is the result of a proxied model call.
type CallResponse struct {
	Content      string  `json:"content"`
	InputTokens  int     `json:"input_tokens"`
	OutputTokens int     `json:"output_tokens"`
	ModelUsed    string  `json:"model_used"`
	LatencyMs    int     `json:"latency_ms"`
	Cost         float64 `json:"cost"`
}

// HealthStatus describes the health of a single model source.
type HealthStatus struct {
	ModelSourceID uuid.UUID `json:"model_source_id"`
	Provider      string    `json:"provider"`
	ModelName     string    `json:"model_name"`
	Status        string    `json:"status"`
	LatencyMs     int       `json:"latency_ms"`
	LastError     string    `json:"last_error,omitempty"`
}

// ---------------------------------------------------------------------------
// Circuit breaker state (per upstream)
// ---------------------------------------------------------------------------

type circuitState int

const (
	circuitClosed   circuitState = iota // normal operation
	circuitOpen                         // rejecting calls
	circuitHalfOpen                     // allowing one probe call
)

type circuitBreaker struct {
	mu             sync.Mutex
	state          circuitState
	failCount      int
	lastFailureAt  time.Time
	openedAt       time.Time
}

// ---------------------------------------------------------------------------
// Round-robin counter per policy (used for weighted selection)
// ---------------------------------------------------------------------------

type rrCounter struct {
	counter uint64
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

// Gateway proxies LLM calls through model policies with circuit-breaking,
// weighted upstream selection, automatic retries and full call logging.
type Gateway struct {
	db      *gorm.DB
	logger  *zap.Logger
	client  *http.Client

	// circuit breakers keyed by upstream ID (uuid.UUID -> *circuitBreaker)
	circuits sync.Map

	// round-robin counters keyed by policy ID (uuid.UUID -> *rrCounter)
	counters sync.Map
}

// New creates and returns a ready-to-use Gateway.
func New(db *gorm.DB, logger *zap.Logger) *Gateway {
	return &Gateway{
		db:     db,
		logger: logger,
		client: &http.Client{
			Timeout: 120 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}
}

// ---------------------------------------------------------------------------
// ProxyCall – main entry point
// ---------------------------------------------------------------------------

// ProxyCall resolves the policy, picks an upstream, proxies the request and
// logs the result.  On failure it retries with the next upstream (up to
// MaxRetries) and finally falls back to the FallbackPolicyID if configured.
func (g *Gateway) ProxyCall(ctx context.Context, req CallRequest) (*CallResponse, error) {
	policy, err := g.resolvePolicy(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("gateway: resolve policy: %w", err)
	}

	resp, err := g.executeWithRetries(ctx, policy, req, 0)
	if err != nil && policy.FallbackPolicyID != nil {
		g.logger.Warn("gateway: primary policy failed, trying fallback",
			zap.String("primary_policy_id", policy.ID.String()),
			zap.Error(err),
		)
		fallback, ferr := g.loadPolicy(ctx, *policy.FallbackPolicyID)
		if ferr == nil {
			resp, err = g.executeWithRetries(ctx, fallback, req, 0)
		}
	}
	return resp, err
}

// ---------------------------------------------------------------------------
// Policy resolution
// ---------------------------------------------------------------------------

func (g *Gateway) resolvePolicy(ctx context.Context, req CallRequest) (*model.ModelPolicy, error) {
	if req.PolicyID != uuid.Nil {
		return g.loadPolicy(ctx, req.PolicyID)
	}
	if req.BindingType != "" && req.BindingID != uuid.Nil {
		var binding model.ModelPolicyBinding
		err := g.db.WithContext(ctx).
			Where("binding_type = ? AND binding_id = ? AND is_default = ?", req.BindingType, req.BindingID, true).
			First(&binding).Error
		if err != nil {
			return nil, fmt.Errorf("no policy binding found: %w", err)
		}
		return g.loadPolicy(ctx, binding.PolicyID)
	}
	return nil, errors.New("gateway: either PolicyID or BindingType+BindingID must be provided")
}

func (g *Gateway) loadPolicy(ctx context.Context, policyID uuid.UUID) (*model.ModelPolicy, error) {
	var policy model.ModelPolicy
	err := g.db.WithContext(ctx).
		Preload("Upstreams.ModelSource").
		Where("id = ? AND status = ?", policyID, "active").
		First(&policy).Error
	if err != nil {
		return nil, fmt.Errorf("load policy %s: %w", policyID, err)
	}
	if len(policy.Upstreams) == 0 {
		return nil, fmt.Errorf("policy %s has no upstreams", policyID)
	}
	// Sort upstreams by sort_order then priority.
	sort.Slice(policy.Upstreams, func(i, j int) bool {
		if policy.Upstreams[i].SortOrder != policy.Upstreams[j].SortOrder {
			return policy.Upstreams[i].SortOrder < policy.Upstreams[j].SortOrder
		}
		return policy.Upstreams[i].Priority < policy.Upstreams[j].Priority
	})
	return &policy, nil
}

// ---------------------------------------------------------------------------
// Weighted round-robin upstream selection
// ---------------------------------------------------------------------------

func (g *Gateway) selectUpstream(policy *model.ModelPolicy) []model.ModelPolicyUpstream {
	// Build a weighted, ordered list skipping circuit-broken upstreams.
	type weighted struct {
		upstream model.ModelPolicyUpstream
		weight   int
	}
	var candidates []weighted
	totalWeight := 0
	for _, u := range policy.Upstreams {
		if u.ModelSource == nil || u.ModelSource.Status != model.ModelSourceStatusActive {
			continue
		}
		if g.isCircuitOpen(u.ID) {
			continue
		}
		w := u.Weight
		if w <= 0 {
			w = 1
		}
		candidates = append(candidates, weighted{upstream: u, weight: w})
		totalWeight += w
	}

	if len(candidates) == 0 {
		return nil
	}

	// Get or create round-robin counter for this policy.
	val, _ := g.counters.LoadOrStore(policy.ID, &rrCounter{})
	rrc := val.(*rrCounter)
	idx := atomic.AddUint64(&rrc.counter, 1)

	// Weighted modulo selection.
	pos := int(idx) % totalWeight
	cumulative := 0
	for _, c := range candidates {
		cumulative += c.weight
		if pos < cumulative {
			// Return the selected upstream first, then the rest for retries.
			ordered := make([]model.ModelPolicyUpstream, 0, len(candidates))
			ordered = append(ordered, c.upstream)
			for _, other := range candidates {
				if other.upstream.ID != c.upstream.ID {
					ordered = append(ordered, other.upstream)
				}
			}
			return ordered
		}
	}
	// Fallback (should not reach here).
	result := make([]model.ModelPolicyUpstream, len(candidates))
	for i, c := range candidates {
		result[i] = c.upstream
	}
	return result
}

// ---------------------------------------------------------------------------
// Circuit breaker helpers
// ---------------------------------------------------------------------------

func (g *Gateway) getCircuit(upstreamID uuid.UUID) *circuitBreaker {
	val, _ := g.circuits.LoadOrStore(upstreamID, &circuitBreaker{state: circuitClosed})
	return val.(*circuitBreaker)
}

func (g *Gateway) isCircuitOpen(upstreamID uuid.UUID) bool {
	cb := g.getCircuit(upstreamID)
	cb.mu.Lock()
	defer cb.mu.Unlock()

	switch cb.state {
	case circuitClosed:
		return false
	case circuitOpen:
		// Check if timeout has elapsed -> transition to half-open.
		if time.Since(cb.openedAt) > 60*time.Second {
			cb.state = circuitHalfOpen
			return false // allow one probe
		}
		return true
	case circuitHalfOpen:
		return false // allow probe
	}
	return false
}

func (g *Gateway) recordSuccess(upstreamID uuid.UUID) {
	cb := g.getCircuit(upstreamID)
	cb.mu.Lock()
	defer cb.mu.Unlock()
	cb.failCount = 0
	cb.state = circuitClosed
}

func (g *Gateway) recordFailure(upstreamID uuid.UUID, threshold int) {
	cb := g.getCircuit(upstreamID)
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failCount++
	cb.lastFailureAt = time.Now()
	if cb.state == circuitHalfOpen || cb.failCount >= threshold {
		cb.state = circuitOpen
		cb.openedAt = time.Now()
	}
}

// ---------------------------------------------------------------------------
// Execute with retries
// ---------------------------------------------------------------------------

func (g *Gateway) executeWithRetries(
	ctx context.Context,
	policy *model.ModelPolicy,
	req CallRequest,
	depth int,
) (*CallResponse, error) {
	if depth > 2 { // prevent infinite fallback recursion
		return nil, errors.New("gateway: max fallback depth exceeded")
	}

	ordered := g.selectUpstream(policy)
	if len(ordered) == 0 {
		return nil, errors.New("gateway: no available upstreams (all circuits open or inactive)")
	}

	maxRetries := policy.MaxRetries
	if maxRetries < 0 {
		maxRetries = 0
	}
	if maxRetries >= len(ordered) {
		maxRetries = len(ordered) - 1
	}

	var lastErr error
	for i := 0; i <= maxRetries; i++ {
		upstream := ordered[i]
		source := upstream.ModelSource

		cbState := g.cbStateString(upstream.ID)
		start := time.Now()

		resp, err := g.doProxyCall(ctx, source, req, policy)
		latency := time.Since(start)

		callLog := model.ModelCallLog{
			PolicyID:            policy.ID,
			ModelSourceID:       source.ID,
			CallerType:          req.CallerType,
			CallerID:            req.CallerID,
			TaskType:            policy.TaskType,
			RequestModel:        req.Model,
			Status:              "success",
			LatencyMs:           int(latency.Milliseconds()),
			CircuitBreakerState: cbState,
			RetryCount:          i,
			CreatedAt:           time.Now(),
		}

		if err != nil {
			lastErr = err
			g.recordFailure(upstream.ID, policy.CircuitBreakerThreshold)
			callLog.Status = "error"
			callLog.ErrorMessage = err.Error()
			callLog.CircuitBreakerState = g.cbStateString(upstream.ID)
			g.saveCallLog(ctx, &callLog)
			g.logger.Warn("gateway: upstream call failed",
				zap.String("upstream_id", upstream.ID.String()),
				zap.String("source", source.DisplayName),
				zap.Int("attempt", i+1),
				zap.Error(err),
			)
			continue
		}

		g.recordSuccess(upstream.ID)
		callLog.ActualModel = resp.ModelUsed
		callLog.InputTokens = resp.InputTokens
		callLog.OutputTokens = resp.OutputTokens
		callLog.TotalTokens = resp.InputTokens + resp.OutputTokens
		callLog.Cost = resp.Cost
		g.saveCallLog(ctx, &callLog)

		resp.LatencyMs = int(latency.Milliseconds())
		return resp, nil
	}
	return nil, fmt.Errorf("gateway: all %d upstream attempts failed, last error: %w", maxRetries+1, lastErr)
}

func (g *Gateway) cbStateString(upstreamID uuid.UUID) string {
	cb := g.getCircuit(upstreamID)
	cb.mu.Lock()
	defer cb.mu.Unlock()
	switch cb.state {
	case circuitClosed:
		return "closed"
	case circuitOpen:
		return "open"
	case circuitHalfOpen:
		return "half_open"
	}
	return "unknown"
}

func (g *Gateway) saveCallLog(ctx context.Context, log *model.ModelCallLog) {
	if err := g.db.WithContext(ctx).Create(log).Error; err != nil {
		g.logger.Error("gateway: failed to save call log", zap.Error(err))
	}
}

// ---------------------------------------------------------------------------
// HTTP proxy call to model source
// ---------------------------------------------------------------------------

// openAI-style chat completion request/response (covers most providers).
type chatRequest struct {
	Model    string              `json:"model"`
	Messages []map[string]string `json:"messages"`
	Stream   bool                `json:"stream"`
}

type chatResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

func (g *Gateway) doProxyCall(
	ctx context.Context,
	source *model.ModelSource,
	req CallRequest,
	policy *model.ModelPolicy,
) (*CallResponse, error) {
	modelName := req.Model
	if modelName == "" {
		modelName = source.ModelName
	}

	body := chatRequest{
		Model:    modelName,
		Messages: req.Messages,
		Stream:   req.Stream,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request body: %w", err)
	}

	// Compute request hash for dedup / tracing.
	hash := sha256.Sum256(bodyBytes)
	_ = fmt.Sprintf("%x", hash[:16]) // available for call log if needed

	endpoint := source.APIEndpoint
	if source.APIVersion != "" {
		endpoint = endpoint + "/" + source.APIVersion
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint+"/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("create http request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Apply auth header.
	if err := g.applyAuth(httpReq, source); err != nil {
		return nil, fmt.Errorf("apply auth: %w", err)
	}

	// Apply per-source timeout.
	timeout := time.Duration(source.TimeoutMs) * time.Millisecond
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	client := &http.Client{
		Timeout:   timeout,
		Transport: g.client.Transport,
	}

	httpResp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http call to %s: %w", source.DisplayName, err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(httpResp.Body, 10*1024*1024)) // 10 MB limit
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return nil, fmt.Errorf("upstream %s returned HTTP %d: %s", source.DisplayName, httpResp.StatusCode, truncate(respBody, 500))
	}

	var chatResp chatResponse
	if err := json.Unmarshal(respBody, &chatResp); err != nil {
		return nil, fmt.Errorf("unmarshal response from %s: %w", source.DisplayName, err)
	}
	if chatResp.Error != nil {
		return nil, fmt.Errorf("upstream API error: %s", chatResp.Error.Message)
	}

	content := ""
	if len(chatResp.Choices) > 0 {
		content = chatResp.Choices[0].Message.Content
	}

	inputTokens := chatResp.Usage.PromptTokens
	outputTokens := chatResp.Usage.CompletionTokens
	cost := g.calculateCost(source, inputTokens, outputTokens)

	return &CallResponse{
		Content:      content,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		ModelUsed:    chatResp.Model,
		Cost:         cost,
	}, nil
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

type authConfig struct {
	HeaderName  string `json:"header_name"`
	HeaderValue string `json:"header_value"`
	Prefix      string `json:"prefix"`
}

func (g *Gateway) applyAuth(req *http.Request, source *model.ModelSource) error {
	credential := source.AuthCredentialEncrypted // In production this would be decrypted.

	switch source.AuthType {
	case model.AuthTypeBearer:
		req.Header.Set("Authorization", "Bearer "+credential)
	case model.AuthTypeAPIKey:
		var ac authConfig
		if source.AuthConfig != "" {
			_ = json.Unmarshal([]byte(source.AuthConfig), &ac)
		}
		headerName := ac.HeaderName
		if headerName == "" {
			headerName = "X-API-Key"
		}
		prefix := ac.Prefix
		if prefix != "" {
			credential = prefix + credential
		}
		req.Header.Set(headerName, credential)
	case model.AuthTypeBasic:
		// credential expected as "user:password" already base64-encoded.
		req.Header.Set("Authorization", "Basic "+credential)
	case model.AuthTypeCustomHeader:
		var ac authConfig
		if source.AuthConfig != "" {
			if err := json.Unmarshal([]byte(source.AuthConfig), &ac); err != nil {
				return fmt.Errorf("parse custom auth config: %w", err)
			}
		}
		headerName := ac.HeaderName
		if headerName == "" {
			headerName = "Authorization"
		}
		req.Header.Set(headerName, ac.HeaderValue)
	default:
		// No auth or unknown – do nothing.
	}
	return nil
}

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

func (g *Gateway) calculateCost(source *model.ModelSource, inputTokens, outputTokens int) float64 {
	inputCost := float64(inputTokens) / 1000.0 * source.InputPricePer1K
	outputCost := float64(outputTokens) / 1000.0 * source.OutputPricePer1K
	return inputCost + outputCost
}

// ---------------------------------------------------------------------------
// HealthCheck
// ---------------------------------------------------------------------------

// HealthCheck probes every active model source and returns a status map keyed
// by source ID.
func (g *Gateway) HealthCheck(ctx context.Context) map[string]HealthStatus {
	var sources []model.ModelSource
	if err := g.db.WithContext(ctx).Where("status = ?", model.ModelSourceStatusActive).Find(&sources).Error; err != nil {
		g.logger.Error("gateway: health check query failed", zap.Error(err))
		return nil
	}

	results := make(map[string]HealthStatus, len(sources))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, src := range sources {
		wg.Add(1)
		go func(s model.ModelSource) {
			defer wg.Done()
			status := g.probeSource(ctx, s)
			mu.Lock()
			results[s.ID.String()] = status
			mu.Unlock()
		}(src)
	}
	wg.Wait()

	// Persist health status.
	for _, src := range sources {
		hs := results[src.ID.String()]
		newStatus := model.HealthStatusHealthy
		if hs.Status == model.HealthStatusUnhealthy {
			newStatus = model.HealthStatusUnhealthy
		} else if hs.Status == model.HealthStatusDegraded {
			newStatus = model.HealthStatusDegraded
		}
		now := time.Now()
		g.db.WithContext(ctx).Model(&model.ModelSource{}).
			Where("id = ?", src.ID).
			Updates(map[string]interface{}{
				"health_status":    newStatus,
				"last_health_check": now,
			})
	}

	return results
}

func (g *Gateway) probeSource(ctx context.Context, source model.ModelSource) HealthStatus {
	hs := HealthStatus{
		ModelSourceID: source.ID,
		Provider:      source.Provider,
		ModelName:     source.ModelName,
		Status:        model.HealthStatusHealthy,
	}

	endpoint := source.APIEndpoint
	if source.APIVersion != "" {
		endpoint += "/" + source.APIVersion
	}

	// Simple HEAD/GET probe with short timeout.
	probeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	httpReq, err := http.NewRequestWithContext(probeCtx, http.MethodGet, endpoint+"/models", nil)
	if err != nil {
		hs.Status = model.HealthStatusUnhealthy
		hs.LastError = err.Error()
		return hs
	}
	_ = g.applyAuth(httpReq, &source)

	start := time.Now()
	resp, err := g.client.Do(httpReq)
	latency := time.Since(start)
	hs.LatencyMs = int(latency.Milliseconds())

	if err != nil {
		hs.Status = model.HealthStatusUnhealthy
		hs.LastError = err.Error()
		return hs
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		hs.Status = model.HealthStatusUnhealthy
		hs.LastError = fmt.Sprintf("HTTP %d", resp.StatusCode)
	} else if resp.StatusCode >= 400 || latency > 5*time.Second {
		hs.Status = model.HealthStatusDegraded
		hs.LastError = fmt.Sprintf("HTTP %d, latency %dms", resp.StatusCode, hs.LatencyMs)
	}

	return hs
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

func truncate(b []byte, maxLen int) string {
	if len(b) <= maxLen {
		return string(b)
	}
	return string(b[:maxLen]) + "...(truncated)"
}
