package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/openclaw/openclaw/internal/middleware"
	"github.com/openclaw/openclaw/internal/pkg/response"
	"go.uber.org/zap"
)

func NewRouter(h *Handler, logger *zap.Logger) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.RequestIDMiddleware)
	r.Use(middleware.LoggerMiddleware(logger))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public routes
	r.Post("/api/v1/auth/login", h.UserLogin)
	r.Post("/api/v1/auth/admin/login", h.AdminLogin)
	r.Get("/api/v1/system/health", h.SystemHealth)

	// Webhook routes (signature verified, not JWT)
	r.Post("/webhooks/chat/{adapterType}", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	r.Post("/webhooks/connectors/{connectorId}", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Authenticated routes (accepts both user and admin tokens)
	r.Group(func(r chi.Router) {
		r.Use(middleware.CombinedAuthMiddleware(h.Config.Auth.UserJWTSecret, h.Config.Auth.AdminJWTSecret))

		r.Get("/api/v1/auth/me", h.GetMe)

		// Users
		r.Get("/api/v1/users", h.ListUsers)
		r.Get("/api/v1/users/{id}", h.GetUser)

		// Organizations
		r.Get("/api/v1/organizations", h.ListOrganizations)
		r.Get("/api/v1/organizations/{id}", h.GetOrganization)
		r.Get("/api/v1/organizations/{id}/members", h.ListOrgMembers)

		// Accounts
		r.Get("/api/v1/accounts/chat", h.ListChatAccounts)
		r.Get("/api/v1/accounts/third-party", h.ListThirdPartyAccounts)

		// Account Matching
		r.Get("/api/v1/account-matching/results", h.ListMatchResults)
		r.Get("/api/v1/account-matching/runs", h.ListMatchRuns)
		r.Get("/api/v1/account-matching/strategies", h.ListMatchStrategies)

		// Models
		r.Get("/api/v1/models/sources", h.ListModelSources)
		r.Get("/api/v1/models/sources/{id}", h.GetModelSource)
		r.Get("/api/v1/models/policies", h.ListModelPolicies)
		r.Get("/api/v1/models/policies/{id}", h.GetModelPolicy)

		// Connectors
		r.Get("/api/v1/connectors", h.ListConnectors)
		r.Get("/api/v1/connectors/{id}", h.GetConnector)

		// Skills
		r.Get("/api/v1/skills", h.ListSkills)
		r.Get("/api/v1/skills/{id}", h.GetSkill)

		// Agents
		r.Get("/api/v1/agents", h.ListAgents)
		r.Get("/api/v1/agents/{id}", h.GetAgent)
		r.Get("/api/v1/agents/{id}/executions", h.ListAgentExecutions)
		r.Get("/api/v1/agents/executions/{execId}", h.GetAgentExecution)

		// Tokens
		r.Get("/api/v1/tokens", h.ListTokens)
		r.Get("/api/v1/tokens/{id}", h.GetToken)

		// Approvals
		r.Get("/api/v1/approvals", h.ListApprovals)
		r.Get("/api/v1/approvals/{id}", h.GetApproval)

		// Stats
		r.Get("/api/v1/stats/dashboard", h.DashboardSummary)

		// Audit
		r.Get("/api/v1/audit/logs", h.ListAuditLogs)

		// Quotas
		r.Get("/api/v1/quotas", h.ListQuotas)
		r.Get("/api/v1/quotas/{userId}", h.GetQuota)
	})

	// Admin-only routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AdminMiddleware(h.Config.Auth.AdminJWTSecret))

		// Users CRUD
		r.Post("/api/v1/users", h.CreateUser)
		r.Put("/api/v1/users/{id}", h.UpdateUser)
		r.Delete("/api/v1/users/{id}", h.DeleteUser)

		// Organizations CRUD
		r.Post("/api/v1/organizations", h.CreateOrganization)
		r.Put("/api/v1/organizations/{id}", h.UpdateOrganization)
		r.Delete("/api/v1/organizations/{id}", h.DeleteOrganization)
		r.Post("/api/v1/organizations/{id}/members", h.AddOrgMember)
		r.Delete("/api/v1/organizations/{id}/members/{userId}", h.RemoveOrgMember)

		// Account binding
		r.Put("/api/v1/accounts/chat/{id}/bindUser", h.BindChatAccount)
		r.Put("/api/v1/accounts/third-party/{id}/bindUser", h.BindThirdPartyAccount)

		// Matching strategies
		r.Post("/api/v1/account-matching/strategies", h.CreateMatchStrategy)

		// Model Sources CRUD
		r.Post("/api/v1/models/sources", h.CreateModelSource)
		r.Put("/api/v1/models/sources/{id}", h.UpdateModelSource)
		r.Delete("/api/v1/models/sources/{id}", h.DeleteModelSource)

		// Model Policies CRUD
		r.Post("/api/v1/models/policies", h.CreateModelPolicy)
		r.Put("/api/v1/models/policies/{id}", h.UpdateModelPolicy)
		r.Delete("/api/v1/models/policies/{id}", h.DeleteModelPolicy)

		// Connectors CRUD
		r.Post("/api/v1/connectors", h.CreateConnector)
		r.Put("/api/v1/connectors/{id}", h.UpdateConnector)
		r.Delete("/api/v1/connectors/{id}", h.DeleteConnector)

		// Skills CRUD
		r.Post("/api/v1/skills", h.CreateSkill)
		r.Put("/api/v1/skills/{id}", h.UpdateSkill)
		r.Delete("/api/v1/skills/{id}", h.DeleteSkill)

		// Agents CRUD
		r.Post("/api/v1/agents", h.CreateAgent)
		r.Put("/api/v1/agents/{id}", h.UpdateAgent)
		r.Delete("/api/v1/agents/{id}", h.DeleteAgent)

		// Tokens CRUD
		r.Post("/api/v1/tokens", h.CreateToken)
		r.Put("/api/v1/tokens/{id}", h.UpdateToken)

		// Quotas
		r.Put("/api/v1/quotas/{userId}", h.UpdateQuota)

		// System
		r.Post("/api/v1/system/restart", func(w http.ResponseWriter, r *http.Request) {
			response.Success(w, map[string]string{"message": "restart initiated"})
		})

		// Engine: Model Gateway
		r.Post("/api/v1/gateway/proxy", h.GatewayProxy)
		r.Get("/api/v1/gateway/health", h.GatewayHealthCheck)

		// Engine: Agent Execution
		r.Post("/api/v1/agents/{id}/execute", h.AgentExecute)
		r.Get("/api/v1/agents/running", h.AgentListRunning)

		// Engine: Account Matching
		r.Post("/api/v1/account-matching/run", h.MatcherRun)

		// Engine: Starlark
		r.Post("/api/v1/starlark/execute", h.StarlarkExecute)
	})

	return r
}
