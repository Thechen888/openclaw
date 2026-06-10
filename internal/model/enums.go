package model

// User status
const (
	UserStatusActive   = "active"
	UserStatusDisabled = "disabled"
	UserStatusDeparted = "departed"
	UserStatusPending  = "pending"
)

// User roles
const (
	RoleAdmin  = "admin"
	RoleMember = "member"
	RoleViewer = "viewer"
)

// Admin roles
const (
	AdminRoleSuper    = "super_admin"
	AdminRolePlatform = "platform_admin"
)

// Organization types
const (
	OrgTypeDepartment = "department"
	OrgTypeTeam       = "team"
	OrgTypeProject    = "project"
	OrgTypeRoleGroup  = "role_group"
)

// Chat types
const (
	ChatTypeWeChatWork = "wechat_work"
	ChatTypeDingTalk   = "dingtalk"
	ChatTypeFeishu     = "feishu"
	ChatTypeSlack      = "slack"
)

// Match status
const (
	MatchStatusMatched    = "matched"
	MatchStatusPending    = "pending"
	MatchStatusConflict   = "conflict"
	MatchStatusUnmatched  = "unmatched"
	MatchStatusOverridden = "overridden"
)

// System types
const (
	SystemTypeCRM    = "crm"
	SystemTypeERP    = "erp"
	SystemTypeTicket = "ticket"
	SystemTypeDevice = "device"
	SystemTypeCustom = "custom"
)

// Token status
const (
	TokenStatusPending  = "pending"
	TokenStatusApproved = "approved"
	TokenStatusActive   = "active"
	TokenStatusRevoked  = "revoked"
	TokenStatusExpired  = "expired"
)

// Token credential types
const (
	CredentialTypeAPIKey      = "api_key"
	CredentialTypeOAuth2      = "oauth2"
	CredentialTypeServiceAcct = "service_account"
	CredentialTypeBearer      = "bearer"
)

// Risk levels
const (
	RiskLevelLow      = "low"
	RiskLevelMedium   = "medium"
	RiskLevelHigh     = "high"
	RiskLevelCritical = "critical"
)

// Owner types
const (
	OwnerTypeUser = "user"
	OwnerTypeOrg  = "organization"
)

// Skill types
const (
	SkillTypeNormal   = "normal"
	SkillTypeAdvanced = "advanced"
)

// Skill categories
const (
	SkillCategoryPrompt   = "prompt"
	SkillCategoryWorkflow = "workflow"
	SkillCategoryTool     = "tool"
	SkillCategoryCode     = "code"
)

// Skill status
const (
	SkillStatusDraft         = "draft"
	SkillStatusPendingReview = "pending_review"
	SkillStatusPublished     = "published"
	SkillStatusDisabled      = "disabled"
	SkillStatusArchived      = "archived"
)

// Agent status
const (
	AgentStatusDraft    = "draft"
	AgentStatusActive   = "active"
	AgentStatusPaused   = "paused"
	AgentStatusError    = "error"
	AgentStatusArchived = "archived"
)

// Trigger types
const (
	TriggerTypeCron       = "cron"
	TriggerTypeEvent      = "event"
	TriggerTypeChatMsg    = "chat_message"
	TriggerTypeWebhook    = "webhook"
	TriggerTypeManual     = "manual"
	TriggerTypeFileChange = "file_change"
)

// Condition types
const (
	ConditionTypeFieldMatch    = "field_match"
	ConditionTypeTimeWindow    = "time_window"
	ConditionTypeStarlark      = "starlark"
	ConditionTypeModelJudgment = "model_judgment"
	ConditionTypeApprovalGate  = "approval_gate"
)

// Action types
const (
	ActionTypeCallModel      = "call_model"
	ActionTypeCallSkill      = "call_skill"
	ActionTypeQueryConnector = "query_connector"
	ActionTypeWriteConnector = "write_connector"
	ActionTypeSendIM         = "send_im"
	ActionTypeCreateTicket   = "create_ticket"
	ActionTypeTriggerAgent   = "trigger_agent"
	ActionTypeWaitApproval   = "wait_approval"
)

// Execution status
const (
	ExecutionStatusRunning         = "running"
	ExecutionStatusCompleted       = "completed"
	ExecutionStatusFailed          = "failed"
	ExecutionStatusCancelled       = "cancelled"
	ExecutionStatusWaitingApproval = "waiting_approval"
)

