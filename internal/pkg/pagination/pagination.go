package pagination

import (
	"net/http"
	"strconv"
)

type Params struct {
	Page     int
	PageSize int
	Search   string
	SortBy   string
	SortOrder string
}

func ParseParams(r *http.Request) Params {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("page_size"))
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	sortOrder := r.URL.Query().Get("sort_order")
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}
	return Params{
		Page:      page,
		PageSize:  pageSize,
		Search:    r.URL.Query().Get("search"),
		SortBy:    r.URL.Query().Get("sort_by"),
		SortOrder: sortOrder,
	}
}

func Offset(page, pageSize int) int {
	return (page - 1) * pageSize
}
