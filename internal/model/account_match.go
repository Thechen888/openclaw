package model

import (
	"time"

	"github.com/google/uuid"
)

// AccountMatchResult stores persistent matching results
type AccountMatchResult struct {
	BaseModel
	SourceType        string     `json:"source_type" gorm:"type:varchar(16)"` // chat or third_party
	SourceAccountID   uuid.UUID  `json:"source_account_id" gorm:"type:char(36);index"`
	UserID            *uuid.UUID `json:"user_id" gorm:"type:char(36);index"`
	User              *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Status            string     `json:"status" gorm:"type:varchar(16);index"`
	Score             float64    `json:"score" gorm:"type:decimal(5,4)"`
	Evidence          string     `json:"evidence" gorm:"type:text"` // JSON
	StrategyVersion   string     `json:"strategy_version" gorm:"type:varchar(32)"`
	RunID             *uuid.UUID `json:"run_id" gorm:"type:char(36)"`
	OverriddenBy      *uuid.UUID `json:"overridden_by" gorm:"type:char(36)"`
	OverrideReason    string     `json:"override_reason" gorm:"type:text"`
	OverrideAt        *time.Time `json:"override_at"`
	ProtectedFromAuto bool       `json:"protected_from_auto" gorm:"default:false"`
}

func (AccountMatchResult) TableName() string { return "account_match_results" }

// AccountMatchRun records each matching batch execution
type AccountMatchRun struct {
	BaseModel
	TriggerType      string     `json:"trigger_type" gorm:"type:varchar(16)"`
	TotalAccounts    int        `json:"total_accounts"`
	AutoMatched      int        `json:"auto_matched"`
	PendingReview    int        `json:"pending_review"`
	Conflicts        int        `json:"conflicts"`
	Unmatched        int        `json:"unmatched"`
	Errors           int        `json:"errors"`
	DurationMs       int        `json:"duration_ms"`
	StrategySnapshot string     `json:"strategy_snapshot" gorm:"type:text"` // JSON
	StartedAt        time.Time  `json:"started_at"`
	CompletedAt      *time.Time `json:"completed_at"`
}

func (AccountMatchRun) TableName() string { return "account_match_runs" }

// AccountMatchStrategy defines matching rules per source system
type AccountMatchStrategy struct {
	BaseModel
	Name             string  `json:"name" gorm:"type:varchar(128)"`
	SourceType       string  `json:"source_type" gorm:"type:varchar(16)"`
	SourceSystem     string  `json:"source_system" gorm:"type:varchar(32)"`
	FieldConfigs     string  `json:"field_configs" gorm:"type:text"` // JSON array
	AutoThreshold    float64 `json:"auto_threshold" gorm:"type:decimal(5,4);default:0.9000"`
	PendingThreshold float64 `json:"pending_threshold" gorm:"type:decimal(5,4);default:0.7000"`
	IsActive         bool    `json:"is_active" gorm:"default:true"`
}

func (AccountMatchStrategy) TableName() string { return "account_match_strategies" }
