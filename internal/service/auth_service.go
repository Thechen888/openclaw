package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/config"
	"github.com/openclaw/openclaw/internal/model"
	"github.com/openclaw/openclaw/internal/pkg/auth"
	"github.com/openclaw/openclaw/internal/repository"
	"gorm.io/gorm"
)

type AuthService struct {
	userRepo  *repository.UserRepository
	adminRepo *repository.AdminRepository
	cfg       *config.AuthConfig
}

func NewAuthService(userRepo *repository.UserRepository, adminRepo *repository.AdminRepository, cfg *config.AuthConfig) *AuthService {
	return &AuthService{userRepo: userRepo, adminRepo: adminRepo, cfg: cfg}
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         interface{} `json:"user"`
}

func (s *AuthService) UserLogin(req LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		return nil, gorm.ErrRecordNotFound
	}
	now := time.Now()
	user.LastLoginAt = &now
	s.userRepo.Update(user)

	accessToken, refreshToken, err := auth.GenerateTokens(user.ID, user.Username, user.Role, s.cfg.UserJWTSecret, s.cfg.AccessTokenTTL, s.cfg.RefreshTokenTTL)
	if err != nil {
		return nil, err
	}
	return &LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken, User: user}, nil
}

func (s *AuthService) AdminLogin(req LoginRequest) (*LoginResponse, error) {
	admin, err := s.adminRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if !auth.CheckPassword(req.Password, admin.PasswordHash) {
		return nil, gorm.ErrRecordNotFound
	}
	now := time.Now()
	admin.LastLoginAt = &now
	s.adminRepo.Update(admin)

	accessToken, refreshToken, err := auth.GenerateTokens(admin.ID, admin.Username, admin.Role, s.cfg.AdminJWTSecret, s.cfg.AccessTokenTTL, s.cfg.RefreshTokenTTL)
	if err != nil {
		return nil, err
	}
	return &LoginResponse{AccessToken: accessToken, RefreshToken: refreshToken, User: admin}, nil
}

func (s *AuthService) CreateUser(username, password, name, email, role string) (*model.User, error) {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}
	user := &model.User{
		Username:     username,
		PasswordHash: hash,
		Name:         name,
		PrimaryEmail: email,
		Role:         role,
		Status:       model.UserStatusActive,
	}
	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AuthService) CreateAdmin(username, password, name, role string) (*model.AdminAccount, error) {
	hash, err := auth.HashPassword(password)
	if err != nil {
		return nil, err
	}
	admin := &model.AdminAccount{
		BaseModel:    model.BaseModel{ID: uuid.New()},
		Username:     username,
		PasswordHash: hash,
		Name:         name,
		Role:         role,
		Status:       model.UserStatusActive,
	}
	if err := s.adminRepo.Create(admin); err != nil {
		return nil, err
	}
	return admin, nil
}

func (s *AuthService) SeedAdmin() error {
	_, err := s.adminRepo.GetByUsername("admin")
	if err == nil {
		return nil // already exists
	}
	_, err = s.CreateAdmin("admin", "admin123", "Platform Admin", model.AdminRoleSuper)
	return err
}
