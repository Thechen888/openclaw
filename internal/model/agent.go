package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Agent represents a configurable automation unit
type Agent struct {
	BaseModel
	Name            string           `json:"name" gorm:"type:varchar(128)"`
	Description     string           `json:"description" gorm:"type:text"`
	OwnerType       string           `json:"owner_type" gorm:"type:varchar(16);index"` // user or organization
	OwnerID         uuid.UUID        `json:"owner_id" gorm:"type:char(36);index"`
	Status          string           `json:"status" gorm:"type:varchar(16);default:draft;index"`
	ModelPolicyID   *uuid.UUID       `json:"model_policy_id" gorm:"type:char(36)"`
	TokenOwnerType  string           `json:"token_owner_type" gorm:"type:varchar(16)"`
	TokenOwnerID    *uuid.UUID       `json:"token_owner_id" gorm:"type:char(36)"`
	FailureStrategy string           `json:"failure_strategy" gorm:"type:text"` // JSON
	ConfigVersion   int              `json:"config_version" gorm:"default:1"`
	PublishedAt     *time.Time       `json:"published_at"`
	LastRunAt       *time.Time       `json:"last_run_at"`
	CreatedBy       uuid.UUID        `json:"created_by" gorm:"type:char(36)"`
	Triggers        []AgentTrigger   `json:"triggers,omitempty" gorm:"foreignKey:AgentID"`
	Conditions      []AgentCondition `json:"conditions,omitempty" gorm:"foreignKey:AgentID"`
	Actions         []AgentAction    `json:"actions,omitempty" gorm:"foreignKey:AgentID"`
}

// AgentTrigger defines how an agent is triggered
type AgentTrigger struct {
	BaseModel
	AgentID     uuid.UUID `json:"agent_id" gorm:"type:char(36);index"`
	TriggerType string    `json:"trigger_type" gorm:"type:varchar(32)"`
	Config      string    `json:"config" gorm:"type:text"` // JSON
	IsActive    bool      `json:"is_active" gorm:"default:true"`
}

func (AgentTrigger) TableName() string { return "agent_triggers" }

// AgentCondition defines a condition in the agent pipeline
type AgentCondition struct {
	BaseModel
	AgentID       uuid.UUID `json:"agent_id" gorm:"type:char(36);index"`
	Name          string    `json:"name" gorm:"type:varchar(128)"`
	ConditionType string    `json:"condition_type" gorm:"type:varchar(32)"`
	Expression    string    `json:"expression" gorm:"type:text"`
	Config        string    `json:"config" gorm:"type:text"` // JSON
	SortOrder     int       `json:"sort_order"`
}

func (AgentCondition) TableName() string { return "agent_conditions" }

// AgentAction defines an action in the agent pipeline
type AgentAction struct {
	BaseModel
	AgentID     uuid.UUID  `json:"agent_id" gorm:"type:char(36);index"`
	ActionType  string     `json:"action_type" gorm:"type:varchar(32)"`
	Config      string     `json:"config" gorm:"type:text"` // JSON
	SortOrder   int        `json:"sort_order"`
	ConditionID *uuid.UUID `json:"condition_id" gorm:"type:char(36)"`
	OnFailure   string     `json:"on_failure" gorm:"type:varchar(16);default:stop"`
}

func (AgentAction) TableName() string { return "agent_actions" }

// AgentExecution records a single run of an agent
type AgentExecution struct {
	ID               uuid.UUID           `json:"id" gorm:"type:char(36);primary_key"`
	AgentID          uuid.UUID           `json:"agent_id" gorm:"type:char(36);index"`
	TriggerType      string              `json:"trigger_type" gorm:"type:varchar(32)"`
	TriggerPayload   string              `json:"trigger_payload" gorm:"type:text"` // JSON
	Status           string              `json:"status" gorm:"type:varchar(16);index"`
	StartedAt        time.Time           `json:"started_at"`
	CompletedAt      *time.Time          `json:"completed_at"`
	DurationMs       int                 `json:"duration_ms"`
	TotalModelTokens int                 `json:"total_model_tokens"`
	TotalModelCost   float64             `json:"total_model_cost" gorm:"type:decimal(10,6)"`
	TotalAPICalls    int                 `json:"total_api_calls"`
	ErrorMessage     string              `json:"error_message" gorm:"type:text"`
	CreatedAt        time.Time           `json:"created_at" gorm:"index"`
	Logs             []AgentExecutionLog `json:"logs,omitempty" gorm:"foreignKey:ExecutionID"`
}

func (a *AgentExecution) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (AgentExecution) TableName() string { return "agent_executions" }

// AgentExecutionLog records step-level detail within an execution
type AgentExecutionLog struct {
	ID                uuid.UUID  `json:"id" gorm:"type:char(36);primary_key"`
	ExecutionID       uuid.UUID  `json:"execution_id" gorm:"type:char(36);index"`
	StepOrder         int        `json:"step_order"`
	StepType          string     `json:"step_type" gorm:"type:varchar(32)"`
	StepName          string     `json:"step_name" gorm:"type:varchar(128)"`
	InputSummary      string     `json:"input_summary" gorm:"type:text"`
	OutputSummary     string     `json:"output_summary" gorm:"type:text"`
	Status            string     `json:"status" gorm:"type:varchar(16)"`
	DurationMs        int        `json:"duration_ms"`
	ModelSourceID     *uuid.UUID `json:"model_source_id" gorm:"type:char(36)"`
	ModelInputTokens  int        `json:"model_input_tokens"`
	ModelOutputTokens int        `json:"model_output_tokens"`
	ModelCost         float64    `json:"model_cost" gorm:"type:decimal(10,6)"`
	ConnectorID       *uuid.UUID `json:"connector_id" gorm:"type:char(36)"`
	SkillID           *uuid.UUID `json:"skill_id" gorm:"type:char(36)"`
	TokenID           *uuid.UUID `json:"token_id" gorm:"type:char(36)"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (a *AgentExecutionLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (AgentExecutionLog) TableName() string { return "agent_execution_logs" }
