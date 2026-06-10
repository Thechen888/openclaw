package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"github.com/openclaw/openclaw/internal/pkg/pagination"
	"github.com/openclaw/openclaw/internal/pkg/response"
)

// --- Model Source Handlers ---
func (h *Handler) ListModelSources(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.ModelSource.List(p.Page, p.PageSize, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetModelSource(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.ModelSource.GetByID(id)
	if err != nil {
		response.Error(w, 404, "model source not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateModelSource(w http.ResponseWriter, r *http.Request) {
	var m model.ModelSource
	if err := decodeJSON(r, &m); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	m.ID = uuid.New()
	if err := h.ModelSource.Create(&m); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, m)
}

func (h *Handler) UpdateModelSource(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.ModelSource.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["display_name"].(string); ok {
		item.DisplayName = v
	}
	if v, ok := body["api_endpoint"].(string); ok {
		item.APIEndpoint = v
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if v, ok := body["health_status"].(string); ok {
		item.HealthStatus = v
	}
	if err := h.ModelSource.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

func (h *Handler) DeleteModelSource(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	if err := h.ModelSource.Delete(id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

// --- Model Policy Handlers ---
func (h *Handler) ListModelPolicies(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.ModelPolicy.List(p.Page, p.PageSize, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetModelPolicy(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.ModelPolicy.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateModelPolicy(w http.ResponseWriter, r *http.Request) {
	var p model.ModelPolicy
	if err := decodeJSON(r, &p); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	p.ID = uuid.New()
	if err := h.ModelPolicy.Create(&p); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, p)
}

func (h *Handler) UpdateModelPolicy(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.ModelPolicy.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["name"].(string); ok {
		item.Name = v
	}
	if v, ok := body["description"].(string); ok {
		item.Description = v
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if err := h.ModelPolicy.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

func (h *Handler) DeleteModelPolicy(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	if err := h.ModelPolicy.Delete(id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

// --- Connector Handlers ---
func (h *Handler) ListConnectors(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	systemType := r.URL.Query().Get("system_type")
	items, total, err := h.Connector.List(p.Page, p.PageSize, systemType, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetConnector(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Connector.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateConnector(w http.ResponseWriter, r *http.Request) {
	var c model.Connector
	if err := decodeJSON(r, &c); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	c.ID = uuid.New()
	if err := h.Connector.Create(&c); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, c)
}

func (h *Handler) UpdateConnector(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Connector.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["name"].(string); ok {
		item.Name = v
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if err := h.Connector.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

func (h *Handler) DeleteConnector(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	if err := h.Connector.Delete(id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

// --- Token Handlers ---
func (h *Handler) ListTokens(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	ownerType := r.URL.Query().Get("owner_type")
	status := r.URL.Query().Get("status")
	var ownerID *uuid.UUID
	if oid := r.URL.Query().Get("owner_id"); oid != "" {
		id, _ := uuid.Parse(oid)
		ownerID = &id
	}
	items, total, err := h.Token.List(p.Page, p.PageSize, ownerType, ownerID, status)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetToken(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Token.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateToken(w http.ResponseWriter, r *http.Request) {
	var t model.Token
	if err := decodeJSON(r, &t); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	t.ID = uuid.New()
	if err := h.Token.Create(&t); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, t)
}

func (h *Handler) UpdateToken(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Token.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if v, ok := body["name"].(string); ok {
		item.Name = v
	}
	if err := h.Token.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

// --- SKILL Handlers ---
func (h *Handler) ListSkills(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	skillType := r.URL.Query().Get("skill_type")
	status := r.URL.Query().Get("status")
	items, total, err := h.Skill.List(p.Page, p.PageSize, skillType, status, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetSkill(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Skill.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateSkill(w http.ResponseWriter, r *http.Request) {
	var s model.Skill
	if err := decodeJSON(r, &s); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	s.ID = uuid.New()
	if err := h.Skill.Create(&s); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, s)
}

func (h *Handler) UpdateSkill(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Skill.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["name"].(string); ok {
		item.Name = v
	}
	if v, ok := body["description"].(string); ok {
		item.Description = v
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if err := h.Skill.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

func (h *Handler) DeleteSkill(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	if err := h.Skill.Delete(id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

// --- Agent Handlers ---
func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	ownerType := r.URL.Query().Get("owner_type")
	status := r.URL.Query().Get("status")
	var ownerID *uuid.UUID
	if oid := r.URL.Query().Get("owner_id"); oid != "" {
		id, _ := uuid.Parse(oid)
		ownerID = &id
	}
	items, total, err := h.Agent.List(p.Page, p.PageSize, ownerType, ownerID, status, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Agent.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	var a model.Agent
	if err := decodeJSON(r, &a); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	a.ID = uuid.New()
	if err := h.Agent.Create(&a); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, a)
}

func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Agent.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body map[string]interface{}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if v, ok := body["name"].(string); ok {
		item.Name = v
	}
	if v, ok := body["description"].(string); ok {
		item.Description = v
	}
	if v, ok := body["status"].(string); ok {
		item.Status = v
	}
	if err := h.Agent.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

func (h *Handler) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	if err := h.Agent.Delete(id); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

func (h *Handler) ListAgentExecutions(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	p := pagination.ParseParams(r)
	status := r.URL.Query().Get("status")
	items, total, err := h.Agent.ListExecutions(&id, p.Page, p.PageSize, status)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetAgentExecution(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "execId"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Agent.GetExecution(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

// --- Account Matching Handlers ---
func (h *Handler) ListChatAccounts(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	chatType := r.URL.Query().Get("chat_type")
	matchStatus := r.URL.Query().Get("match_status")
	items, total, err := h.Match.ListChatAccounts(p.Page, p.PageSize, chatType, matchStatus, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) ListThirdPartyAccounts(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	systemType := r.URL.Query().Get("system_type")
	matchStatus := r.URL.Query().Get("match_status")
	items, total, err := h.Match.ListThirdPartyAccounts(p.Page, p.PageSize, systemType, matchStatus, p.Search)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) BindChatAccount(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	var body struct {
		UserID uuid.UUID `json:"user_id"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if err := h.Match.BindChatAccount(id, body.UserID); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "bound"})
}

func (h *Handler) BindThirdPartyAccount(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	var body struct {
		UserID uuid.UUID `json:"user_id"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	if err := h.Match.BindThirdPartyAccount(id, body.UserID); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "bound"})
}

func (h *Handler) ListMatchResults(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	status := r.URL.Query().Get("status")
	sourceType := r.URL.Query().Get("source_type")
	items, total, err := h.Match.ListResults(p.Page, p.PageSize, status, sourceType)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) ListMatchRuns(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.Match.ListRuns(p.Page, p.PageSize)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) ListMatchStrategies(w http.ResponseWriter, r *http.Request) {
	strategies, err := h.Match.ListStrategies()
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, strategies)
}

func (h *Handler) CreateMatchStrategy(w http.ResponseWriter, r *http.Request) {
	var s model.AccountMatchStrategy
	if err := decodeJSON(r, &s); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	s.ID = uuid.New()
	if err := h.Match.CreateStrategy(&s); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Created(w, s)
}

// --- Approval Handlers ---
func (h *Handler) ListApprovals(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	reqType := r.URL.Query().Get("request_type")
	status := r.URL.Query().Get("status")
	items, total, err := h.Approval.List(p.Page, p.PageSize, reqType, status)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetApproval(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Approval.GetByID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

// --- Quota Handlers ---
func (h *Handler) ListQuotas(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.Quota.List(p.Page, p.PageSize)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetQuota(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "userId"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Quota.GetByUserID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) UpdateQuota(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "userId"))
	if err != nil {
		response.Error(w, 400, "invalid id")
		return
	}
	item, err := h.Quota.GetByUserID(id)
	if err != nil {
		response.Error(w, 404, "not found")
		return
	}
	var body struct {
		QuotaBytes int64 `json:"quota_bytes"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, 400, "invalid request")
		return
	}
	item.QuotaBytes = body.QuotaBytes
	if err := h.Quota.Update(item); err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.Success(w, item)
}

// --- Audit Handlers ---
func (h *Handler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	actorType := r.URL.Query().Get("actor_type")
	action := r.URL.Query().Get("action")
	resourceType := r.URL.Query().Get("resource_type")
	items, total, err := h.Audit.List(p.Page, p.PageSize, actorType, action, resourceType, nil)
	if err != nil {
		response.Error(w, 500, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

// --- System Handlers ---
func (h *Handler) SystemHealth(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]interface{}{
		"status":  "healthy",
		"version": "0.1.0",
		"time":    time.Now(),
	})
}

func (h *Handler) DashboardSummary(w http.ResponseWriter, r *http.Request) {
	response.Success(w, map[string]interface{}{
		"agent_runs_today":      0,
		"failed_tasks_today":    0,
		"token_usage_today":     0,
		"model_cost_today":      0.0,
		"platform_health":       "healthy",
		"pending_matches":       0,
		"pending_approvals":     0,
		"pending_skill_reviews": 0,
	})
}
