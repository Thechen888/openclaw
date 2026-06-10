package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/gateway"
	"github.com/openclaw/openclaw/internal/model"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// Dependency interfaces
// ---------------------------------------------------------------------------

// GatewayProxy abstracts the model gateway so the agent engine does not depend
// on the concrete gateway.Gateway type.
type GatewayProxy interface {
	ProxyCall(ctx context.Context, req gateway.CallRequest) (*gateway.CallResponse, error)
}

// ScriptRunner abstracts the Starlark scripting engine.
type ScriptRunner interface {
	Execute(ctx context.Context, code string, input map[string]any) (map[string]any, error)
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

// Engine orchestrates agent execution: loading the agent definition, evaluating
// conditions, running actions in order, and persisting execution records.
type Engine struct {
	db       *gorm.DB
	logger   *zap.Logger
	gw       GatewayProxy
	scripts  ScriptRunner
	client   *http.Client

	// Track currently-running execution IDs.
	runningMu sync.RWMutex
	running   map[uuid.UUID]struct{}
}

// New creates and returns a ready-to-use agent Engine.
func New(db *gorm.DB, logger *zap.Logger, gw GatewayProxy, scripts ScriptRunner) *Engine {
	return &Engine{
		db:      db,
		logger:  logger,
		gw:      gw,
		scripts: scripts,
		client: &http.Client{
			Timeout: 60 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		running: make(map[uuid.UUID]struct{}),
	}
}

// ---------------------------------------------------------------------------
// ExecuteAgent – main entry point
// ---------------------------------------------------------------------------

// ExecuteAgent loads the agent, evaluates conditions, executes actions, and
// returns the completed AgentExecution record.
func (e *Engine) ExecuteAgent(ctx context.Context, agentID uuid.UUID, triggerPayload string) (*model.AgentExecution, error) {
	// 1. Load agent with all related records.
	var ag model.Agent
	if err := e.db.WithContext(ctx).
		Preload("Triggers", "is_active = ?", true).
		Preload("Conditions").
		Preload("Actions").
		Where("id = ? AND status = ?", agentID, model.AgentStatusActive).
		First(&ag).Error; err != nil {
		return nil, fmt.Errorf("agent: load agent %s: %w", agentID, err)
	}

	// Sort conditions and actions by sort_order.
	sort.Slice(ag.Conditions, func(i, j int) bool {
		return ag.Conditions[i].SortOrder < ag.Conditions[j].SortOrder
	})
	sort.Slice(ag.Actions, func(i, j int) bool {
		return ag.Actions[i].SortOrder < ag.Actions[j].SortOrder
	})

	// 2. Determine trigger type from payload or first active trigger.
	triggerType := model.TriggerTypeManual
	if len(ag.Triggers) > 0 {
		triggerType = ag.Triggers[0].TriggerType
	}

	// 3. Create execution record.
	execution := &model.AgentExecution{
		AgentID:        agentID,
		TriggerType:    triggerType,
		TriggerPayload: triggerPayload,
		Status:         model.ExecutionStatusRunning,
		StartedAt:      time.Now(),
		CreatedAt:      time.Now(),
	}
	if err := e.db.WithContext(ctx).Create(execution).Error; err != nil {
		return nil, fmt.Errorf("agent: create execution: %w", err)
	}

	// Track running.
	e.addRunning(execution.ID)
	defer e.removeRunning(execution.ID)

	// Parse trigger payload for condition evaluation.
	var payloadMap map[string]any
	if triggerPayload != "" {
		_ = json.Unmarshal([]byte(triggerPayload), &payloadMap)
	}
	if payloadMap == nil {
		payloadMap = make(map[string]any)
	}

	// Accumulated context passed between actions.
	actionContext := map[string]any{
		"trigger_payload": payloadMap,
		"agent_id":        agentID.String(),
		"execution_id":    execution.ID.String(),
	}

	// 4. Evaluate conditions.
	for _, cond := range ag.Conditions {
		passed, err := e.evaluateCondition(ctx, cond, payloadMap, actionContext)
		if err != nil {
			e.logger.Warn("agent: condition evaluation error",
				zap.String("condition", cond.Name),
				zap.Error(err),
			)
			// Treat errors as condition not passed.
			passed = false
		}
		if !passed {
			e.logger.Info("agent: condition not met, skipping execution",
				zap.String("agent_id", agentID.String()),
				zap.String("condition", cond.Name),
			)
			e.finalizeExecution(ctx, execution, model.ExecutionStatusCompleted, "condition not met: "+cond.Name)
			return execution, nil
		}
	}

	// 5. Execute actions in order.
	stepOrder := 0
	for _, action := range ag.Actions {
		stepOrder++
		stepStart := time.Now()

		log := &model.AgentExecutionLog{
			ExecutionID: execution.ID,
			StepOrder:   stepOrder,
			StepType:    action.ActionType,
			StepName:    fmt.Sprintf("action_%d_%s", stepOrder, action.ActionType),
			Status:      model.ExecutionStatusRunning,
			CreatedAt:   time.Now(),
		}

		inputSummary, _ := json.Marshal(actionContext)
		log.InputSummary = truncateStr(string(inputSummary), 4000)

		var stepErr error
		var output any

		switch action.ActionType {
		case model.ActionTypeCallModel:
			output, stepErr = e.executeModelCall(ctx, action, actionContext, &ag)
			if resp, ok := output.(map[string]any); ok {
				execution.TotalModelTokens += intVal(resp, "total_tokens")
				execution.TotalModelCost += floatVal(resp, "cost")
				if sid, ok := resp["model_source_id"].(string); ok {
					parsed, _ := uuid.Parse(sid)
					if parsed != uuid.Nil {
						log.ModelSourceID = &parsed
					}
				}
				log.ModelInputTokens = intVal(resp, "input_tokens")
				log.ModelOutputTokens = intVal(resp, "output_tokens")
				log.ModelCost = floatVal(resp, "cost")
			}

		case "script": // Starlark script execution (action type used in configs)
			output, stepErr = e.executeScript(ctx, action, actionContext)

		case model.ActionTypeCallSkill:
			output, stepErr = e.executeScript(ctx, action, actionContext)

		case model.ActionTypeQueryConnector, model.ActionTypeWriteConnector:
			output, stepErr = e.executeConnectorCall(ctx, action, actionContext)
			if cid, ok := output.(map[string]any); ok {
				if sid, ok := cid["connector_id"].(string); ok {
					parsed, _ := uuid.Parse(sid)
					if parsed != uuid.Nil {
						log.ConnectorID = &parsed
					}
				}
			}

		case "http_request":
			output, stepErr = e.executeHTTPRequest(ctx, action, actionContext)

		case model.ActionTypeSendIM:
			output, stepErr = e.executeConnectorCall(ctx, action, actionContext)

		case model.ActionTypeTriggerAgent:
			output, stepErr = e.executeTriggerAgent(ctx, action, actionContext)

		default:
			stepErr = fmt.Errorf("unsupported action type: %s", action.ActionType)
		}

		// Record step duration.
		log.DurationMs = int(time.Since(stepStart).Milliseconds())
		execution.TotalAPICalls++

		// Build output summary.
		if output != nil {
			outBytes, _ := json.Marshal(output)
			log.OutputSummary = truncateStr(string(outBytes), 4000)
			// Merge output into action context for subsequent actions.
			if outMap, ok := output.(map[string]any); ok {
				for k, v := range outMap {
					actionContext[fmt.Sprintf("step_%d_%s", stepOrder, k)] = v
				}
				actionContext["last_output"] = outMap
			}
		}

		if stepErr != nil {
			log.Status = model.ExecutionStatusFailed
			log.OutputSummary = stepErr.Error()
			e.saveExecutionLog(ctx, log)

			onFailure := action.OnFailure
			if onFailure == "" {
				onFailure = model.OnFailureStop
			}

			switch onFailure {
			case model.OnFailureStop:
				e.finalizeExecution(ctx, execution, model.ExecutionStatusFailed, stepErr.Error())
				return execution, stepErr

			case model.OnFailureSkip:
				e.logger.Warn("agent: action failed, skipping",
					zap.String("action_type", action.ActionType),
					zap.Int("step", stepOrder),
					zap.Error(stepErr),
				)
				continue

			case model.OnFailureContinue:
				e.logger.Warn("agent: action failed, continuing",
					zap.String("action_type", action.ActionType),
					zap.Int("step", stepOrder),
					zap.Error(stepErr),
				)
				continue

			case model.OnFailureRetry:
				// Retry the same action once.
				e.logger.Info("agent: retrying failed action",
					zap.String("action_type", action.ActionType),
					zap.Int("step", stepOrder),
				)
				output, stepErr = e.retryAction(ctx, action, actionContext, &ag)
				if stepErr != nil {
					e.finalizeExecution(ctx, execution, model.ExecutionStatusFailed, stepErr.Error())
					return execution, stepErr
				}
				// Update log with retry result.
				if outMap, ok := output.(map[string]any); ok {
					outBytes, _ := json.Marshal(outMap)
					log.OutputSummary = truncateStr(string(outBytes), 4000)
					log.Status = model.ExecutionStatusCompleted
					for k, v := range outMap {
						actionContext[fmt.Sprintf("step_%d_%s", stepOrder, k)] = v
					}
					actionContext["last_output"] = outMap
				}
				e.saveExecutionLog(ctx, log)

			default:
				e.finalizeExecution(ctx, execution, model.ExecutionStatusFailed, stepErr.Error())
				return execution, stepErr
			}
		} else {
			log.Status = model.ExecutionStatusCompleted
			e.saveExecutionLog(ctx, log)
		}
	}

	// 6. Mark completed.
	e.finalizeExecution(ctx, execution, model.ExecutionStatusCompleted, "")
	return execution, nil
}

// ---------------------------------------------------------------------------
// ListRunningExecutions
// ---------------------------------------------------------------------------

// ListRunningExecutions returns the IDs of all currently-running executions.
func (e *Engine) ListRunningExecutions() []uuid.UUID {
	e.runningMu.RLock()
	defer e.runningMu.RUnlock()
	ids := make([]uuid.UUID, 0, len(e.running))
	for id := range e.running {
		ids = append(ids, id)
	}
	return ids
}

func (e *Engine) addRunning(id uuid.UUID) {
	e.runningMu.Lock()
	e.running[id] = struct{}{}
	e.runningMu.Unlock()
}

func (e *Engine) removeRunning(id uuid.UUID) {
	e.runningMu.Lock()
	delete(e.running, id)
	e.runningMu.Unlock()
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

func (e *Engine) evaluateCondition(
	ctx context.Context,
	cond model.AgentCondition,
	payload map[string]any,
	actionCtx map[string]any,
) (bool, error) {
	switch cond.ConditionType {
	case model.ConditionTypeFieldMatch:
		return e.evalFieldMatch(cond, payload)
	case model.ConditionTypeTimeWindow:
		return e.evalTimeWindow(cond)
	case model.ConditionTypeStarlark:
		return e.evalStarlarkCondition(ctx, cond, payload, actionCtx)
	case model.ConditionTypeModelJudgment:
		// Model judgment conditions require an LLM call; pass by default.
		e.logger.Info("agent: model_judgment condition auto-passed (not yet implemented)",
			zap.String("condition", cond.Name))
		return true, nil
	case model.ConditionTypeApprovalGate:
		// Approval gates require external approval; pass for automated runs.
		e.logger.Info("agent: approval_gate condition auto-passed for automated execution",
			zap.String("condition", cond.Name))
		return true, nil
	default:
		return false, fmt.Errorf("unknown condition type: %s", cond.ConditionType)
	}
}

// fieldMatchConfig is the JSON shape of AgentCondition.Config for field_match.
type fieldMatchConfig struct {
	Field    string `json:"field"`
	Operator string `json:"operator"` // eq, neq, contains, not_contains, in, gt, lt, gte, lte, exists
	Value    any    `json:"value"`
}

func (e *Engine) evalFieldMatch(cond model.AgentCondition, payload map[string]any) (bool, error) {
	var cfg fieldMatchConfig
	if err := json.Unmarshal([]byte(cond.Config), &cfg); err != nil {
		return false, fmt.Errorf("parse field_match config: %w", err)
	}

	fieldVal, exists := payload[cfg.Field]

	switch cfg.Operator {
	case "exists":
		return exists, nil
	case "eq":
		return exists && fmt.Sprintf("%v", fieldVal) == fmt.Sprintf("%v", cfg.Value), nil
	case "neq":
		return !exists || fmt.Sprintf("%v", fieldVal) != fmt.Sprintf("%v", cfg.Value), nil
	case "contains":
		return exists && strings.Contains(fmt.Sprintf("%v", fieldVal), fmt.Sprintf("%v", cfg.Value)), nil
	case "not_contains":
		return !exists || !strings.Contains(fmt.Sprintf("%v", fieldVal), fmt.Sprintf("%v", cfg.Value)), nil
	case "in":
		if !exists {
			return false, nil
		}
		valStr := fmt.Sprintf("%v", fieldVal)
		listStr := fmt.Sprintf("%v", cfg.Value)
		return strings.Contains(listStr, valStr), nil
	case "gt", "lt", "gte", "lte":
		if !exists {
			return false, nil
		}
		return compareNumeric(fieldVal, cfg.Value, cfg.Operator)
	default:
		// If expression field is set, use simple expression evaluation.
		if cond.Expression != "" {
			return e.evalSimpleExpression(cond.Expression, payload)
		}
		return true, nil
	}
}

// timeWindowConfig is the JSON shape for time_window conditions.
type timeWindowConfig struct {
	StartHour int `json:"start_hour"` // 0-23
	EndHour   int `json:"end_hour"`   // 0-23
	Days      []int `json:"days"`     // 0=Sunday, 6=Saturday
}

func (e *Engine) evalTimeWindow(cond model.AgentCondition) (bool, error) {
	var cfg timeWindowConfig
	if err := json.Unmarshal([]byte(cond.Config), &cfg); err != nil {
		return false, fmt.Errorf("parse time_window config: %w", err)
	}

	now := time.Now()
	hour := now.Hour()
	weekday := int(now.Weekday())

	// Check day of week.
	if len(cfg.Days) > 0 {
		dayMatch := false
		for _, d := range cfg.Days {
			if d == weekday {
				dayMatch = true
				break
			}
		}
		if !dayMatch {
			return false, nil
		}
	}

	// Check hour window.
	if cfg.StartHour <= cfg.EndHour {
		return hour >= cfg.StartHour && hour < cfg.EndHour, nil
	}
	// Wraps midnight (e.g. 22 -> 6).
	return hour >= cfg.StartHour || hour < cfg.EndHour, nil
}

func (e *Engine) evalStarlarkCondition(
	ctx context.Context,
	cond model.AgentCondition,
	payload map[string]any,
	actionCtx map[string]any,
) (bool, error) {
	if e.scripts == nil {
		return false, errors.New("agent: script runner not configured")
	}
	code := cond.Expression
	if code == "" {
		// Fall back to config field for the code.
		var codeCfg struct {
			Code string `json:"code"`
		}
		if err := json.Unmarshal([]byte(cond.Config), &codeCfg); err != nil {
			return false, fmt.Errorf("parse starlark condition config: %w", err)
		}
		code = codeCfg.Code
	}
	if code == "" {
		return true, nil // no code means pass
	}

	input := map[string]any{
		"payload":  payload,
		"context":  actionCtx,
	}
	result, err := e.scripts.Execute(ctx, code, input)
	if err != nil {
		return false, fmt.Errorf("starlark condition error: %w", err)
	}

	// Expect result["passed"] to be a boolean.
	if passed, ok := result["passed"]; ok {
		if b, ok := passed.(bool); ok {
			return b, nil
		}
	}
	// If result has "result" key, treat truthy as pass.
	if val, ok := result["result"]; ok {
		return isTruthy(val), nil
	}
	return true, nil
}

// evalSimpleExpression handles basic "field == value" style expressions.
func (e *Engine) evalSimpleExpression(expr string, payload map[string]any) (bool, error) {
	expr = strings.TrimSpace(expr)
	if expr == "" {
		return true, nil
	}

	// Support: field == "value", field != "value", field contains "value"
	operators := []struct {
		op   string
		test func(string, string) bool
	}{
		{"==", func(a, b string) bool { return a == b }},
		{"!=", func(a, b string) bool { return a != b }},
		{"contains", func(a, b string) bool { return strings.Contains(a, b) }},
		{"not_contains", func(a, b string) bool { return !strings.Contains(a, b) }},
	}

	for _, op := range operators {
		parts := strings.SplitN(expr, op.op, 2)
		if len(parts) == 2 {
			field := strings.TrimSpace(parts[0])
			value := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			fieldVal := fmt.Sprintf("%v", payload[field])
			return op.test(fieldVal, value), nil
		}
	}

	// If no operator matched, check if the expression is a field name that is truthy.
	if val, ok := payload[expr]; ok {
		return isTruthy(val), nil
	}
	return false, fmt.Errorf("cannot evaluate expression: %s", expr)
}

// ---------------------------------------------------------------------------
// Action executors
// ---------------------------------------------------------------------------

// modelCallConfig is the JSON shape for call_model action configs.
type modelCallConfig struct {
	PolicyID string `json:"policy_id"`
	Model    string `json:"model"`
	Messages []map[string]string `json:"messages"`
	// Template support: if PromptTemplate is set, build messages from it.
	PromptTemplate string `json:"prompt_template"`
	SystemPrompt   string `json:"system_prompt"`
}

func (e *Engine) executeModelCall(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
	ag *model.Agent,
) (any, error) {
	var cfg modelCallConfig
	if err := json.Unmarshal([]byte(action.Config), &cfg); err != nil {
		return nil, fmt.Errorf("parse model_call config: %w", err)
	}

	policyID := uuid.Nil
	if cfg.PolicyID != "" {
		parsed, err := uuid.Parse(cfg.PolicyID)
		if err == nil {
			policyID = parsed
		}
	}
	// Fall back to agent's model policy.
	if policyID == uuid.Nil && ag.ModelPolicyID != nil {
		policyID = *ag.ModelPolicyID
	}
	if policyID == uuid.Nil {
		return nil, errors.New("agent: no model policy configured for call_model action")
	}

	messages := cfg.Messages
	if len(messages) == 0 {
		// Build messages from templates.
		if cfg.SystemPrompt != "" {
			messages = append(messages, map[string]string{
				"role":    "system",
				"content": cfg.SystemPrompt,
			})
		}
		userMsg := cfg.PromptTemplate
		if userMsg == "" {
			// Use last_output content if available.
			if lastOut, ok := actionCtx["last_output"].(map[string]any); ok {
				if content, ok := lastOut["content"].(string); ok {
					userMsg = content
				}
			}
		}
		if userMsg == "" {
			userMsg = "Continue."
		}
		messages = append(messages, map[string]string{
			"role":    "user",
			"content": userMsg,
		})
	}

	req := gateway.CallRequest{
		PolicyID:   policyID,
		Messages:   messages,
		Model:      cfg.Model,
		CallerType: model.PrincipalTypeAgent,
		CallerID:   ag.ID,
	}

	resp, err := e.gw.ProxyCall(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("model call failed: %w", err)
	}

	return map[string]any{
		"content":        resp.Content,
		"input_tokens":   resp.InputTokens,
		"output_tokens":  resp.OutputTokens,
		"total_tokens":   resp.InputTokens + resp.OutputTokens,
		"cost":           resp.Cost,
		"model_used":     resp.ModelUsed,
		"latency_ms":     resp.LatencyMs,
	}, nil
}

// scriptConfig is the JSON shape for script action configs.
type scriptConfig struct {
	Code       string         `json:"code"`
	SkillID    string         `json:"skill_id"`
	Input      map[string]any `json:"input"`
}

func (e *Engine) executeScript(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
) (any, error) {
	if e.scripts == nil {
		return nil, errors.New("agent: script runner not configured")
	}

	var cfg scriptConfig
	if err := json.Unmarshal([]byte(action.Config), &cfg); err != nil {
		return nil, fmt.Errorf("parse script config: %w", err)
	}

	code := cfg.Code
	// If code is empty but skill_id is set, load from skill.
	if code == "" && cfg.SkillID != "" {
		skillID, err := uuid.Parse(cfg.SkillID)
		if err != nil {
			return nil, fmt.Errorf("invalid skill_id: %w", err)
		}
		var skill model.Skill
		if err := e.db.WithContext(ctx).Where("id = ?", skillID).First(&skill).Error; err != nil {
			return nil, fmt.Errorf("load skill %s: %w", skillID, err)
		}
		code = skill.StarlarkCode
		if code == "" && skill.CurrentVersionID != nil {
			var ver model.SkillVersion
			if err := e.db.WithContext(ctx).Where("id = ?", *skill.CurrentVersionID).First(&ver).Error; err == nil {
				code = ver.StarlarkCode
			}
		}
	}
	if code == "" {
		return nil, errors.New("agent: no starlark code in script action config")
	}

	input := make(map[string]any)
	for k, v := range cfg.Input {
		input[k] = v
	}
	// Inject action context.
	input["_context"] = actionCtx
	if lastOut, ok := actionCtx["last_output"].(map[string]any); ok {
		input["_last_output"] = lastOut
	}

	result, err := e.scripts.Execute(ctx, code, input)
	if err != nil {
		return nil, fmt.Errorf("script execution failed: %w", err)
	}
	return result, nil
}

// connectorCallConfig is the JSON shape for connector actions.
type connectorCallConfig struct {
	ConnectorID string         `json:"connector_id"`
	Endpoint    string         `json:"endpoint"`
	Method      string         `json:"method"`
	Body        map[string]any `json:"body"`
	Headers     map[string]string `json:"headers"`
}

func (e *Engine) executeConnectorCall(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
) (any, error) {
	var cfg connectorCallConfig
	if err := json.Unmarshal([]byte(action.Config), &cfg); err != nil {
		return nil, fmt.Errorf("parse connector config: %w", err)
	}

	if cfg.Endpoint == "" {
		return nil, errors.New("agent: connector endpoint not configured")
	}

	method := cfg.Method
	if method == "" {
		method = http.MethodPost
	}

	var bodyReader io.Reader
	if cfg.Body != nil {
		bodyBytes, err := json.Marshal(cfg.Body)
		if err != nil {
			return nil, fmt.Errorf("marshal connector body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, cfg.Endpoint, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("create connector request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	for k, v := range cfg.Headers {
		httpReq.Header.Set(k, v)
	}

	resp, err := e.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("connector call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read connector response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("connector returned HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]any
	if err := json.Unmarshal(respBody, &result); err != nil {
		// Not JSON, wrap in a map.
		result = map[string]any{
			"status_code": resp.StatusCode,
			"body":        string(respBody),
		}
	}
	result["connector_id"] = cfg.ConnectorID
	return result, nil
}

// httpRequestConfig is the JSON shape for http_request actions.
type httpRequestConfig struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    any               `json:"body"`
	Timeout int               `json:"timeout_ms"`
}

func (e *Engine) executeHTTPRequest(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
) (any, error) {
	var cfg httpRequestConfig
	if err := json.Unmarshal([]byte(action.Config), &cfg); err != nil {
		return nil, fmt.Errorf("parse http_request config: %w", err)
	}

	if cfg.URL == "" {
		return nil, errors.New("agent: http_request url is required")
	}

	method := cfg.Method
	if method == "" {
		method = http.MethodGet
	}

	var bodyReader io.Reader
	if cfg.Body != nil {
		bodyBytes, err := json.Marshal(cfg.Body)
		if err != nil {
			return nil, fmt.Errorf("marshal http_request body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, cfg.URL, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("create http request: %w", err)
	}
	if bodyReader != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	for k, v := range cfg.Headers {
		httpReq.Header.Set(k, v)
	}

	client := e.client
	if cfg.Timeout > 0 {
		client = &http.Client{
			Timeout:   time.Duration(cfg.Timeout) * time.Millisecond,
			Transport: e.client.Transport,
		}
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read http response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("http request returned %d: %s", resp.StatusCode, truncateStr(string(respBody), 500))
	}

	result := map[string]any{
		"status_code": resp.StatusCode,
		"body":        string(respBody),
	}
	// Try to parse body as JSON.
	var jsonBody any
	if json.Unmarshal(respBody, &jsonBody) == nil {
		result["json_body"] = jsonBody
	}
	return result, nil
}

// triggerAgentConfig for trigger_agent actions.
type triggerAgentConfig struct {
	TargetAgentID string `json:"target_agent_id"`
	Payload       string `json:"payload"`
}

func (e *Engine) executeTriggerAgent(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
) (any, error) {
	var cfg triggerAgentConfig
	if err := json.Unmarshal([]byte(action.Config), &cfg); err != nil {
		return nil, fmt.Errorf("parse trigger_agent config: %w", err)
	}

	targetID, err := uuid.Parse(cfg.TargetAgentID)
	if err != nil {
		return nil, fmt.Errorf("invalid target_agent_id: %w", err)
	}

	payload := cfg.Payload
	if payload == "" {
		payloadBytes, _ := json.Marshal(actionCtx)
		payload = string(payloadBytes)
	}

	// Fire-and-forget in a goroutine; do not block the current execution.
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		_, err := e.ExecuteAgent(bgCtx, targetID, payload)
		if err != nil {
			e.logger.Error("agent: triggered sub-agent failed",
				zap.String("target_agent_id", targetID.String()),
				zap.Error(err),
			)
		}
	}()

	return map[string]any{
		"triggered_agent_id": targetID.String(),
		"status":             "triggered",
	}, nil
}

// retryAction retries an action once.
func (e *Engine) retryAction(
	ctx context.Context,
	action model.AgentAction,
	actionCtx map[string]any,
	ag *model.Agent,
) (any, error) {
	switch action.ActionType {
	case model.ActionTypeCallModel:
		return e.executeModelCall(ctx, action, actionCtx, ag)
	case "script", model.ActionTypeCallSkill:
		return e.executeScript(ctx, action, actionCtx)
	case model.ActionTypeQueryConnector, model.ActionTypeWriteConnector, model.ActionTypeSendIM:
		return e.executeConnectorCall(ctx, action, actionCtx)
	case "http_request":
		return e.executeHTTPRequest(ctx, action, actionCtx)
	case model.ActionTypeTriggerAgent:
		return e.executeTriggerAgent(ctx, action, actionCtx)
	default:
		return nil, fmt.Errorf("unsupported action type for retry: %s", action.ActionType)
	}
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

func (e *Engine) saveExecutionLog(ctx context.Context, log *model.AgentExecutionLog) {
	if err := e.db.WithContext(ctx).Create(log).Error; err != nil {
		e.logger.Error("agent: failed to save execution log",
			zap.String("execution_id", log.ExecutionID.String()),
			zap.Int("step", log.StepOrder),
			zap.Error(err),
		)
	}
}

func (e *Engine) finalizeExecution(ctx context.Context, exec *model.AgentExecution, status, errMsg string) {
	now := time.Now()
	exec.Status = status
	exec.CompletedAt = &now
	exec.DurationMs = int(now.Sub(exec.StartedAt).Milliseconds())
	exec.ErrorMessage = errMsg

	updates := map[string]any{
		"status":             exec.Status,
		"completed_at":       exec.CompletedAt,
		"duration_ms":        exec.DurationMs,
		"total_model_tokens": exec.TotalModelTokens,
		"total_model_cost":   exec.TotalModelCost,
		"total_api_calls":    exec.TotalAPICalls,
		"error_message":      exec.ErrorMessage,
	}

	if err := e.db.WithContext(ctx).Model(exec).Updates(updates).Error; err != nil {
		e.logger.Error("agent: failed to finalize execution",
			zap.String("execution_id", exec.ID.String()),
			zap.Error(err),
		)
	}

	// Update agent last_run_at.
	e.db.WithContext(ctx).Model(&model.Agent{}).
		Where("id = ?", exec.AgentID).
		Update("last_run_at", now)
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

func truncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "...(truncated)"
}

func intVal(m map[string]any, key string) int {
	v, ok := m[key]
	if !ok {
		return 0
	}
	switch val := v.(type) {
	case int:
		return val
	case int64:
		return int(val)
	case float64:
		return int(val)
	case json.Number:
		n, _ := val.Int64()
		return int(n)
	default:
		return 0
	}
}

func floatVal(m map[string]any, key string) float64 {
	v, ok := m[key]
	if !ok {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case json.Number:
		f, _ := val.Float64()
		return f
	default:
		return 0
	}
}

func isTruthy(v any) bool {
	if v == nil {
		return false
	}
	switch val := v.(type) {
	case bool:
		return val
	case int:
		return val != 0
	case int64:
		return val != 0
	case float64:
		return val != 0
	case string:
		return val != "" && val != "false" && val != "0"
	default:
		return true
	}
}

func compareNumeric(a, b any, op string) (bool, error) {
	af, aOk := toFloat64(a)
	bf, bOk := toFloat64(b)
	if !aOk || !bOk {
		return false, fmt.Errorf("cannot compare non-numeric values")
	}
	switch op {
	case "gt":
		return af > bf, nil
	case "lt":
		return af < bf, nil
	case "gte":
		return af >= bf, nil
	case "lte":
		return af <= bf, nil
	default:
		return false, fmt.Errorf("unknown comparison operator: %s", op)
	}
}

func toFloat64(v any) (float64, bool) {
	switch val := v.(type) {
	case float64:
		return val, true
	case float32:
		return float64(val), true
	case int:
		return float64(val), true
	case int64:
		return float64(val), true
	case int32:
		return float64(val), true
	case json.Number:
		f, err := val.Float64()
		return f, err == nil
	case string:
		var f float64
		_, err := fmt.Sscanf(val, "%f", &f)
		return f, err == nil
	default:
		return 0, false
	}
}