// Model capabilities
const (
	CapabilityText      = "text"
	CapabilityVision    = "vision"
	CapabilityAudio     = "audio"
	CapabilityEmbedding = "embedding"
)

// Health status
const (
	HealthStatusHealthy   = "healthy"
	HealthStatusDegraded  = "degraded"
	HealthStatusUnhealthy = "unhealthy"
	HealthStatusDisabled  = "disabled"
)

// Model source status
const (
	ModelSourceStatusActive   = "active"
	ModelSourceStatusDisabled = "disabled"
)

// Rotation methods
const (
	RotationWeightedRoundRobin = "weighted_round_robin"
	RotationWeightedRandom     = "weighted_random"
	RotationPriority           = "priority"
)

// Task types
const (
	TaskTypeChat       = "chat"
	TaskTypeSummarize  = "summarize"
	TaskTypeVision     = "vision"
	TaskTypeExtraction = "extraction"
	TaskTypeEmbedding  = "embedding"
	TaskTypeGeneral    = "general"
)

// Auth types
const (
	AuthTypeAPIKey       = "api_key"
	AuthTypeBearer       = "bearer"
	AuthTypeOAuth2       = "oauth2"
	AuthTypeBasic        = "basic"
	AuthTypeCustomHeader = "custom_header"
)

// Connector status
const (
	ConnectorStatusActive   = "active"
	ConnectorStatusDisabled = "disabled"
	ConnectorStatusError    = "error"
)

// Event source types
const (
	EventSourceWebhook = "webhook"
	EventSourcePolling = "polling"
	EventSourceManual  = "manual"
)

// Approval types
const (
	ApprovalTypeToken         = "token"
	ApprovalTypeSkillReview   = "skill_review"
	ApprovalTypeQuotaIncrease = "quota_increase"
)

// Approval status
const (
	ApprovalStatusPending   = "pending"
	ApprovalStatusApproved  = "approved"
	ApprovalStatusRejected  = "rejected"
	ApprovalStatusCancelled = "cancelled"
)

// Audit outcomes
const (
	AuditOutcomeSuccess = "success"
	AuditOutcomeFailure = "failure"
	AuditOutcomeDenied  = "denied"
)

// Period types
const (
	PeriodTypeHour  = "hour"
	PeriodTypeDay   = "day"
	PeriodTypeMonth = "month"
)

// Dimension types
const (
	DimensionTypeUser        = "user"
	DimensionTypeOrg         = "organization"
	DimensionTypeAgent       = "agent"
	DimensionTypeSkill       = "skill"
	DimensionTypeModelSource = "model_source"
	DimensionTypeConnector   = "connector"
	DimensionTypeToken       = "token"
)

// Quota status
const (
	QuotaStatusNormal   = "normal"
	QuotaStatusWarning  = "warning"
	QuotaStatusExceeded = "exceeded"
)

// Marketplace visibility
const (
	VisibilitySelf           = "self"
	VisibilitySpecifiedUsers = "specified_users"
	VisibilitySpecifiedOrgs  = "specified_orgs"
	VisibilityCompanyWide    = "company_wide"
)

// Action failure handling
const (
	OnFailureStop         = "stop"
	OnFailureSkip         = "skip"
	OnFailureRetry        = "retry"
	OnFailureContinue     = "continue"
	OnFailureCircuitBreak = "circuit_break"
	OnFailureNotify       = "notify"
)

// Binding types
const (
	BindingTypeUser     = "user"
	BindingTypeOrg      = "organization"
	BindingTypeAgent    = "agent"
	BindingTypeTaskType = "task_type"
)

// Match trigger types
const (
	MatchTriggerManual    = "manual"
	MatchTriggerScheduled = "scheduled"
	MatchTriggerEvent     = "event"
)

// Principal types
const (
	PrincipalTypeUser   = "user"
	PrincipalTypeAgent  = "agent"
	PrincipalTypeSkill  = "skill"
	PrincipalTypeSystem = "system"
)

// Log levels
const (
	LogLevelNone    = "none"
	LogLevelSummary = "summary"
	LogLevelFull    = "full"
)

// Target types for skill visibility
const (
	TargetTypeUser = "user"
	TargetTypeOrg  = "organization"
	TargetTypeRole = "role"
	TargetTypeAll  = "all"
)
