package errors

import (
	"fmt"
	"net/http"
)

type AppError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error { return e.Err }

func NewNotFound(resource string) *AppError {
	return &AppError{Code: http.StatusNotFound, Message: fmt.Sprintf("%s not found", resource)}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{Code: http.StatusUnauthorized, Message: message}
}

func NewForbidden(message string) *AppError {
	return &AppError{Code: http.StatusForbidden, Message: message}
}

func NewValidation(message string) *AppError {
	return &AppError{Code: http.StatusUnprocessableEntity, Message: message}
}

func NewConflict(message string) *AppError {
	return &AppError{Code: http.StatusConflict, Message: message}
}

func NewTokenPermission(message string) *AppError {
	return &AppError{Code: http.StatusForbidden, Message: message}
}

func NewQuotaExceeded(message string) *AppError {
	return &AppError{Code: http.StatusTooManyRequests, Message: message}
}

func NewCircuitOpen(message string) *AppError {
	return &AppError{Code: http.StatusServiceUnavailable, Message: message}
}

func NewInternal(message string, err error) *AppError {
	return &AppError{Code: http.StatusInternalServerError, Message: message, Err: err}
}

func FromError(err error) *AppError {
	if appErr, ok := err.(*AppError); ok {
		return appErr
	}
	return NewInternal("internal server error", err)
}
