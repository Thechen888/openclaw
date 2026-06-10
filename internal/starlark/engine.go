package starlark

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"go.starlark.net/starlark"
	"go.starlark.net/starlarkstruct"
	"go.starlark.net/syntax"
	"go.uber.org/zap"
)

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Config controls resource limits for the Starlark execution sandbox.
type Config struct {
	Timeout     time.Duration
	MaxSteps    int
	MaxMemoryMB int
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		Timeout:     30 * time.Second,
		MaxSteps:    100_000,
		MaxMemoryMB: 64,
	}
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

// Engine executes Starlark scripts in a sandboxed environment with built-in
// helper functions for HTTP, JSON, logging and environment access.
type Engine struct {
	cfg    Config
	logger *zap.Logger
	client *http.Client
}

// New creates a Starlark Engine with the given configuration.
func New(cfg Config, logger *zap.Logger) *Engine {
	if cfg.Timeout <= 0 {
		cfg.Timeout = DefaultConfig().Timeout
	}
	if cfg.MaxSteps <= 0 {
		cfg.MaxSteps = DefaultConfig().MaxSteps
	}
	if cfg.MaxMemoryMB <= 0 {
		cfg.MaxMemoryMB = DefaultConfig().MaxMemoryMB
	}
	return &Engine{
		cfg:    cfg,
		logger: logger,
		client: &http.Client{
			Timeout: cfg.Timeout,
			Transport: &http.Transport{
				MaxIdleConns:        20,
				MaxIdleConnsPerHost: 5,
				IdleConnTimeout:     60 * time.Second,
			},
		},
	}
}

// ---------------------------------------------------------------------------
// Execute – main entry point
// ---------------------------------------------------------------------------

// Execute runs the given Starlark source code with the supplied input map.
// The script may set a global `result` variable (or the last expression value)
// which is converted back to a Go map and returned.
func (e *Engine) Execute(ctx context.Context, code string, input map[string]any) (map[string]any, error) {
	if code == "" {
		return nil, fmt.Errorf("starlark: empty code")
	}

	// Context-based timeout.
	execCtx, cancel := context.WithTimeout(ctx, e.cfg.Timeout)
	defer cancel()

	// Build the Starlark thread.
	thread := &starlark.Thread{
		Name: "openclaw-script",
		Print: func(_ *starlark.Thread, msg string) {
			e.logger.Info("starlark: print", zap.String("msg", msg))
		},
	}

	// Step counter for execution limit.
	steps := 0
	thread.SetMaxExecutionSteps(uint64(e.cfg.MaxSteps))

	// Cancel support: when context is done, cancel the thread.
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-execCtx.Done():
			thread.Cancel("execution timeout exceeded")
		case <-done:
		}
	}()

	// Register built-in functions.
	builtins := e.makeBuiltins()

	// Convert Go input map to Starlark value and add as predeclared.
	inputDict := goMapToStarlark(input)
	predeclared := starlark.StringDict{
		"input":  inputDict,
		"struct": starlark.NewBuiltin("struct", starlarkstruct.Make),
	}
	for k, v := range builtins {
		predeclared[k] = v
	}

	// Execute the code.
	globals, err := starlark.ExecFileOptions(
		&syntax.FileOptions{},
		thread,
		"script.star",
		code,
		predeclared,
	)
	if err != nil {
		if evalErr, ok := err.(*starlark.EvalError); ok {
			return nil, fmt.Errorf("starlark eval error:\n%s", evalErr.Backtrace())
		}
		return nil, fmt.Errorf("starlark execution error: %w", err)
	}
	_ = steps // step counting handled by thread

	// Extract result.
	resultVal, ok := globals["result"]
	if !ok {
		// If there is a `main` function, call it.
		if mainFn, hasMain := globals["main"]; hasMain {
			if fn, ok := mainFn.(*starlark.Function); ok {
				ret, callErr := starlark.Call(thread, fn, nil, nil)
				if callErr != nil {
					return nil, fmt.Errorf("starlark main() call error: %w", callErr)
				}
				resultVal = ret
			}
		}
	}

	if resultVal == nil || resultVal == starlark.None {
		// Collect all globals as result.
		result := make(map[string]any)
		for k, v := range globals {
			if k == "input" || k == "struct" || isBuiltinName(k) {
				continue
			}
			result[k] = starlarkToGo(v)
		}
		return result, nil
	}

	// Convert the result back to Go.
	goResult := starlarkToGo(resultVal)
	switch r := goResult.(type) {
	case map[string]any:
		return r, nil
	default:
		// Wrap non-map results.
		return map[string]any{"result": goResult}, nil
	}
}

// ---------------------------------------------------------------------------
// Built-in function registration
// ---------------------------------------------------------------------------

