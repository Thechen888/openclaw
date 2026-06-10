package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"github.com/openclaw/openclaw/internal/repository"
)

var _ = time.Now

// --- Model Source Service ---
type ModelSourceService struct {
	repo *repository.ModelSourceRepository
}

func NewModelSourceService(repo *repository.ModelSourceRepository) *ModelSourceService {
	return &ModelSourceService{repo: repo}
}

func (s *ModelSourceService) List(page, pageSize int, search string) ([]model.ModelSource, int64, error) {
	return s.repo.List(page, pageSize, search)
}
func (s *ModelSourceService) GetByID(id uuid.UUID) (*model.ModelSource, error) {
	return s.repo.GetByID(id)
}
func (s *ModelSourceService) Create(m *model.ModelSource) error { return s.repo.Create(m) }
func (s *ModelSourceService) Update(m *model.ModelSource) error { return s.repo.Update(m) }
func (s *ModelSourceService) Delete(id uuid.UUID) error         { return s.repo.Delete(id) }

// --- Model Policy Service ---
type ModelPolicyService struct {
	repo *repository.ModelPolicyRepository
}

func NewModelPolicyService(repo *repository.ModelPolicyRepository) *ModelPolicyService {
	return &ModelPolicyService{repo: repo}
}

func (s *ModelPolicyService) List(page, pageSize int, search string) ([]model.ModelPolicy, int64, error) {
	return s.repo.List(page, pageSize, search)
}
func (s *ModelPolicyService) GetByID(id uuid.UUID) (*model.ModelPolicy, error) {
	return s.repo.GetByID(id)
}
func (s *ModelPolicyService) Create(p *model.ModelPolicy) error { return s.repo.Create(p) }
func (s *ModelPolicyService) Update(p *model.ModelPolicy) error { return s.repo.Update(p) }
func (s *ModelPolicyService) Delete(id uuid.UUID) error         { return s.repo.Delete(id) }
func (s *ModelPolicyService) AddUpstream(u *model.ModelPolicyUpstream) error {
	return s.repo.AddUpstream(u)
}
func (s *ModelPolicyService) RemoveUpstream(id uuid.UUID) error { return s.repo.RemoveUpstream(id) }
func (s *ModelPolicyService) AddBinding(b *model.ModelPolicyBinding) error {
	return s.repo.AddBinding(b)
}
func (s *ModelPolicyService) RemoveBinding(id uuid.UUID) error { return s.repo.RemoveBinding(id) }

// --- Connector Service ---
type ConnectorService struct {
	repo *repository.ConnectorRepository
}

func NewConnectorService(repo *repository.ConnectorRepository) *ConnectorService {
	return &ConnectorService{repo: repo}
}

func (s *ConnectorService) List(page, pageSize int, systemType, search string) ([]model.Connector, int64, error) {
	return s.repo.List(page, pageSize, systemType, search)
}
func (s *ConnectorService) GetByID(id uuid.UUID) (*model.Connector, error) { return s.repo.GetByID(id) }
func (s *ConnectorService) Create(c *model.Connector) error                { return s.repo.Create(c) }
func (s *ConnectorService) Update(c *model.Connector) error                { return s.repo.Update(c) }
func (s *ConnectorService) Delete(id uuid.UUID) error                      { return s.repo.Delete(id) }

// --- Token Service ---
type TokenService struct{ repo *repository.TokenRepository }

func NewTokenService(repo *repository.TokenRepository) *TokenService {
	return &TokenService{repo: repo}
}

func (s *TokenService) List(page, pageSize int, ownerType string, ownerID *uuid.UUID, status string) ([]model.Token, int64, error) {
	return s.repo.List(page, pageSize, ownerType, ownerID, status)
}
func (s *TokenService) GetByID(id uuid.UUID) (*model.Token, error) { return s.repo.GetByID(id) }
func (s *TokenService) Create(t *model.Token) error                { return s.repo.Create(t) }
func (s *TokenService) Update(t *model.Token) error                { return s.repo.Update(t) }
func (s *TokenService) ListPending() ([]model.Token, error)        { return s.repo.ListPending() }
func (s *TokenService) SetPermissions(tokenID uuid.UUID, perms []model.TokenPermission) error {
	return s.repo.SetPermissions(tokenID, perms)
}
func (s *TokenService) CheckPermission(tokenID, connectorID uuid.UUID, apiPath, action string) (bool, error) {
	return s.repo.CheckPermission(tokenID, connectorID, apiPath, action)
}

