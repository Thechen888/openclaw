package model

import (
	"time"

	"github.com/google/uuid"
)

// ChatAccount represents a user's identity in a chat platform
type ChatAccount struct {
	BaseModel
	ChatType        string     `json:"chat_type" gorm:"type:varchar(32);uniqueIndex:idx_chat_ext"`
	ExternalID      string     `json:"external_id" gorm:"type:varchar(256);uniqueIndex:idx_chat_ext"`
	Nickname        string     `json:"nickname" gorm:"type:varchar(128)"`
	Phone           string     `json:"phone" gorm:"type:varchar(32);index"`
	Email           string     `json:"email" gorm:"type:varchar(256);index"`
	ChatOrgID       string     `json:"chat_org_id" gorm:"type:varchar(256)"`
	UserID          *uuid.UUID `json:"user_id" gorm:"type:char(36);index"`
	User            *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	MatchStatus     string     `json:"match_status" gorm:"type:varchar(16);default:unmatched;index"`
	MatchScore      float64    `json:"match_score" gorm:"type:decimal(5,4)"`
	MatchEvidence   string     `json:"match_evidence" gorm:"type:text"` // JSON
	MatchOverrideID *uuid.UUID `json:"match_override_id" gorm:"type:char(36)"`
	AvatarURL       string     `json:"avatar_url" gorm:"type:varchar(512)"`
	RawData         string     `json:"raw_data" gorm:"type:text"` // JSON
	SyncedAt        *time.Time `json:"synced_at"`
}

func (ChatAccount) TableName() string { return "chat_accounts" }

// ThirdPartyAccount represents a user's identity in an external system
type ThirdPartyAccount struct {
	BaseModel
	SystemType      string     `json:"system_type" gorm:"type:varchar(32);uniqueIndex:idx_tp_ext"`
	ConnectorID     uuid.UUID  `json:"connector_id" gorm:"type:char(36);uniqueIndex:idx_tp_ext"`
	ExternalID      string     `json:"external_id" gorm:"type:varchar(256);uniqueIndex:idx_tp_ext"`
	LoginName       string     `json:"login_name" gorm:"type:varchar(128)"`
	Name            string     `json:"name" gorm:"type:varchar(128)"`
	Email           string     `json:"email" gorm:"type:varchar(256);index"`
	Phone           string     `json:"phone" gorm:"type:varchar(32);index"`
	Department      string     `json:"department" gorm:"type:varchar(256)"`
	UserID          *uuid.UUID `json:"user_id" gorm:"type:char(36);index"`
	User            *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	MatchStatus     string     `json:"match_status" gorm:"type:varchar(16);default:unmatched;index"`
	MatchScore      float64    `json:"match_score" gorm:"type:decimal(5,4)"`
	MatchEvidence   string     `json:"match_evidence" gorm:"type:text"` // JSON
	MatchOverrideID *uuid.UUID `json:"match_override_id" gorm:"type:char(36)"`
	RawData         string     `json:"raw_data" gorm:"type:text"` // JSON
	SyncedAt        *time.Time `json:"synced_at"`
}

func (ThirdPartyAccount) TableName() string { return "third_party_accounts" }
