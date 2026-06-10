package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLog records all auditable actions
type AuditLog struct {
	ID            uuid.UUID `json:"id" gorm:"type:char(36);primary_key"`
	ActorType     string    `json:"actor_type" gorm:"type:varchar(16);index"` // user, admin, agent, system
	ActorID       uuid.UUID `json:"actor_id" gorm:"type:char(36);index"`
	Action        string    `json:"action" gorm:"type:varchar(64);index"`
	ResourceType  string    `json:"resource_type" gorm:"type:varchar(32);index"`
	ResourceID    uuid.UUID `json:"resource_id" gorm:"type:char(36)"`
	PrincipalType string    `json:"principal_type" gorm:"type:varchar(16)"`
	PrincipalID   uuid.UUID `json:"principal_id" gorm:"type:char(36)"`
	Details       string    `json:"details" gorm:"type:text"` // JSON, sanitized
	IPAddress     string    `json:"ip_address" gorm:"type:varchar(45)"`
	UserAgent     string    `json:"user_agent" gorm:"type:varchar(256)"`
	Outcome       string    `json:"outcome" gorm:"type:varchar(16)"`
	DurationMs    int       `json:"duration_ms"`
	CreatedAt     time.Time `json:"created_at" gorm:"index"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (AuditLog) TableName() string { return "audit_logs" }

// UsageStat stores aggregated usage metrics
type UsageStat struct {
	ID            uuid.UUID `json:"id" gorm:"type:char(36);primary_key"`
	PeriodType    string    `json:"period_type" gorm:"type:varchar(8);uniqueIndex:idx_usage_period"`
	PeriodStart   time.Time `json:"period_start" gorm:"uniqueIndex:idx_usage_period"`
	DimensionType string    `json:"dimension_type" gorm:"type:varchar(16);uniqueIndex:idx_usage_period"`
	DimensionID   uuid.UUID `json:"dimension_id" gorm:"type:char(36);uniqueIndex:idx_usage_period"`
	CallCount     int64     `json:"call_count"`
	InputTokens   int64     `json:"input_tokens"`
	OutputTokens  int64     `json:"output_tokens"`
	TotalTokens   int64     `json:"total_tokens"`
	ModelCost     float64   `json:"model_cost" gorm:"type:decimal(12,4)"`
	APICallCount  int64     `json:"api_call_count"`
	SuccessCount  int64     `json:"success_count"`
	FailureCount  int64     `json:"failure_count"`
	AvgLatencyMs  int       `json:"avg_latency_ms"`
	AlertCount    int       `json:"alert_count"`
}

func (u *UsageStat) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (UsageStat) TableName() string { return "usage_stats" }

// DiskQuota manages per-user disk usage
type DiskQuota struct {
	BaseModel
	UserID            uuid.UUID  `json:"user_id" gorm:"type:char(36);uniqueIndex"`
	QuotaBytes        int64      `json:"quota_bytes"`
	UsedBytes         int64      `json:"used_bytes"`
	AlertThresholdPct int        `json:"alert_threshold_pct" gorm:"default:80"`
	Status            string     `json:"status" gorm:"type:varchar(16);default:normal"`
	LastCalculatedAt  *time.Time `json:"last_calculated_at"`
}

func (DiskQuota) TableName() string { return "disk_quotas" }

// ApprovalRequest is a unified approval for tokens, skills, quotas
type ApprovalRequest struct {
	BaseModel
	RequestType     string     `json:"request_type" gorm:"type:varchar(16)"`
	RequesterType   string     `json:"requester_type" gorm:"type:varchar(16)"`
	RequesterID     uuid.UUID  `json:"requester_id" gorm:"type:char(36)"`
	TargetID        uuid.UUID  `json:"target_id" gorm:"type:char(36)"`
	Title           string     `json:"title" gorm:"type:varchar(256)"`
	Description     string     `json:"description" gorm:"type:text"`
	RequestedConfig string     `json:"requested_config" gorm:"type:text"` // JSON
	Status          string     `json:"status" gorm:"type:varchar(16);default:pending;index"`
	ReviewerID      *uuid.UUID `json:"reviewer_id" gorm:"type:char(36)"`
	ReviewComment   string     `json:"review_comment" gorm:"type:text"`
	ReviewedAt      *time.Time `json:"reviewed_at"`
	ExpiresAt       *time.Time `json:"expires_at"`
}

func (ApprovalRequest) TableName() string { return "approval_requests" }