// --- SKILL Service ---
type SkillService struct {
	repo    *repository.SkillRepository
	visRepo *repository.SkillVisibilityRepository
}

func NewSkillService(repo *repository.SkillRepository, visRepo *repository.SkillVisibilityRepository) *SkillService {
	return &SkillService{repo: repo, visRepo: visRepo}
}

func (s *SkillService) List(page, pageSize int, skillType, status, search string) ([]model.Skill, int64, error) {
	return s.repo.List(page, pageSize, skillType, status, search)
}
func (s *SkillService) GetByID(id uuid.UUID) (*model.Skill, error) { return s.repo.GetByID(id) }
func (s *SkillService) Create(sk *model.Skill) error               { return s.repo.Create(sk) }
func (s *SkillService) Update(sk *model.Skill) error               { return s.repo.Update(sk) }
func (s *SkillService) Delete(id uuid.UUID) error                  { return s.repo.Delete(id) }
func (s *SkillService) AddVersion(v *model.SkillVersion) error     { return s.repo.AddVersion(v) }
func (s *SkillService) SetVisibility(skillID uuid.UUID, rules []model.SkillVisibility) error {
	return s.visRepo.SetVisibility(skillID, rules)
}
func (s *SkillService) GetVisibility(skillID uuid.UUID) ([]model.SkillVisibility, error) {
	return s.visRepo.GetBySkillID(skillID)
}

// --- Agent Service ---
type AgentService struct {
	repo     *repository.AgentRepository
	execRepo *repository.AgentExecutionRepository
}

func NewAgentService(repo *repository.AgentRepository, execRepo *repository.AgentExecutionRepository) *AgentService {
	return &AgentService{repo: repo, execRepo: execRepo}
}

func (s *AgentService) List(page, pageSize int, ownerType string, ownerID *uuid.UUID, status, search string) ([]model.Agent, int64, error) {
	return s.repo.List(page, pageSize, ownerType, ownerID, status, search)
}
func (s *AgentService) GetByID(id uuid.UUID) (*model.Agent, error) { return s.repo.GetByID(id) }
func (s *AgentService) Create(a *model.Agent) error                { return s.repo.Create(a) }
func (s *AgentService) Update(a *model.Agent) error                { return s.repo.Update(a) }
func (s *AgentService) Delete(id uuid.UUID) error                  { return s.repo.Delete(id) }
func (s *AgentService) AddTrigger(t *model.AgentTrigger) error     { return s.repo.AddTrigger(t) }
func (s *AgentService) UpdateTrigger(t *model.AgentTrigger) error  { return s.repo.UpdateTrigger(t) }
func (s *AgentService) DeleteTrigger(id uuid.UUID) error           { return s.repo.DeleteTrigger(id) }
func (s *AgentService) AddCondition(c *model.AgentCondition) error { return s.repo.AddCondition(c) }
func (s *AgentService) UpdateCondition(c *model.AgentCondition) error {
	return s.repo.UpdateCondition(c)
}
func (s *AgentService) DeleteCondition(id uuid.UUID) error      { return s.repo.DeleteCondition(id) }
func (s *AgentService) AddAction(a *model.AgentAction) error    { return s.repo.AddAction(a) }
func (s *AgentService) UpdateAction(a *model.AgentAction) error { return s.repo.UpdateAction(a) }
func (s *AgentService) DeleteAction(id uuid.UUID) error         { return s.repo.DeleteAction(id) }
func (s *AgentService) ListExecutions(agentID *uuid.UUID, page, pageSize int, status string) ([]model.AgentExecution, int64, error) {
	return s.execRepo.List(agentID, page, pageSize, status)
}
func (s *AgentService) GetExecution(id uuid.UUID) (*model.AgentExecution, error) {
	return s.execRepo.GetByID(id)
}

// --- Account Match Service ---
type AccountMatchService struct {
	chatRepo  *repository.ChatAccountRepository
	tpRepo    *repository.ThirdPartyAccountRepository
	matchRepo *repository.AccountMatchRepository
}

