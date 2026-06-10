package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Auth     AuthConfig     `mapstructure:"auth"`
	Gateway  GatewayConfig  `mapstructure:"gateway"`
	Agent    AgentConfig    `mapstructure:"agent"`
	Matcher  MatcherConfig  `mapstructure:"matcher"`
	Starlark StarlarkConfig `mapstructure:"starlark"`
	Logging  LoggingConfig  `mapstructure:"logging"`
	K8s      K8sConfig      `mapstructure:"k8s"`
}

type ServerConfig struct {
	Port         int           `mapstructure:"port"`
	Host         string        `mapstructure:"host"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
	Driver       string `mapstructure:"driver"`
	DSN          string `mapstructure:"dsn"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	AutoMigrate  bool   `mapstructure:"auto_migrate"`
}

type AuthConfig struct {
	UserJWTSecret   string        `mapstructure:"user_jwt_secret"`
	AdminJWTSecret  string        `mapstructure:"admin_jwt_secret"`
	AccessTokenTTL  time.Duration `mapstructure:"access_token_ttl"`
	RefreshTokenTTL time.Duration `mapstructure:"refresh_token_ttl"`
}

type GatewayConfig struct {
	HealthCheckInterval     time.Duration `mapstructure:"health_check_interval"`
	DefaultTimeout          time.Duration `mapstructure:"default_timeout"`
	CircuitBreakerThreshold int           `mapstructure:"circuit_breaker_threshold"`
	CircuitBreakerTimeout   time.Duration `mapstructure:"circuit_breaker_timeout"`
}

type AgentConfig struct {
	WorkerPoolSize    int    `mapstructure:"worker_pool_size"`
	MaxRecursionDepth int    `mapstructure:"max_recursion_depth"`
	CronTimezone      string `mapstructure:"cron_timezone"`
}

type MatcherConfig struct {
	RunInterval      time.Duration `mapstructure:"run_interval"`
	AutoThreshold    float64       `mapstructure:"auto_threshold"`
	PendingThreshold float64       `mapstructure:"pending_threshold"`
}

type StarlarkConfig struct {
	MaxSteps    int           `mapstructure:"max_steps"`
	MaxMemoryMB int           `mapstructure:"max_memory_mb"`
	Timeout     time.Duration `mapstructure:"timeout"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

type K8sConfig struct {
	Namespace string `mapstructure:"namespace"`
	InCluster bool   `mapstructure:"in_cluster"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")
	viper.SetEnvPrefix("OC")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, err
		}
	}

	cfg := &Config{}
	if err := viper.Unmarshal(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
