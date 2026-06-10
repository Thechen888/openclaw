package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/agent"
	"github.com/openclaw/openclaw/internal/gateway"
	"github.com/openclaw/openclaw/internal/matcher"
	"github.com/openclaw/openclaw/internal/pkg/response"
)

// GatewayProxy proxies a model call through the gateway
func (h *Handler) GatewayProxy(w http.ResponseWriter, r *http.Request) {
	if h.Gateway == nil {
		response.Error(w, http.StatusServiceUnavailable, "Gateway engine not initialized")
		return
	}
	var req gateway.CallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	resp, err := h.Gateway.ProxyCall(r.Context(), req)
	if err != nil {
		response.Error(w, http.StatusBadGateway, err.Error())
		return
	}
	response.Success(w, resp)
}

// GatewayHealthCheck returns health status of all model sources
func (h *Handler) GatewayHealthCheck(w http.ResponseWriter, r *http.Request) {
	if h.Gateway == nil {
		response.Error(w, http.StatusServiceUnavailable, "Gateway engine not initialized")
		return
	}
	statuses := h.Gateway.HealthCheck(r.Context())
	response.Success(w, statuses)
}

// AgentExecute triggers an agent execution
func (h *Handler) AgentExecute(w http.ResponseWriter, r *http.Request) {
	if h.AgentEngine == nil {
		response.Error(w, http.StatusServiceUnavailable, "Agent engine not initialized")
		return
	}
	agentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid agent ID")
		return
	}
	var req struct {
		TriggerPayload string `json:"trigger_payload"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	result, err := h.AgentEngine.ExecuteAgent(r.Context(), agentID, req.TriggerPayload)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, result)
}

// AgentListRunning returns currently running executions
func (h *Handler) AgentListRunning(w http.ResponseWriter, r *http.Request) {
	if h.AgentEngine == nil {
		response.Error(w, http.StatusServiceUnavailable, "Agent engine not initialized")
		return
	}
	ids := h.AgentEngine.ListRunningExecutions()
	response.Success(w, ids)
}

// MatcherRun triggers a matching batch
func (h *Handler) MatcherRun(w http.ResponseWriter, r *http.Request) {
	if h.Matcher == nil {
		response.Error(w, http.StatusServiceUnavailable, "Matcher engine not initialized")
		return
	}
	var req struct {
		StrategyID  uuid.UUID `json:"strategy_id"`
		TriggerType string    `json:"trigger_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.TriggerType == "" {
		req.TriggerType = "manual"
	}
	result, err := h.Matcher.RunMatching(r.Context(), req.StrategyID, req.TriggerType)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, result)
}

// StarlarkExecute runs a starlark script
func (h *Handler) StarlarkExecute(w http.ResponseWriter, r *http.Request) {
	if h.Starlark == nil {
		response.Error(w, http.StatusServiceUnavailable, "Starlark engine not initialized")
		return
	}
	var req struct {
		Code  string         `json:"code"`
		Input map[string]any `json:"input"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Code == "" {
		response.Error(w, http.StatusBadRequest, "Code is required")
		return
	}
	result, err := h.Starlark.Execute(r.Context(), req.Code, req.Input)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	response.Success(w, result)
}

// Ensure interface compliance
var (
	_ = (*agent.Engine)(nil)
	_ = (*gateway.Gateway)(nil)
	_ = (*matcher.Matcher)(nil)
)
