package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/openclaw/openclaw/internal/agent"
	"github.com/openclaw/openclaw/internal/config"
	"github.com/openclaw/openclaw/internal/gateway"
	"github.com/openclaw/openclaw/internal/handler"
	"github.com/openclaw/openclaw/internal/matcher"
	"github.com/openclaw/openclaw/internal/pkg/crypto"
	"github.com/openclaw/openclaw/internal/repository"
	"github.com/openclaw/openclaw/internal/service"
	"github.com/openclaw/openclaw/internal/starlark"
	"go.uber.org/zap"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Init logger
	var logger *zap.Logger
	if cfg.Logging.Level == "debug" {
		logger, err = zap.NewDevelopment()
	} else {
		logger, err = zap.NewProduction()
	}
	if err != nil {
		log.Fatalf("Failed to init logger: %v", err)
	}
	defer logger.Sync()

	// Init crypto
	crypto.Init(cfg.Auth.AdminJWTSecret)

	// Init database
	db, err := repository.NewDatabase(
		cfg.Database.Driver,
		cfg.Database.DSN,
		cfg.Database.MaxOpenConns,
		cfg.Database.MaxIdleConns,
		cfg.Database.AutoMigrate,
	)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	logger.Info("Database connected", zap.String("driver", cfg.Database.Driver))

	// Init repositories
	userRepo := repository.NewUserRepository(db.DB)
	adminRepo := repository.NewAdminRepository(db.DB)
	orgRepo := repository.NewOrganizationRepository(db.DB)
	chatAccountRepo := repository.NewChatAccountRepository(db.DB)
	tpAccountRepo := repository.NewThirdPartyAccountRepository(db.DB)
	matchRepo := repository.NewAccountMatchRepository(db.DB)
	modelSourceRepo := repository.NewModelSourceRepository(db.DB)
	modelPolicyRepo := repository.NewModelPolicyRepository(db.DB)
	modelCallLogRepo := repository.NewModelCallLogRepository(db.DB)
	connectorRepo := repository.NewConnectorRepository(db.DB)
	tokenRepo := repository.NewTokenRepository(db.DB)
	tokenUsageLogRepo := repository.NewTokenUsageLogRepository(db.DB)
	skillRepo := repository.NewSkillRepository(db.DB)
	skillVisRepo := repository.NewSkillVisibilityRepository(db.DB)
	agentRepo := repository.NewAgentRepository(db.DB)
	agentExecRepo := repository.NewAgentExecutionRepository(db.DB)
	auditRepo := repository.NewAuditLogRepository(db.DB)
	usageRepo := repository.NewUsageStatRepository(db.DB)
	quotaRepo := repository.NewDiskQuotaRepository(db.DB)
	approvalRepo := repository.NewApprovalRepository(db.DB)

	// Init services
	authSvc := service.NewAuthService(userRepo, adminRepo, &cfg.Auth)
	userSvc := service.NewUserService(userRepo, orgRepo)
	orgSvc := service.NewOrganizationService(orgRepo)
	modelSourceSvc := service.NewModelSourceService(modelSourceRepo)
	modelPolicySvc := service.NewModelPolicyService(modelPolicyRepo)
	connectorSvc := service.NewConnectorService(connectorRepo)
	tokenSvc := service.NewTokenService(tokenRepo)
	skillSvc := service.NewSkillService(skillRepo, skillVisRepo)
	agentSvc := service.NewAgentService(agentRepo, agentExecRepo)
	matchSvc := service.NewAccountMatchService(chatAccountRepo, tpAccountRepo, matchRepo)
	auditSvc := service.NewAuditService(auditRepo)
	statsSvc := service.NewStatsService(usageRepo, modelCallLogRepo)
	approvalSvc := service.NewApprovalService(approvalRepo)
	quotaSvc := service.NewQuotaService(quotaRepo)

	// Seed default admin
	if err := authSvc.SeedAdmin(); err != nil {
		logger.Warn("Failed to seed admin", zap.Error(err))
	}

	// Init engines
	gw := gateway.New(db.DB, logger)
	starlarkEngine := starlark.New(starlark.Config{
		Timeout:  30 * time.Second,
		MaxSteps: 100000,
	}, logger)
	agentEngine := agent.New(db.DB, logger, gw, starlarkEngine)
	accountMatcher := matcher.New(db.DB, logger)

	_ = tokenUsageLogRepo

	// Init handler
	h := &handler.Handler{
		Auth:        authSvc,
		User:        userSvc,
		Org:         orgSvc,
		ModelSource: modelSourceSvc,
		ModelPolicy: modelPolicySvc,
		Connector:   connectorSvc,
		Token:       tokenSvc,
		Skill:       skillSvc,
		Agent:       agentSvc,
		Match:       matchSvc,
		Audit:       auditSvc,
		Stats:       statsSvc,
		Approval:    approvalSvc,
		Quota:       quotaSvc,
		Config:      cfg,
		Gateway:     gw,
		AgentEngine: agentEngine,
		Matcher:     accountMatcher,
		Starlark:    starlarkEngine,
	}

	// Init router
	router := handler.NewRouter(h, logger)

	// Start server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		logger.Info("Shutting down server...")
		srv.Close()
	}()

	logger.Info("Server starting", zap.String("addr", addr))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("Server failed", zap.Error(err))
	}
	logger.Info("Server stopped")
}
