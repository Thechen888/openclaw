package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ModelSource represents a callable model API
type ModelSource struct {
	BaseModel
	Provider                string     `json:"provider" gorm:"type:varchar(64)"`
	ModelName               string     `json:"model_name" gorm:"type:varchar(128)"`
	DisplayName             string     `json:"display_name" gorm:"type:varchar(128)"`
	APIEndpoint             string     `json:"api_endpoint" gorm:"type:varchar(512)"`
	APIVersion              string     `json:"api_version" gorm:"type:varchar(32)"`
	AuthType                string     `json:"auth_type" gorm:"type:varchar(32)"`
	AuthCredentialEncrypted string     `json:"-" gorm:"type:text"`
	AuthConfig              string     `json:"auth_config" gorm:"type:text"`  // JSON
	Capabilities            string     `json:"capabilities" gorm:"type:text"` // JSON array
	ContextLength           int        `json:"context_length"`
	InputPricePer1K         float64    `json:"input_price_per_1k" gorm:"type:decimal(10,6)"`
	OutputPricePer1K        float64    `json:"output_price_per_1k" gorm:"type:decimal(10,6)"`
	RateLimitRPM            int        `json:"rate_limit_rpm"`
	RateLimitTPM            int        `json:"rate_limit_tpm"`
	TimeoutMs               int        `json:"timeout_ms" gorm:"default:30000"`
	HealthStatus            string     `json:"health_status" gorm:"type:varchar(16);default:healthy"`
	LastHealthCheck         *time.Time `json:"last_health_check"`
	Status                  string     `json:"status" gorm:"type:varchar(16);default:active;index"`
	Metadata                string     `json:"metadata" gorm:"type:text"` // JSON
}

func (ModelSource) TableName() string { return "model_sources" }

// ModelPolicy defines how to use model sources
type ModelPolicy struct {
	BaseModel
	Name                    string                `json:"name" gorm:"type:varchar(128)"`
	Description             string                `json:"description" gorm:"type:text"`
	TaskType                string                `json:"task_type" gorm:"type:varchar(32);default:general"`
	RotationMethod          string                `json:"rotation_method" gorm:"type:varchar(16);default:weighted_round_robin"`
	TimeoutMs               int                   `json:"timeout_ms" gorm:"default:30000"`
	MaxRetries              int                   `json:"max_retries" gorm:"default:2"`
	CircuitBreakerThreshold int                   `json:"circuit_breaker_threshold" gorm:"default:5"`
	CircuitBreakerTimeoutMs int                   `json:"circuit_breaker_timeout_ms" gorm:"default:60000"`
	FallbackPolicyID        *uuid.UUID            `json:"fallback_policy_id" gorm:"type:char(36)"`
	CostBudgetMonthly       *float64              `json:"cost_budget_monthly" gorm:"type:decimal(12,2)"`
	CostBudgetAlertPct      int                   `json:"cost_budget_alert_pct" gorm:"default:80"`
	LogLevel                string                `json:"log_level" gorm:"type:varchar(16);default:summary"`
	Status                  string                `json:"status" gorm:"type:varchar(16);default:active;index"`
	Upstreams               []ModelPolicyUpstream `json:"upstreams,omitempty" gorm:"foreignKey:PolicyID"`
	Bindings                []ModelPolicyBinding  `json:"bindings,omitempty" gorm:"foreignKey:PolicyID"`
}

func (ModelPolicy) TableName() string { return "model_policies" }

// ModelPolicyUpstream is a weighted model source in a policy pool
type ModelPolicyUpstream struct {
	BaseModel
	PolicyID         uuid.UUID    `json:"policy_id" gorm:"type:char(36);index"`
	ModelSourceID    uuid.UUID    `json:"model_source_id" gorm:"type:char(36)"`
	ModelSource      *ModelSource `json:"model_source,omitempty" gorm:"foreignKey:ModelSourceID"`
	Weight           int          `json:"weight" gorm:"default:1"`
	Priority         int          `json:"priority"`
	IsCanary         bool         `json:"is_canary" gorm:"default:false"`
	CanaryPercentage float64      `json:"canary_percentage" gorm:"type:decimal(5,2)"`
	SortOrder        int          `json:"sort_order"`
}

func (ModelPolicyUpstream) TableName() string { return "model_policy_upstreams" }

// ModelPolicyBinding links a policy to a user/org/agent
type ModelPolicyBinding struct {
	BaseModel
	PolicyID    uuid.UUID `json:"policy_id" gorm:"type:char(36);index"`
	BindingType string    `json:"binding_type" gorm:"type:varchar(16)"`
	BindingID   uuid.UUID `json:"binding_id" gorm:"type:char(36)"`
	IsDefault   bool      `json:"is_default" gorm:"default:false"`
}

func (ModelPolicyBinding) TableName() string { return "model_policy_bindings" }

// ModelCallLog records every model API call
type ModelCallLog struct {
	ID                  uuid.UUID `json:"id" gorm:"type:char(36);primary_key"`
	PolicyID            uuid.UUID `json:"policy_id" gorm:"type:char(36);index"`
	ModelSourceID       uuid.UUID `json:"model_source_id" gorm:"type:char(36);index"`
	CallerType          string    `json:"caller_type" gorm:"type:varchar(16)"`
	CallerID            uuid.UUID `json:"caller_id" gorm:"type:char(36)"`
	PrincipalType       string    `json:"principal_type" gorm:"type:varchar(16)"`
	PrincipalID         uuid.UUID `json:"principal_id" gorm:"type:char(36)"`
	TaskType            string    `json:"task_type" gorm:"type:varchar(32)"`
	RequestModel        string    `json:"request_model" gorm:"type:varchar(128)"`
	ActualModel         string    `json:"actual_model" gorm:"type:varchar(128)"`
	InputTokens         int       `json:"input_tokens"`
	OutputTokens        int       `json:"output_tokens"`
	TotalTokens         int       `json:"total_tokens"`
	Cost                float64   `json:"cost" gorm:"type:decimal(10,6)"`
	LatencyMs           int       `json:"latency_ms"`
	Status              string    `json:"status" gorm:"type:varchar(16)"`
	ErrorMessage        string    `json:"error_message" gorm:"type:text"`
	CircuitBreakerState string    `json:"circuit_breaker_state" gorm:"type:varchar(16)"`
	RetryCount          int       `json:"retry_count"`
	RequestHash         string    `json:"request_hash" gorm:"type:varchar(64)"`
	CreatedAt           time.Time `json:"created_at" gorm:"index"`
}

func (m *ModelCallLog) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}

func (ModelCallLog) TableName() string { return "model_call_logs" }
