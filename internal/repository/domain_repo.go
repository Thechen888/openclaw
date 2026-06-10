package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"gorm.io/gorm"
)

// --- Connector Repository ---
type ConnectorRepository struct{ db *gorm.DB }

func NewConnectorRepository(db *gorm.DB) *ConnectorRepository { return &ConnectorRepository{db: db} }

func (r *ConnectorRepository) Create(c *model.Connector) error { return r.db.Create(c).Error }
func (r *ConnectorRepository) GetByID(id uuid.UUID) (*model.Connector, error) {
	var c model.Connector
	err := r.db.Where("id = ?", id).First(&c).Error
	return &c, err
}
func (r *ConnectorRepository) List(page, pageSize int, systemType, search string) ([]model.Connector, int64, error) {
	var items []model.Connector
	var total int64
	q := r.db.Model(&model.Connector{})
	if systemType != "" {
		q = q.Where("system_type = ?", systemType)
	}
	if search != "" {
		q = q.Where("name LIKE ? OR provider LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ConnectorRepository) Update(c *model.Connector) error { return r.db.Save(c).Error }
func (r *ConnectorRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Connector{}, "id = ?", id).Error
}

// --- Connector Event Repository ---
type ConnectorEventRepository struct{ db *gorm.DB }

func NewConnectorEventRepository(db *gorm.DB) *ConnectorEventRepository {
	return &ConnectorEventRepository{db: db}
}

func (r *ConnectorEventRepository) Create(e *model.ConnectorEvent) error { return r.db.Create(e).Error }
func (r *ConnectorEventRepository) List(connectorID uuid.UUID, page, pageSize int) ([]model.ConnectorEvent, int64, error) {
	var items []model.ConnectorEvent
	var total int64
	q := r.db.Model(&model.ConnectorEvent{}).Where("connector_id = ?", connectorID)
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("received_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ConnectorEventRepository) MarkProcessed(id uuid.UUID, execID uuid.UUID) error {
	return r.db.Model(&model.ConnectorEvent{}).Where("id = ?", id).Updates(map[string]interface{}{
		"processed": true, "processed_by": execID, "processed_at": time.Now(),
	}).Error
}

// --- Token Repository ---
type TokenRepository struct{ db *gorm.DB }

func NewTokenRepository(db *gorm.DB) *TokenRepository { return &TokenRepository{db: db} }

func (r *TokenRepository) Create(t *model.Token) error { return r.db.Create(t).Error }
func (r *TokenRepository) GetByID(id uuid.UUID) (*model.Token, error) {
	var t model.Token
	err := r.db.Preload("Permissions").Where("id = ?", id).First(&t).Error
	return &t, err
}
func (r *TokenRepository) List(page, pageSize int, ownerType string, ownerID *uuid.UUID, status string) ([]model.Token, int64, error) {
	var items []model.Token
	var total int64
	q := r.db.Model(&model.Token{})
	if ownerType != "" {
		q = q.Where("owner_type = ?", ownerType)
	}
	if ownerID != nil {
		q = q.Where("owner_id = ?", *ownerID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *TokenRepository) Update(t *model.Token) error { return r.db.Save(t).Error }
func (r *TokenRepository) ListPending() ([]model.Token, error) {
	var items []model.Token
	err := r.db.Where("status = ?", model.TokenStatusPending).Find(&items).Error
	return items, err
}
func (r *TokenRepository) CheckPermission(tokenID, connectorID uuid.UUID, apiPath, action string) (bool, error) {
	var count int64
	err := r.db.Model(&model.TokenPermission{}).
		Where("token_id = ? AND connector_id = ? AND is_active = ?", tokenID, connectorID, true).
		Count(&count).Error
	return count > 0, err
}
func (r *TokenRepository) AddPermission(p *model.TokenPermission) error { return r.db.Create(p).Error }
func (r *TokenRepository) SetPermissions(tokenID uuid.UUID, perms []model.TokenPermission) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("token_id = ?", tokenID).Delete(&model.TokenPermission{}).Error; err != nil {
			return err
		}
		for i := range perms {
			perms[i].TokenID = tokenID
			if err := tx.Create(&perms[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// --- Token Usage Log Repository ---
type TokenUsageLogRepository struct{ db *gorm.DB }

func NewTokenUsageLogRepository(db *gorm.DB) *TokenUsageLogRepository {
	return &TokenUsageLogRepository{db: db}
}

func (r *TokenUsageLogRepository) Create(log *model.TokenUsageLog) error {
	return r.db.Create(log).Error
}
func (r *TokenUsageLogRepository) List(tokenID uuid.UUID, page, pageSize int) ([]model.TokenUsageLog, int64, error) {
	var items []model.TokenUsageLog
	var total int64
	q := r.db.Model(&model.TokenUsageLog{}).Where("token_id = ?", tokenID)
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}

// --- SKILL Repository ---
type SkillRepository struct{ db *gorm.DB }

func NewSkillRepository(db *gorm.DB) *SkillRepository { return &SkillRepository{db: db} }

func (r *SkillRepository) Create(s *model.Skill) error { return r.db.Create(s).Error }
func (r *SkillRepository) GetByID(id uuid.UUID) (*model.Skill, error) {
	var s model.Skill
	err := r.db.Preload("Versions").Where("id = ?", id).First(&s).Error
	return &s, err
}
func (r *SkillRepository) List(page, pageSize int, skillType, status, search string) ([]model.Skill, int64, error) {
	var items []model.Skill
	var total int64
	q := r.db.Model(&model.Skill{})
	if skillType != "" {
		q = q.Where("skill_type = ?", skillType)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if search != "" {
		q = q.Where("name LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *SkillRepository) Update(s *model.Skill) error { return r.db.Save(s).Error }
func (r *SkillRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Skill{}, "id = ?", id).Error
}
func (r *SkillRepository) AddVersion(v *model.SkillVersion) error { return r.db.Create(v).Error }
func (r *SkillRepository) ListVersions(skillID uuid.UUID) ([]model.SkillVersion, error) {
	var versions []model.SkillVersion
	err := r.db.Where("skill_id = ?", skillID).Order("published_at DESC").Find(&versions).Error
	return versions, err
}

// --- SKILL Visibility Repository ---
type SkillVisibilityRepository struct{ db *gorm.DB }

func NewSkillVisibilityRepository(db *gorm.DB) *SkillVisibilityRepository {
	return &SkillVisibilityRepository{db: db}
}

func (r *SkillVisibilityRepository) SetVisibility(skillID uuid.UUID, rules []model.SkillVisibility) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("skill_id = ?", skillID).Delete(&model.SkillVisibility{}).Error; err != nil {
			return err
		}
		for i := range rules {
			rules[i].SkillID = skillID
			if err := tx.Create(&rules[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
func (r *SkillVisibilityRepository) GetBySkillID(skillID uuid.UUID) ([]model.SkillVisibility, error) {
	var rules []model.SkillVisibility
	err := r.db.Where("skill_id = ?", skillID).Find(&rules).Error
	return rules, err
}

// --- Agent Repository ---
type AgentRepository struct{ db *gorm.DB }

func NewAgentRepository(db *gorm.DB) *AgentRepository { return &AgentRepository{db: db} }

func (r *AgentRepository) Create(a *model.Agent) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(a).Error; err != nil {
			return err
		}
		for i := range a.Triggers {
			a.Triggers[i].AgentID = a.ID
			if err := tx.Create(&a.Triggers[i]).Error; err != nil {
				return err
			}
		}
		for i := range a.Conditions {
			a.Conditions[i].AgentID = a.ID
			if err := tx.Create(&a.Conditions[i]).Error; err != nil {
				return err
			}
		}
		for i := range a.Actions {
			a.Actions[i].AgentID = a.ID
			if err := tx.Create(&a.Actions[i]).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
func (r *AgentRepository) GetByID(id uuid.UUID) (*model.Agent, error) {
	var a model.Agent
	err := r.db.Preload("Triggers").Preload("Conditions").Preload("Actions").Where("id = ?", id).First(&a).Error
	return &a, err
}
func (r *AgentRepository) List(page, pageSize int, ownerType string, ownerID *uuid.UUID, status, search string) ([]model.Agent, int64, error) {
	var items []model.Agent
	var total int64
	q := r.db.Model(&model.Agent{})
	if ownerType != "" {
		q = q.Where("owner_type = ?", ownerType)
	}
	if ownerID != nil {
		q = q.Where("owner_id = ?", *ownerID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if search != "" {
		q = q.Where("name LIKE ?", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Preload("Triggers").Preload("Conditions").Preload("Actions").
		Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *AgentRepository) Update(a *model.Agent) error { return r.db.Save(a).Error }
func (r *AgentRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Agent{}, "id = ?", id).Error
}
func (r *AgentRepository) AddTrigger(t *model.AgentTrigger) error    { return r.db.Create(t).Error }
func (r *AgentRepository) UpdateTrigger(t *model.AgentTrigger) error { return r.db.Save(t).Error }
func (r *AgentRepository) DeleteTrigger(id uuid.UUID) error {
	return r.db.Delete(&model.AgentTrigger{}, "id = ?", id).Error
}
func (r *AgentRepository) AddCondition(c *model.AgentCondition) error    { return r.db.Create(c).Error }
func (r *AgentRepository) UpdateCondition(c *model.AgentCondition) error { return r.db.Save(c).Error }
func (r *AgentRepository) DeleteCondition(id uuid.UUID) error {
	return r.db.Delete(&model.AgentCondition{}, "id = ?", id).Error
}
func (r *AgentRepository) AddAction(a *model.AgentAction) error    { return r.db.Create(a).Error }
func (r *AgentRepository) UpdateAction(a *model.AgentAction) error { return r.db.Save(a).Error }
func (r *AgentRepository) DeleteAction(id uuid.UUID) error {
	return r.db.Delete(&model.AgentAction{}, "id = ?", id).Error
}

// --- Agent Execution Repository ---
type AgentExecutionRepository struct{ db *gorm.DB }

func NewAgentExecutionRepository(db *gorm.DB) *AgentExecutionRepository {
	return &AgentExecutionRepository{db: db}
}

func (r *AgentExecutionRepository) Create(e *model.AgentExecution) error { return r.db.Create(e).Error }
func (r *AgentExecutionRepository) GetByID(id uuid.UUID) (*model.AgentExecution, error) {
	var e model.AgentExecution
	err := r.db.Preload("Logs").Where("id = ?", id).First(&e).Error
	return &e, err
}
func (r *AgentExecutionRepository) List(agentID *uuid.UUID, page, pageSize int, status string) ([]model.AgentExecution, int64, error) {
	var items []model.AgentExecution
	var total int64
	q := r.db.Model(&model.AgentExecution{})
	if agentID != nil {
		q = q.Where("agent_id = ?", *agentID)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *AgentExecutionRepository) Update(e *model.AgentExecution) error { return r.db.Save(e).Error }
func (r *AgentExecutionRepository) AddLog(log *model.AgentExecutionLog) error {
	return r.db.Create(log).Error
}

// --- Account Match Repository ---
type AccountMatchRepository struct{ db *gorm.DB }

func NewAccountMatchRepository(db *gorm.DB) *AccountMatchRepository {
	return &AccountMatchRepository{db: db}
}

func (r *AccountMatchRepository) CreateResult(m *model.AccountMatchResult) error {
	return r.db.Create(m).Error
}
func (r *AccountMatchRepository) GetResultByID(id uuid.UUID) (*model.AccountMatchResult, error) {
	var m model.AccountMatchResult
	err := r.db.Preload("User").Where("id = ?", id).First(&m).Error
	return &m, err
}
func (r *AccountMatchRepository) ListResults(page, pageSize int, status, sourceType string) ([]model.AccountMatchResult, int64, error) {
	var items []model.AccountMatchResult
	var total int64
	q := r.db.Model(&model.AccountMatchResult{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if sourceType != "" {
		q = q.Where("source_type = ?", sourceType)
	}
	q.Count(&total)
	err := q.Preload("User").Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *AccountMatchRepository) UpdateResult(m *model.AccountMatchResult) error {
	return r.db.Save(m).Error
}
func (r *AccountMatchRepository) CreateRun(run *model.AccountMatchRun) error {
	return r.db.Create(run).Error
}
func (r *AccountMatchRepository) GetRunByID(id uuid.UUID) (*model.AccountMatchRun, error) {
	var run model.AccountMatchRun
	err := r.db.Where("id = ?", id).First(&run).Error
	return &run, err
}
func (r *AccountMatchRepository) ListRuns(page, pageSize int) ([]model.AccountMatchRun, int64, error) {
	var items []model.AccountMatchRun
	var total int64
	r.db.Model(&model.AccountMatchRun{}).Count(&total)
	err := r.db.Offset((page - 1) * pageSize).Limit(pageSize).Order("started_at DESC").Find(&items).Error
	return items, total, err
}
func (r *AccountMatchRepository) ListStrategies() ([]model.AccountMatchStrategy, error) {
	var strategies []model.AccountMatchStrategy
	err := r.db.Where("is_active = ?", true).Find(&strategies).Error
	return strategies, err
}
func (r *AccountMatchRepository) CreateStrategy(s *model.AccountMatchStrategy) error {
	return r.db.Create(s).Error
}
func (r *AccountMatchRepository) UpdateStrategy(s *model.AccountMatchStrategy) error {
	return r.db.Save(s).Error
}

// --- Audit Log Repository ---
type AuditLogRepository struct{ db *gorm.DB }

func NewAuditLogRepository(db *gorm.DB) *AuditLogRepository { return &AuditLogRepository{db: db} }

func (r *AuditLogRepository) Create(log *model.AuditLog) error { return r.db.Create(log).Error }
func (r *AuditLogRepository) List(page, pageSize int, actorType, action, resourceType string, startTime *time.Time) ([]model.AuditLog, int64, error) {
	var items []model.AuditLog
	var total int64
	q := r.db.Model(&model.AuditLog{})
	if actorType != "" {
		q = q.Where("actor_type = ?", actorType)
	}
	if action != "" {
		q = q.Where("action = ?", action)
	}
	if resourceType != "" {
		q = q.Where("resource_type = ?", resourceType)
	}
	if startTime != nil {
		q = q.Where("created_at >= ?", *startTime)
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}

// --- Usage Stat Repository ---
type UsageStatRepository struct{ db *gorm.DB }

func NewUsageStatRepository(db *gorm.DB) *UsageStatRepository { return &UsageStatRepository{db: db} }

func (r *UsageStatRepository) Upsert(s *model.UsageStat) error {
	return r.db.Where("period_type = ? AND period_start = ? AND dimension_type = ? AND dimension_id = ?",
		s.PeriodType, s.PeriodStart, s.DimensionType, s.DimensionID).
		Assign(s).FirstOrCreate(s).Error
}
func (r *UsageStatRepository) Query(dimensionType string, dimensionID *uuid.UUID, periodType string, start, end time.Time) ([]model.UsageStat, error) {
	var items []model.UsageStat
	q := r.db.Where("period_type = ? AND period_start BETWEEN ? AND ?", periodType, start, end)
	if dimensionType != "" {
		q = q.Where("dimension_type = ?", dimensionType)
	}
	if dimensionID != nil {
		q = q.Where("dimension_id = ?", *dimensionID)
	}
	err := q.Order("period_start ASC").Find(&items).Error
	return items, err
}

// --- Disk Quota Repository ---
type DiskQuotaRepository struct{ db *gorm.DB }

func NewDiskQuotaRepository(db *gorm.DB) *DiskQuotaRepository { return &DiskQuotaRepository{db: db} }

func (r *DiskQuotaRepository) GetByUserID(userID uuid.UUID) (*model.DiskQuota, error) {
	var q model.DiskQuota
	err := r.db.Where("user_id = ?", userID).First(&q).Error
	return &q, err
}
func (r *DiskQuotaRepository) Create(q *model.DiskQuota) error { return r.db.Create(q).Error }
func (r *DiskQuotaRepository) Update(q *model.DiskQuota) error { return r.db.Save(q).Error }
func (r *DiskQuotaRepository) List(page, pageSize int) ([]model.DiskQuota, int64, error) {
	var items []model.DiskQuota
	var total int64
	r.db.Model(&model.DiskQuota{}).Count(&total)
	err := r.db.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}

// --- Approval Repository ---
type ApprovalRepository struct{ db *gorm.DB }

func NewApprovalRepository(db *gorm.DB) *ApprovalRepository { return &ApprovalRepository{db: db} }

func (r *ApprovalRepository) Create(a *model.ApprovalRequest) error { return r.db.Create(a).Error }
func (r *ApprovalRepository) GetByID(id uuid.UUID) (*model.ApprovalRequest, error) {
	var a model.ApprovalRequest
	err := r.db.Where("id = ?", id).First(&a).Error
	return &a, err
}
func (r *ApprovalRepository) List(page, pageSize int, reqType, status string) ([]model.ApprovalRequest, int64, error) {
	var items []model.ApprovalRequest
	var total int64
	q := r.db.Model(&model.ApprovalRequest{})
	if reqType != "" {
		q = q.Where("request_type = ?", reqType)
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ApprovalRepository) Update(a *model.ApprovalRequest) error { return r.db.Save(a).Error }
