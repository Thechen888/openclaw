package repository

import (
	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"gorm.io/gorm"
)

// Database provides the GORM connection
type Database struct {
	DB     *gorm.DB
	Driver string
}

func NewDatabase(driver, dsn string, maxOpen, maxIdle int, autoMigrate bool) (*Database, error) {
	var db *gorm.DB
	var err error

	switch driver {
	case "postgres":
		db, err = openPostgres(dsn)
	default:
		db, err = openSQLite(dsn)
	}
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(maxIdle)

	if autoMigrate {
		if err := db.AutoMigrate(model.AllModels()...); err != nil {
			return nil, err
		}
	}

	return &Database{DB: db, Driver: driver}, nil
}

// --- User Repository ---
type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(u *model.User) error { return r.db.Create(u).Error }
func (r *UserRepository) GetByID(id uuid.UUID) (*model.User, error) {
	var u model.User
	err := r.db.Where("id = ?", id).First(&u).Error
	return &u, err
}
func (r *UserRepository) GetByUsername(username string) (*model.User, error) {
	var u model.User
	err := r.db.Where("username = ?", username).First(&u).Error
	return &u, err
}
func (r *UserRepository) List(page, pageSize int, search string) ([]model.User, int64, error) {
	var users []model.User
	var total int64
	q := r.db.Model(&model.User{})
	if search != "" {
		q = q.Where("name LIKE ? OR primary_email LIKE ? OR username LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&users).Error
	return users, total, err
}
func (r *UserRepository) Update(u *model.User) error { return r.db.Save(u).Error }
func (r *UserRepository) Delete(id uuid.UUID) error  { return r.db.Delete(&model.User{}, "id = ?", id).Error }
func (r *UserRepository) Count() (int64, error) {
	var c int64
	err := r.db.Model(&model.User{}).Count(&c).Error
	return c, err
}

// --- Admin Repository ---
type AdminRepository struct{ db *gorm.DB }

func NewAdminRepository(db *gorm.DB) *AdminRepository { return &AdminRepository{db: db} }

func (r *AdminRepository) Create(a *model.AdminAccount) error { return r.db.Create(a).Error }
func (r *AdminRepository) GetByUsername(username string) (*model.AdminAccount, error) {
	var a model.AdminAccount
	err := r.db.Where("username = ?", username).First(&a).Error
	return &a, err
}
func (r *AdminRepository) GetByID(id uuid.UUID) (*model.AdminAccount, error) {
	var a model.AdminAccount
	err := r.db.Where("id = ?", id).First(&a).Error
	return &a, err
}
func (r *AdminRepository) Update(a *model.AdminAccount) error { return r.db.Save(a).Error }

// --- Organization Repository ---
type OrganizationRepository struct{ db *gorm.DB }

func NewOrganizationRepository(db *gorm.DB) *OrganizationRepository {
	return &OrganizationRepository{db: db}
}

func (r *OrganizationRepository) Create(o *model.Organization) error { return r.db.Create(o).Error }
func (r *OrganizationRepository) GetByID(id uuid.UUID) (*model.Organization, error) {
	var o model.Organization
	err := r.db.Preload("Members").Preload("Children").Where("id = ?", id).First(&o).Error
	return &o, err
}
func (r *OrganizationRepository) List(page, pageSize int, search string) ([]model.Organization, int64, error) {
	var orgs []model.Organization
	var total int64
	q := r.db.Model(&model.Organization{})
	if search != "" {
		q = q.Where("name LIKE ?", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&orgs).Error
	return orgs, total, err
}
func (r *OrganizationRepository) Update(o *model.Organization) error { return r.db.Save(o).Error }
func (r *OrganizationRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Organization{}, "id = ?", id).Error
}
func (r *OrganizationRepository) AddMember(m *model.OrganizationMember) error {
	return r.db.Create(m).Error
}
func (r *OrganizationRepository) RemoveMember(orgID, userID uuid.UUID) error {
	return r.db.Where("organization_id = ? AND user_id = ?", orgID, userID).Delete(&model.OrganizationMember{}).Error
}
func (r *OrganizationRepository) ListMembers(orgID uuid.UUID) ([]model.OrganizationMember, error) {
	var members []model.OrganizationMember
	err := r.db.Preload("User").Where("organization_id = ?", orgID).Find(&members).Error
	return members, err
}

// --- Chat Account Repository ---
type ChatAccountRepository struct{ db *gorm.DB }

func NewChatAccountRepository(db *gorm.DB) *ChatAccountRepository {
	return &ChatAccountRepository{db: db}
}

func (r *ChatAccountRepository) Create(a *model.ChatAccount) error { return r.db.Create(a).Error }
func (r *ChatAccountRepository) GetByID(id uuid.UUID) (*model.ChatAccount, error) {
	var a model.ChatAccount
	err := r.db.Preload("User").Where("id = ?", id).First(&a).Error
	return &a, err
}
func (r *ChatAccountRepository) List(page, pageSize int, chatType, matchStatus, search string) ([]model.ChatAccount, int64, error) {
	var accounts []model.ChatAccount
	var total int64
	q := r.db.Model(&model.ChatAccount{})
	if chatType != "" { q = q.Where("chat_type = ?", chatType) }
	if matchStatus != "" { q = q.Where("match_status = ?", matchStatus) }
	if search != "" {
		q = q.Where("nickname LIKE ? OR email LIKE ? OR phone LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Preload("User").Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&accounts).Error
	return accounts, total, err
}
func (r *ChatAccountRepository) Update(a *model.ChatAccount) error { return r.db.Save(a).Error }
func (r *ChatAccountRepository) Upsert(a *model.ChatAccount) error {
	return r.db.Where("chat_type = ? AND external_id = ?", a.ChatType, a.ExternalID).
		Assign(model.ChatAccount{Nickname: a.Nickname, Phone: a.Phone, Email: a.Email, RawData: a.RawData}).
		FirstOrCreate(a).Error
}
func (r *ChatAccountRepository) BindUser(accountID, userID uuid.UUID) error {
	return r.db.Model(&model.ChatAccount{}).Where("id = ?", accountID).
		Updates(map[string]interface{}{"user_id": userID, "match_status": model.MatchStatusOverridden}).Error
}

// --- Third Party Account Repository ---
type ThirdPartyAccountRepository struct{ db *gorm.DB }

func NewThirdPartyAccountRepository(db *gorm.DB) *ThirdPartyAccountRepository {
	return &ThirdPartyAccountRepository{db: db}
}

func (r *ThirdPartyAccountRepository) Create(a *model.ThirdPartyAccount) error { return r.db.Create(a).Error }
func (r *ThirdPartyAccountRepository) GetByID(id uuid.UUID) (*model.ThirdPartyAccount, error) {
	var a model.ThirdPartyAccount
	err := r.db.Preload("User").Where("id = ?", id).First(&a).Error
	return &a, err
}
func (r *ThirdPartyAccountRepository) List(page, pageSize int, systemType, matchStatus, search string) ([]model.ThirdPartyAccount, int64, error) {
	var accounts []model.ThirdPartyAccount
	var total int64
	q := r.db.Model(&model.ThirdPartyAccount{})
	if systemType != "" { q = q.Where("system_type = ?", systemType) }
	if matchStatus != "" { q = q.Where("match_status = ?", matchStatus) }
	if search != "" {
		q = q.Where("name LIKE ? OR email LIKE ? OR login_name LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Preload("User").Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&accounts).Error
	return accounts, total, err
}
func (r *ThirdPartyAccountRepository) Update(a *model.ThirdPartyAccount) error { return r.db.Save(a).Error }
func (r *ThirdPartyAccountRepository) Upsert(a *model.ThirdPartyAccount) error {
	return r.db.Where("system_type = ? AND connector_id = ? AND external_id = ?", a.SystemType, a.ConnectorID, a.ExternalID).
		Assign(model.ThirdPartyAccount{Name: a.Name, Email: a.Email, Phone: a.Phone, Department: a.Department, RawData: a.RawData}).
		FirstOrCreate(a).Error
}
func (r *ThirdPartyAccountRepository) BindUser(accountID, userID uuid.UUID) error {
	return r.db.Model(&model.ThirdPartyAccount{}).Where("id = ?", accountID).
		Updates(map[string]interface{}{"user_id": userID, "match_status": model.MatchStatusOverridden}).Error
}
