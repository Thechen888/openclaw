package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Token represents a managed credential
type Token struct {
	BaseModel
	Name                string            `json:"name" gorm:"type:varchar(128)"`
	OwnerType           string            `json:"owner_type" gorm:"type:varchar(16);index"`
	OwnerID             uuid.UUID         `json:"owner_id" gorm:"type:char(36);index"`
	TargetSystem        string            `json:"target_system" gorm:"type:varchar(32)"`
	CredentialType      string            `json:"credential_type" gorm:"type:varchar(32)"`
	CredentialEncrypted string            `json:"-" gorm:"type:text"`
	Status              string            `json:"status" gorm:"type:varchar(16);default:pending;index"`
	RiskLevel           string            `json:"risk_level" gorm:"type:varchar(16);default:low"`
	QuotaLimit          *int64            `json:"quota_limit"`
	QuotaUsed           int64             `json:"quota_used" gorm:"default:0"`
	QuotaResetAt        *time.Time        `json:"quota_reset_at"`
	ExpiresAt           *time.Time        `json:"expires_at"`
	ApprovedBy          *uuid.UUID        `json:"approved_by" gorm:"type:char(36)"`
	ApprovedAt          *time.Time        `json:"approved_at"`
	RevokedBy           *uuid.UUID        `json:"revoked_by" gorm:"type:char(36)"`
	RevokedAt           *time.Time        `json:"revoked_at"`
	LastUsedAt          *time.Time        `json:"last_used_at"`
	Permissions         []TokenPermission `json:"permissions,omitempty" gorm:"foreignKey:TokenID"`
}

// TokenPermission defines fine-grained access control per token
type TokenPermission struct {
	BaseModel
	TokenID        uuid.UUID  `json:"token_id" gorm:"type:char(36);index"`
	ConnectorID    uuid.UUID  `json:"connector_id" gorm:"type:char(36)"`
	AccountID      *uuid.UUID `json:"account_id" gorm:"type:char(36)"`
	AllowedAPIs    string     `json:"allowed_apis" gorm:"type:text"`
	AllowedActions string     `json:"allowed_actions" gorm:"type:text"`
	DataScope      string     `json:"data_scope" gorm:"type:text"`
	IsActive       bool       `json:"is_active" gorm:"default:true"`
}

func (TokenPermission) TableName() string { return "token_permissions" }

// TokenUsageLog records every call through a token
type TokenUsageLog struct {
	ID             uuid.UUID `json:"id" gorm:"type:char(36);primary_key"`
	TokenID        uuid.UUID `json:"token_id" gorm:"type:char(36);index"`
	ConnectorID    uuid.UUID `json:"connector_id" gorm:"type:char(36)"`
	APIPath        string    `json:"api_path" gorm:"type:varchar(512)"`
	Action         string    `json:"action" gorm:"type:varchar(32)"`
	PrincipalType  string    `json:"principal_type" gorm:"type:varchar(16)"`
	PrincipalID    uuid.UUID `json:"principal_id" gorm:"type:char(36)"`
	RequestSummary string    `json:"request_summary" gorm:"type:text"`
	ResponseStatus int       `json:"response_status"`
	Success        bool      `json:"success"`
	DurationMs     int       `json:"duration_ms"`
	CreatedAt      time.Time `json:"created_at" gorm:"index"`
}

func (t *TokenUsageLog) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (TokenUsageLog) TableName() string { return "token_usage_logs" }
