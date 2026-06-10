package model

import "github.com/google/uuid"

// Organization represents a department, team, project group, etc.
type Organization struct {
	BaseModel
	Name        string               `json:"name" gorm:"type:varchar(128)"`
	ParentID    *uuid.UUID           `json:"parent_id" gorm:"type:char(36);index"`
	Parent      *Organization        `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	OrgType     string               `json:"org_type" gorm:"type:varchar(32);default:department"`
	Description string               `json:"description" gorm:"type:text"`
	Status      string               `json:"status" gorm:"type:varchar(16);default:active"`
	ExternalID  string               `json:"external_id" gorm:"type:varchar(256);index"`
	Metadata    string               `json:"metadata" gorm:"type:text"` // JSON
	Members     []OrganizationMember `json:"members,omitempty" gorm:"foreignKey:OrganizationID"`
	Children    []Organization       `json:"children,omitempty" gorm:"foreignKey:ParentID"`
}

// OrganizationMember is the junction table between users and organizations
type OrganizationMember struct {
	BaseModel
	OrganizationID uuid.UUID `json:"organization_id" gorm:"type:char(36);uniqueIndex:idx_org_user"`
	UserID         uuid.UUID `json:"user_id" gorm:"type:char(36);uniqueIndex:idx_org_user"`
	User           *User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Role           string    `json:"role" gorm:"type:varchar(32);default:member"`
	IsPrimary      bool      `json:"is_primary" gorm:"default:false"`
}

func (OrganizationMember) TableName() string { return "organization_members" }