func NewAccountMatchService(chatRepo *repository.ChatAccountRepository, tpRepo *repository.ThirdPartyAccountRepository, matchRepo *repository.AccountMatchRepository) *AccountMatchService {
	return &AccountMatchService{chatRepo: chatRepo, tpRepo: tpRepo, matchRepo: matchRepo}
}

func (s *AccountMatchService) ListChatAccounts(page, pageSize int, chatType, matchStatus, search string) ([]model.ChatAccount, int64, error) {
	return s.chatRepo.List(page, pageSize, chatType, matchStatus, search)
}
func (s *AccountMatchService) ListThirdPartyAccounts(page, pageSize int, systemType, matchStatus, search string) ([]model.ThirdPartyAccount, int64, error) {
	return s.tpRepo.List(page, pageSize, systemType, matchStatus, search)
}
func (s *AccountMatchService) BindChatAccount(accountID, userID uuid.UUID) error {
	return s.chatRepo.BindUser(accountID, userID)
}
func (s *AccountMatchService) BindThirdPartyAccount(accountID, userID uuid.UUID) error {
	return s.tpRepo.BindUser(accountID, userID)
}
func (s *AccountMatchService) ListResults(page, pageSize int, status, sourceType string) ([]model.AccountMatchResult, int64, error) {
	return s.matchRepo.ListResults(page, pageSize, status, sourceType)
}
func (s *AccountMatchService) ListRuns(page, pageSize int) ([]model.AccountMatchRun, int64, error) {
	return s.matchRepo.ListRuns(page, pageSize)
}
func (s *AccountMatchService) ListStrategies() ([]model.AccountMatchStrategy, error) {
	return s.matchRepo.ListStrategies()
}
func (s *AccountMatchService) CreateStrategy(strategy *model.AccountMatchStrategy) error {
	return s.matchRepo.CreateStrategy(strategy)
}

// --- Audit Service ---
type AuditService struct {
	repo *repository.AuditLogRepository
}

func NewAuditService(repo *repository.AuditLogRepository) *AuditService {
	return &AuditService{repo: repo}
}

func (s *AuditService) Log(log *model.AuditLog) error { return s.repo.Create(log) }
func (s *AuditService) List(page, pageSize int, actorType, action, resourceType string, startTime *time.Time) ([]model.AuditLog, int64, error) {
	return s.repo.List(page, pageSize, actorType, action, resourceType, startTime)
}

// --- Stats Service ---
type StatsService struct {
	usageRepo *repository.UsageStatRepository
	callRepo  *repository.ModelCallLogRepository
}

func NewStatsService(usageRepo *repository.UsageStatRepository, callRepo *repository.ModelCallLogRepository) *StatsService {
	return &StatsService{usageRepo: usageRepo, callRepo: callRepo}
}

// --- Approval Service ---
type ApprovalService struct {
	repo *repository.ApprovalRepository
}

func NewApprovalService(repo *repository.ApprovalRepository) *ApprovalService {
	return &ApprovalService{repo: repo}
}

func (s *ApprovalService) List(page, pageSize int, reqType, status string) ([]model.ApprovalRequest, int64, error) {
	return s.repo.List(page, pageSize, reqType, status)
}
func (s *ApprovalService) GetByID(id uuid.UUID) (*model.ApprovalRequest, error) {
	return s.repo.GetByID(id)
}
func (s *ApprovalService) Create(a *model.ApprovalRequest) error { return s.repo.Create(a) }
func (s *ApprovalService) Update(a *model.ApprovalRequest) error { return s.repo.Update(a) }

// --- Quota Service ---
type QuotaService struct {
	repo *repository.DiskQuotaRepository
}

func NewQuotaService(repo *repository.DiskQuotaRepository) *QuotaService {
	return &QuotaService{repo: repo}
}

func (s *QuotaService) GetByUserID(userID uuid.UUID) (*model.DiskQuota, error) {
	return s.repo.GetByUserID(userID)
}
func (s *QuotaService) List(page, pageSize int) ([]model.DiskQuota, int64, error) {
	return s.repo.List(page, pageSize)
}
func (s *QuotaService) Create(q *model.DiskQuota) error { return s.repo.Create(q) }
func (s *QuotaService) Update(q *model.DiskQuota) error { return s.repo.Update(q) }
