package model

import "time"

// User represents an enterprise internal user
type User struct {
	BaseModel
	Username     string     `json:"username" gorm:"type:varchar(64);uniqueIndex"`
	PasswordHash string     `json:"-" gorm:"type:varchar(256)"`
	Name         string     `json:"name" gorm:"type:varchar(128)"`
	PrimaryEmail string     `json:"primary_email" gorm:"type:varchar(256);index"`
	Emails       string     `json:"emails" gorm:"type:text"` // JSON array
	Phones       string     `json:"phones" gorm:"type:text"` // JSON array
	Role         string     `json:"role" gorm:"type:varchar(32);default:member"`
	Status       string     `json:"status" gorm:"type:varchar(16);default:active;index"`
	AvatarURL    string     `json:"avatar_url" gorm:"type:varchar(512)"`
	ExternalID   string     `json:"external_id" gorm:"type:varchar(256);index"`
	LastLoginAt  *time.Time `json:"last_login_at"`
}

// AdminAccount represents a platform admin (separate from users)
type AdminAccount struct {
	BaseModel
	Username     string     `json:"username" gorm:"type:varchar(64);uniqueIndex"`
	PasswordHash string     `json:"-" gorm:"type:varchar(256)"`
	Name         string     `json:"name" gorm:"type:varchar(128)"`
	Role         string     `json:"role" gorm:"type:varchar(32);default:platform_admin"`
	Status       string     `json:"status" gorm:"type:varchar(16);default:active"`
	LastLoginAt  *time.Time `json:"last_login_at"`
}

func (AdminAccount) TableName() string { return "admin_accounts" }
