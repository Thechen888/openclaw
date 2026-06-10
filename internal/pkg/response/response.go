package response

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

type Response struct {
	Code       int         `json:"code"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data,omitempty"`
	Pagination *Pagination `json:"pagination,omitempty"`
	RequestID  string      `json:"request_id,omitempty"`
}

type Pagination struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

func Success(w http.ResponseWriter, data interface{}) {
	writeJSON(w, http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

func SuccessWithPagination(w http.ResponseWriter, data interface{}, page, pageSize int, total int64) {
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	writeJSON(w, http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
		Pagination: &Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

func Created(w http.ResponseWriter, data interface{}) {
	writeJSON(w, http.StatusCreated, Response{
		Code:    0,
		Message: "created",
		Data:    data,
	})
}

func Error(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, Response{
		Code:    statusCode,
		Message: message,
	})
}

func ErrorWithDetails(w http.ResponseWriter, statusCode int, message string, details interface{}) {
	writeJSON(w, statusCode, Response{
		Code:    statusCode,
		Message: message,
		Data:    details,
	})
}

func WithRequestID(w http.ResponseWriter, reqID uuid.UUID, statusCode int, resp Response) {
	resp.RequestID = reqID.String()
	writeJSON(w, statusCode, resp)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
