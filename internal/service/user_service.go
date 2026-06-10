package service

import (
	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"github.com/openclaw/openclaw/internal/repository"
)

type UserService struct {
	repo    *repository.UserRepository
	orgRepo *repository.OrganizationRepository
}

func NewUserService(repo *repository.UserRepository, orgRepo *repository.OrganizationRepository) *UserService {
	return &UserService{repo: repo, orgRepo: orgRepo}
}

func (s *UserService) List(page, pageSize int, search string) ([]model.User, int64, error) {
	return s.repo.List(page, pageSize, search)
}

func (s *UserService) GetByID(id uuid.UUID) (*model.User, error) { return s.repo.GetByID(id) }

func (s *UserService) Create(u *model.User) error { return s.repo.Create(u) }

func (s *UserService) Update(u *model.User) error { return s.repo.Update(u) }

func (s *UserService) Delete(id uuid.UUID) error { return s.repo.Delete(id) }

type OrganizationService struct {
	repo *repository.OrganizationRepository
}

func NewOrganizationService(repo *repository.OrganizationRepository) *OrganizationService {
	return &OrganizationService{repo: repo}
}

func (s *OrganizationService) List(page, pageSize int, search string) ([]model.Organization, int64, error) {
	return s.repo.List(page, pageSize, search)
}

func (s *OrganizationService) GetByID(id uuid.UUID) (*model.Organization, error) {
	return s.repo.GetByID(id)
}

func (s *OrganizationService) Create(o *model.Organization) error { return s.repo.Create(o) }

func (s *OrganizationService) Update(o *model.Organization) error { return s.repo.Update(o) }

func (s *OrganizationService) Delete(id uuid.UUID) error { return s.repo.Delete(id) }

func (s *OrganizationService) AddMember(orgID, userID uuid.UUID, role string) error {
	return s.repo.AddMember(&model.OrganizationMember{
		BaseModel:      model.BaseModel{ID: uuid.New()},
		OrganizationID: orgID,
		UserID:         userID,
		Role:           role,
	})
}

func (s *OrganizationService) RemoveMember(orgID, userID uuid.UUID) error {
	return s.repo.RemoveMember(orgID, userID)
}

func (s *OrganizationService) ListMembers(orgID uuid.UUID) ([]model.OrganizationMember, error) {
	return s.repo.ListMembers(orgID)
}
