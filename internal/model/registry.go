package model

// AllModels returns all model types for auto-migration
func AllModels() []interface{} {
	return []interface{}{
		// Identity
		&User{},
		&AdminAccount{},
		&Organization{},
		&OrganizationMember{},
		// Accounts
		&ChatAccount{},
		&ThirdPartyAccount{},
		// Account Matching
		&AccountMatchResult{},
		&AccountMatchRun{},
		&AccountMatchStrategy{},
		// Token
		&Token{},
		&TokenPermission{},
		&TokenUsageLog{},
		// SKILL
		&Skill{},
		&SkillVersion{},
		&SkillVisibility{},
		&SkillMarketplaceListing{},
		&SkillInstallation{},
		&SkillFavorite{},
		// Agent
		&Agent{},
		&AgentTrigger{},
		&AgentCondition{},
		&AgentAction{},
		&AgentExecution{},
		&AgentExecutionLog{},
		// Model Gateway
		&ModelSource{},
		&ModelPolicy{},
		&ModelPolicyUpstream{},
		&ModelPolicyBinding{},
		&ModelCallLog{},
		// Connector
		&Connector{},
		&ConnectorEvent{},
		// Governance
		&AuditLog{},
		&UsageStat{},
		&DiskQuota{},
		&ApprovalRequest{},
	}
}
