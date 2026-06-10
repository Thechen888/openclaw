package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/agent"
	"github.com/openclaw/openclaw/internal/config"
	"github.com/openclaw/openclaw/internal/gateway"
	"github.com/openclaw/openclaw/internal/matcher"
	"github.com/openclaw/openclaw/internal/middleware"
	"github.com/openclaw/openclaw/internal/model"
	"github.com/openclaw/openclaw/internal/pkg/pagination"
	"github.com/openclaw/openclaw/internal/pkg/response"
	"github.com/openclaw/openclaw/internal/service"
	"github.com/openclaw/openclaw/internal/starlark"
)

// Handler holds all service dependencies
type Handler struct {
	Auth        *service.AuthService
	User        *service.UserService
	Org         *service.OrganizationService
	ModelSource *service.ModelSourceService
	ModelPolicy *service.ModelPolicyService
	Connector   *service.ConnectorService
	Token       *service.TokenService
	Skill       *service.SkillService
	Agent       *service.AgentService
	Match       *service.AccountMatchService
	Audit       *service.AuditService
	Stats       *service.StatsService
	Approval    *service.ApprovalService
	Quota       *service.QuotaService
	Config      *config.Config
	Gateway     *gateway.Gateway
	AgentEngine *agent.Engine
	Matcher     *matcher.Matcher
	Starlark    *starlark.Engine
}

// --- Auth Handlers ---
func (h *Handler) UserLogin(w http.ResponseWriter, r *http.Request) {
	var req service.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.Auth.UserLogin(req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	response.Success(w, resp)
}

func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req service.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.Auth.AdminLogin(req)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	response.Success(w, resp)
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil {
		response.Error(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	if claims.IsAdmin {
		response.Success(w, map[string]interface{}{"id": claims.UserID, "username": claims.Username, "role": claims.Role, "is_admin": true})
		return
	}
	user, err := h.User.GetByID(claims.UserID)
	if err != nil {
		response.Error(w, http.StatusNotFound, "user not found")
		return
	}
	response.Success(w, user)
}

// --- Helper ---
func parseUUID(s string) (uuid.UUID, error) { return uuid.Parse(s) }

func decodeJSON(r *http.Request, v interface{}) error { return json.NewDecoder(r.Body).Decode(v) }

// --- User Handlers ---
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.User.List(p.Page, p.PageSize, p.Search)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	item, err := h.User.GetByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "user not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	user, err := h.Auth.CreateUser(body.Username, body.Password, body.Name, body.Email, body.Role)
	if err != nil {
		response.Error(w, http.StatusConflict, err.Error())
		return
	}
	response.Created(w, user)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	user, err := h.User.GetByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "user not found")
		return
	}
	var body struct {
		Name   *string `json:"name"`
		Email  *string `json:"email"`
		Role   *string `json:"role"`
		Status *string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if body.Name != nil {
		user.Name = *body.Name
	}
	if body.Email != nil {
		user.PrimaryEmail = *body.Email
	}
	if body.Role != nil {
		user.Role = *body.Role
	}
	if body.Status != nil {
		user.Status = *body.Status
	}
	if err := h.User.Update(user); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, user)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.User.Delete(id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

// --- Organization Handlers ---
func (h *Handler) ListOrganizations(w http.ResponseWriter, r *http.Request) {
	p := pagination.ParseParams(r)
	items, total, err := h.Org.List(p.Page, p.PageSize, p.Search)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.SuccessWithPagination(w, items, p.Page, p.PageSize, total)
}

func (h *Handler) GetOrganization(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	item, err := h.Org.GetByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "organization not found")
		return
	}
	response.Success(w, item)
}

func (h *Handler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	var org model.Organization
	if err := decodeJSON(r, &org); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	org.ID = uuid.New()
	if err := h.Org.Create(&org); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Created(w, org)
}

func (h *Handler) UpdateOrganization(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	org, err := h.Org.GetByID(id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "organization not found")
		return
	}
	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		Status      *string `json:"status"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if body.Name != nil {
		org.Name = *body.Name
	}
	if body.Description != nil {
		org.Description = *body.Description
	}
	if body.Status != nil {
		org.Status = *body.Status
	}
	if err := h.Org.Update(org); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, org)
}

func (h *Handler) DeleteOrganization(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	if err := h.Org.Delete(id); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "deleted"})
}

func (h *Handler) ListOrgMembers(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	members, err := h.Org.ListMembers(id)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, members)
}

func (h *Handler) AddOrgMember(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	var body struct {
		UserID uuid.UUID `json:"user_id"`
		Role   string    `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request")
		return
	}
	if err := h.Org.AddMember(id, body.UserID, body.Role); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Created(w, map[string]string{"message": "member added"})
}

func (h *Handler) RemoveOrgMember(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid id")
		return
	}
	userID, err := parseUUID(chi.URLParam(r, "userId"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid user id")
		return
	}
	if err := h.Org.RemoveMember(id, userID); err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, map[string]string{"message": "member removed"})
}