func (e *Engine) makeBuiltins() map[string]starlark.Value {
	return map[string]starlark.Value{
		"http_get":   starlark.NewBuiltin("http_get", e.builtinHTTPGet),
		"http_post":  starlark.NewBuiltin("http_post", e.builtinHTTPPost),
		"log_info":   starlark.NewBuiltin("log_info", e.builtinLogInfo),
		"log_error":  starlark.NewBuiltin("log_error", e.builtinLogError),
		"json_parse": starlark.NewBuiltin("json_parse", e.builtinJSONParse),
		"json_dumps": starlark.NewBuiltin("json_dumps", e.builtinJSONDumps),
		"env_get":    starlark.NewBuiltin("env_get", e.builtinEnvGet),
	}
}

func isBuiltinName(name string) bool {
	switch name {
	case "http_get", "http_post", "log_info", "log_error",
		"json_parse", "json_dumps", "env_get":
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Built-in: http_get(url, headers={})
// ---------------------------------------------------------------------------

func (e *Engine) builtinHTTPGet(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var urlStr starlark.String
	if err := starlark.UnpackPositionalArgs("http_get", args, kwargs, 1, &urlStr); err != nil {
		return nil, err
	}

	headers := make(map[string]string)
	for _, kv := range kwargs {
		if string(kv[0].(starlark.String)) == "headers" {
			dict, ok := kv[1].(*starlark.Dict)
			if ok {
				headers = starlarkDictToStringMap(dict)
			}
		}
	}

	req, err := http.NewRequest(http.MethodGet, string(urlStr), nil)
	if err != nil {
		return nil, fmt.Errorf("http_get: %w", err)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http_get: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("http_get: read body: %w", err)
	}

	result := starlark.NewDict(3)
	result.SetKey(starlark.String("status_code"), starlark.MakeInt(resp.StatusCode))
	result.SetKey(starlark.String("body"), starlark.String(string(body)))
	result.SetKey(starlark.String("ok"), starlark.Bool(resp.StatusCode >= 200 && resp.StatusCode < 300))

	return result, nil
}

// ---------------------------------------------------------------------------
// Built-in: http_post(url, body, headers={})
// ---------------------------------------------------------------------------

func (e *Engine) builtinHTTPPost(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var urlStr starlark.String
	var bodyVal starlark.Value
	if err := starlark.UnpackPositionalArgs("http_post", args, kwargs, 2, &urlStr, &bodyVal); err != nil {
		return nil, err
	}

	headers := make(map[string]string)
	for _, kv := range kwargs {
		if string(kv[0].(starlark.String)) == "headers" {
			dict, ok := kv[1].(*starlark.Dict)
			if ok {
				headers = starlarkDictToStringMap(dict)
			}
		}
	}

	// Convert body to JSON string if it is not already a string.
	var bodyStr string
	switch v := bodyVal.(type) {
	case starlark.String:
		bodyStr = string(v)
	default:
		goBody := starlarkToGo(bodyVal)
		bodyBytes, err := json.Marshal(goBody)
		if err != nil {
			return nil, fmt.Errorf("http_post: marshal body: %w", err)
		}
		bodyStr = string(bodyBytes)
	}

	req, err := http.NewRequest(http.MethodPost, string(urlStr), bytes.NewReader([]byte(bodyStr)))
	if err != nil {
		return nil, fmt.Errorf("http_post: %w", err)
	}
	if _, ok := headers["Content-Type"]; !ok {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http_post: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("http_post: read body: %w", err)
	}

	result := starlark.NewDict(3)
	result.SetKey(starlark.String("status_code"), starlark.MakeInt(resp.StatusCode))
	result.SetKey(starlark.String("body"), starlark.String(string(body)))
	result.SetKey(starlark.String("ok"), starlark.Bool(resp.StatusCode >= 200 && resp.StatusCode < 300))

	return result, nil
}

// ---------------------------------------------------------------------------
// Built-in: log_info(msg)
// ---------------------------------------------------------------------------

func (e *Engine) builtinLogInfo(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var msg starlark.String
	if err := starlark.UnpackPositionalArgs("log_info", args, kwargs, 1, &msg); err != nil {
		return nil, err
	}
	e.logger.Info("starlark: user log", zap.String("msg", string(msg)))
	return starlark.None, nil
}

// ---------------------------------------------------------------------------
// Built-in: log_error(msg)
// ---------------------------------------------------------------------------

func (e *Engine) builtinLogError(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var msg starlark.String
	if err := starlark.UnpackPositionalArgs("log_error", args, kwargs, 1, &msg); err != nil {
		return nil, err
	}
	e.logger.Error("starlark: user log", zap.String("msg", string(msg)))
	return starlark.None, nil
}

// ---------------------------------------------------------------------------
// Built-in: json_parse(s) -> value
// ---------------------------------------------------------------------------

func (e *Engine) builtinJSONParse(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var s starlark.String
	if err := starlark.UnpackPositionalArgs("json_parse", args, kwargs, 1, &s); err != nil {
		return nil, err
	}

	var val any
	if err := json.Unmarshal([]byte(string(s)), &val); err != nil {
		return nil, fmt.Errorf("json_parse: %w", err)
	}
	return goToStarlark(val), nil
}

// ---------------------------------------------------------------------------
// Built-in: json_dumps(obj) -> string
// ---------------------------------------------------------------------------

func (e *Engine) builtinJSONDumps(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var val starlark.Value
	if err := starlark.UnpackPositionalArgs("json_dumps", args, kwargs, 1, &val); err != nil {
		return nil, err
	}

	goVal := starlarkToGo(val)
	b, err := json.Marshal(goVal)
	if err != nil {
		return nil, fmt.Errorf("json_dumps: %w", err)
	}
	return starlark.String(string(b)), nil
}

// ---------------------------------------------------------------------------
// Built-in: env_get(key) -> string
// ---------------------------------------------------------------------------

func (e *Engine) builtinEnvGet(
	_ *starlark.Thread,
	_ *starlark.Builtin,
	args starlark.Tuple,
	kwargs []starlark.Tuple,
) (starlark.Value, error) {
	var key starlark.String
	if err := starlark.UnpackPositionalArgs("env_get", args, kwargs, 1, &key); err != nil {
		return nil, err
	}
	val := os.Getenv(string(key))
	return starlark.String(val), nil
}

// ---------------------------------------------------------------------------
// Go <-> Starlark type conversion
// ---------------------------------------------------------------------------

// goToStarlark converts a Go value (typically from JSON unmarshalling) to a
// Starlark value.
func goToStarlark(v any) starlark.Value {
	if v == nil {
		return starlark.None
	}
	switch val := v.(type) {
	case bool:
		return starlark.Bool(val)
	case int:
		return starlark.MakeInt(val)
	case int64:
		return starlark.MakeInt64(val)
	case float64:
		// Check if it's actually an integer value.
		if val == float64(int64(val)) {
			return starlark.MakeInt64(int64(val))
		}
		return starlark.Float(val)
	case json.Number:
		if i, err := val.Int64(); err == nil {
			return starlark.MakeInt64(i)
		}
		if f, err := val.Float64(); err == nil {
			return starlark.Float(f)
		}
		return starlark.String(val.String())
	case string:
		return starlark.String(val)
	case []any:
		list := make([]starlark.Value, len(val))
		for i, elem := range val {
			list[i] = goToStarlark(elem)
		}
		return starlark.NewList(list)
	case map[string]any:
		d := starlark.NewDict(len(val))
		for k, elem := range val {
			_ = d.SetKey(starlark.String(k), goToStarlark(elem))
		}
		return d
	default:
		// Fallback: convert to string representation.
		return starlark.String(fmt.Sprintf("%v", val))
	}
}

// goMapToStarlark converts a Go map to a Starlark Dict.
func goMapToStarlark(m map[string]any) *starlark.Dict {
	d := starlark.NewDict(len(m))
	for k, v := range m {
		_ = d.SetKey(starlark.String(k), goToStarlark(v))
	}
	return d
}

// starlarkToGo converts a Starlark value to a Go value.
func starlarkToGo(v starlark.Value) any {
	if v == nil || v == starlark.None {
		return nil
	}
	switch val := v.(type) {
	case starlark.Bool:
		return bool(val)
	case starlark.Int:
		if i, ok := val.Int64(); ok {
			return i
		}
		if u, ok := val.Uint64(); ok {
			return u
		}
		// Fall back to string for very large integers.
		return val.String()
	case starlark.Float:
		return float64(val)
	case starlark.String:
		return string(val)
	case *starlark.List:
		result := make([]any, val.Len())
		for i := 0; i < val.Len(); i++ {
			result[i] = starlarkToGo(val.Index(i))
		}
		return result
	case *starlark.Tuple:
		result := make([]any, val.Len())
		for i := 0; i < val.Len(); i++ {
			result[i] = starlarkToGo(val.Index(i))
		}
		return result
	case *starlark.Dict:
		result := make(map[string]any)
		for _, item := range val.Items() {
			if len(item) == 2 {
				key := starlarkToGoString(item[0])
				result[key] = starlarkToGo(item[1])
			}
		}
		return result
	case *starlark.Set:
		result := make([]any, 0, val.Len())
		for elem := range val.Elements() {
			result = append(result, starlarkToGo(elem))
		}
		return result
	case starlark.NoneType:
		return nil
	default:
		// Fallback: try string conversion.
		return v.String()
	}
}

// starlarkToGoString extracts a string key from a Starlark value.
func starlarkToGoString(v starlark.Value) string {
	switch val := v.(type) {
	case starlark.String:
		return string(val)
	default:
		return v.String()
	}
}

// starlarkDictToStringMap converts a Starlark Dict with string keys/values
// to a Go map[string]string.
func starlarkDictToStringMap(d *starlark.Dict) map[string]string {
	result := make(map[string]string)
	for _, item := range d.Items() {
		if len(item) == 2 {
			key := starlarkToGoString(item[0])
			val := starlarkToGoString(item[1])
			result[key] = val
		}
	}
	return result
}
