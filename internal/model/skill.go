package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Skill represents a reusable capability unit
type Skill struct {
	BaseModel
	Name             string         `json:"name" gorm:"type:varchar(128)"`
	Description      string         `json:"description" gorm:"type:text"`
	SkillType        string         `json:"skill_type" gorm:"type:varchar(16);default:normal"`
	Category         string         `json:"category" gorm:"type:varchar(64)"`
	RiskLevel        string         `json:"risk_level" gorm:"type:varchar(16);default:low"`
	OwnerID          uuid.UUID      `json:"owner_id" gorm:"type:char(36);index"`
	CurrentVersionID *uuid.UUID     `json:"current_version_id" gorm:"type:char(36)"`
	Status           string         `json:"status" gorm:"type:varchar(16);default:draft;index"`
	InputSchema      string         `json:"input_schema" gorm:"type:text"` // JSON Schema
	OutputSchema     string         `json:"output_schema" gorm:"type:text"`
	Dependencies     string         `json:"dependencies" gorm:"type:text"` // JSON
	RequiresToken    bool           `json:"requires_token" gorm:"default:false"`
	StarlarkCode     string         `json:"starlark_code,omitempty" gorm:"type:text"`
	Metadata         string         `json:"metadata" gorm:"type:text"` // JSON
	Versions         []SkillVersion `json:"versions,omitempty" gorm:"foreignKey:SkillID"`
}

// SkillVersion is an immutable snapshot of a skill
type SkillVersion struct {
	BaseModel
	SkillID      uuid.UUID `json:"skill_id" gorm:"type:char(36);index"`
	Version      string    `json:"version" gorm:"type:varchar(32)"`
	StarlarkCode string    `json:"starlark_code" gorm:"type:text"`
	InputSchema  string    `json:"input_schema" gorm:"type:text"`
	OutputSchema string    `json:"output_schema" gorm:"type:text"`
	Changelog    string    `json:"changelog" gorm:"type:text"`
	PublishedBy  uuid.UUID `json:"published_by" gorm:"type:char(36)"`
	PublishedAt  time.Time `json:"published_at"`
}

func (SkillVersion) TableName() string { return "skill_versions" }

// SkillVisibility defines who can see/use a skill
type SkillVisibility struct {
	BaseModel
	SkillID    uuid.UUID  `json:"skill_id" gorm:"type:char(36);index"`
	TargetType string     `json:"target_type" gorm:"type:varchar(16)"` // user, organization, role, all
	TargetID   *uuid.UUID `json:"target_id" gorm:"type:char(36)"`
}

func (SkillVisibility) TableName() string { return "skill_visibilities" }

// SkillMarketplaceListing represents a skill in the marketplace
type SkillMarketplaceListing struct {
	BaseModel
	SkillID       uuid.UUID  `json:"skill_id" gorm:"type:char(36);uniqueIndex"`
	Visibility    string     `json:"visibility" gorm:"type:varchar(16)"`
	Category      string     `json:"category" gorm:"type:varchar(64)"`
	Tags          string     `json:"tags" gorm:"type:text"` // JSON array
	InstallCount  int        `json:"install_count" gorm:"default:0"`
	FavoriteCount int        `json:"favorite_count" gorm:"default:0"`
	RatingAvg     float64    `json:"rating_avg" gorm:"type:decimal(3,2)"`
	ListedAt      time.Time  `json:"listed_at"`
	UnlistedAt    *time.Time `json:"unlisted_at"`
}

func (SkillMarketplaceListing) TableName() string { return "skill_marketplace_listings" }

// SkillInstallation records when a user/org installs a skill
type SkillInstallation struct {
	ID              uuid.UUID `json:"id" gorm:"type:char(36);primary_key"`
	SkillID         uuid.UUID `json:"skill_id" gorm:"type:char(36);index"`
	InstalledByType string    `json:"installed_by_type" gorm:"type:varchar(16)"`
	InstalledByID   uuid.UUID `json:"installed_by_id" gorm:"type:char(36)"`
	InstalledAt     time.Time `json:"installed_at"`
}

func (s *SkillInstallation) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (SkillInstallation) TableName() string { return "skill_installations" }

// SkillFavorite records user favorites
type SkillFavorite struct {
	UserID    uuid.UUID `json:"user_id" gorm:"type:char(36);primary_key"`
	SkillID   uuid.UUID `json:"skill_id" gorm:"type:char(36);primary_key"`
	CreatedAt time.Time `json:"created_at"`
}

func (SkillFavorite) TableName() string { return "skill_favorites" }
