package config

import (
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server ServerConfig `yaml:"server"`
	MySQL  MySQLConfig  `yaml:"mysql"`
	Redis  RedisConfig  `yaml:"redis"`
	JWT    JWTConfig    `yaml:"jwt"`
	Log    LogConfig    `yaml:"log"`
}

type ServerConfig struct {
	Addr string `yaml:"addr"`
	Mode string `yaml:"mode"`
}

type MySQLConfig struct {
	Host         string `yaml:"host"`
	Port         int    `yaml:"port"`
	Username     string `yaml:"username"`
	Password     string `yaml:"password"`
	Database     string `yaml:"database"`
	Charset      string `yaml:"charset"`
	ParseTime    bool   `yaml:"parse_time"`
	Loc          string `yaml:"loc"`
	MaxIdleConns int    `yaml:"max_idle_conns"`
	MaxOpenConns int    `yaml:"max_open_conns"`
}

type RedisConfig struct {
	Addr                   string `yaml:"addr"`
	Password               string `yaml:"password"`
	DB                     int    `yaml:"db"`
	PostDetailTTLSeconds   int    `yaml:"post_detail_ttl_seconds"`
	UserProfileTTLSeconds  int    `yaml:"user_profile_ttl_seconds"`
	PostViewTTLSeconds     int    `yaml:"post_view_ttl_seconds"`
	PostViewFlushThreshold int    `yaml:"post_view_flush_threshold"`
	CommentListTTLSeconds  int    `yaml:"comment_list_ttl_seconds"`
}

type JWTConfig struct {
	Secret       string `yaml:"secret"`
	Issuer       string `yaml:"issuer"`
	ExpiresHours int    `yaml:"expires_hours"`
}

type LogConfig struct {
	Level string `yaml:"level"`
}

func Load(path string) (*Config, error) {
	if path == "" {
		path = os.Getenv("FEEDLAB_CONFIG")
	}
	if path == "" {
		path = "config.yaml"
	}

	body, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(body, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}
	cfg.withDefaults()
	return &cfg, nil
}

func (c *Config) withDefaults() {
	if c.Server.Addr == "" {
		c.Server.Addr = ":8080"
	}
	if c.Server.Mode == "" {
		c.Server.Mode = "debug"
	}
	if c.MySQL.Charset == "" {
		c.MySQL.Charset = "utf8mb4"
	}
	if c.MySQL.Loc == "" {
		c.MySQL.Loc = "Local"
	}
	if c.MySQL.MaxIdleConns == 0 {
		c.MySQL.MaxIdleConns = 10
	}
	if c.MySQL.MaxOpenConns == 0 {
		c.MySQL.MaxOpenConns = 50
	}
	if c.JWT.ExpiresHours == 0 {
		c.JWT.ExpiresHours = 2
	}
	if c.Log.Level == "" {
		c.Log.Level = "info"
	}
	if c.Redis.PostDetailTTLSeconds == 0 {
		c.Redis.PostDetailTTLSeconds = 300
	}
	if c.Redis.UserProfileTTLSeconds == 0 {
		c.Redis.UserProfileTTLSeconds = 600
	}
	if c.Redis.PostViewTTLSeconds == 0 {
		c.Redis.PostViewTTLSeconds = 86400
	}
	if c.Redis.PostViewFlushThreshold == 0 {
		c.Redis.PostViewFlushThreshold = 100
	}
	if c.Redis.CommentListTTLSeconds == 0 {
		c.Redis.CommentListTTLSeconds = 120
	}
}

func (c MySQLConfig) DSN() string {
	loc := url.QueryEscape(c.Loc)
	parseTime := "False"
	if c.ParseTime {
		parseTime = "True"
	}
	return fmt.Sprintf(
		"%s:%s@tcp(%s:%d)/%s?charset=%s&parseTime=%s&loc=%s",
		c.Username,
		c.Password,
		c.Host,
		c.Port,
		c.Database,
		c.Charset,
		parseTime,
		loc,
	)
}
