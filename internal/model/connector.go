package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Connector represents a third-party system integration
type Connector struct {
	BaseModel
	Name                string     `json:"name" gorm:"type:varchar(128)"`
	SystemType          string     `json:"system_type" gorm:"type:varchar(32)"`
	Provider            string     `json:"provider" gorm:"type:varchar(64)"`
	APIBaseURL          string     `json:"api_base_url" gorm:"type:varchar(512)"`
	AuthType            string     `json:"auth_type" gorm:"type:varchar(32)"`
	AuthConfigEncrypted string     `json:"-" gorm:"type:text"`
	APICatalog          string     `json:"api_catalog" gorm:"type:text"`    // JSON array
	FieldMappings       string     `json:"field_mappings" gorm:"type:text"` // JSON
	EventSourceType     string     `json:"event_source_type" gorm:"type:varchar(16)"`
	WebhookConfig       string     `json:"webhook_config" gorm:"type:text"` // JSON
	PollingConfig       string     `json:"polling_config" gorm:"type:text"` // JSON
	Status              string     `json:"status" gorm:"type:varchar(16);default:active;index"`
	LastSyncAt          *time.Time `json:"last_sync_at"`
}

// ConnectorEvent records events received from connectors
type ConnectorEvent struct {
	ID          uuid.UUID  `json:"id" gorm:"type:char(36);primary_key"`
	ConnectorID uuid.UUID  `json:"connector_id" gorm:"type:char(36);index"`
	EventType   string     `json:"event_type" gorm:"type:varchar(128)"`
	Payload     string     `json:"payload" gorm:"type:text"` // JSON
	Processed   bool       `json:"processed" gorm:"default:false"`
	ProcessedBy *uuid.UUID `json:"processed_by" gorm:"type:char(36)"`
	ReceivedAt  time.Time  `json:"received_at"`
	ProcessedAt *time.Time `json:"processed_at"`
}

func (c *ConnectorEvent) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (ConnectorEvent) TableName() string { return "connector_events" }
