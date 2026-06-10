package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/pkg/auth"
	"github.com/openclaw/openclaw/internal/pkg/response"
)

type contextKey string

const (
	ContextKeyClaims    contextKey = "claims"
	ContextKeyRequestID contextKey = "request_id"
)

func AuthMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.Error(w, http.StatusUnauthorized, "invalid authorization format")
				return
			}
			claims, err := auth.ValidateToken(parts[1], secret)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			ctx := context.WithValue(r.Context(), ContextKeyClaims, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// CombinedAuthMiddleware accepts tokens signed with either user or admin secret.
func CombinedAuthMiddleware(userSecret, adminSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.Error(w, http.StatusUnauthorized, "invalid authorization format")
				return
			}
			token := parts[1]
			claims, err := auth.ValidateToken(token, userSecret)
			if err != nil {
				claims, err = auth.ValidateToken(token, adminSecret)
				if err != nil {
					response.Error(w, http.StatusUnauthorized, "invalid or expired token")
					return
				}
			}
			ctx := context.WithValue(r.Context(), ContextKeyClaims, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				response.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				response.Error(w, http.StatusUnauthorized, "invalid authorization format")
				return
			}
			claims, err := auth.ValidateToken(parts[1], secret)
			if err != nil {
				response.Error(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			if !claims.IsAdmin {
				response.Error(w, http.StatusForbidden, "admin access required")
				return
			}
			ctx := context.WithValue(r.Context(), ContextKeyClaims, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := uuid.New()
		ctx := context.WithValue(r.Context(), ContextKeyRequestID, reqID)
		w.Header().Set("X-Request-ID", reqID.String())
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetClaims(r *http.Request) *auth.Claims {
	claims, _ := r.Context().Value(ContextKeyClaims).(*auth.Claims)
	return claims
}

func GetRequestID(r *http.Request) uuid.UUID {
	id, _ := r.Context().Value(ContextKeyRequestID).(uuid.UUID)
	return id
}
