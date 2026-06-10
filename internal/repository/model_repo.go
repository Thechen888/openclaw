package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/openclaw/openclaw/internal/model"
	"gorm.io/gorm"
)

// --- Model Source Repository ---
type ModelSourceRepository struct{ db *gorm.DB }

func NewModelSourceRepository(db *gorm.DB) *ModelSourceRepository {
	return &ModelSourceRepository{db: db}
}

func (r *ModelSourceRepository) Create(m *model.ModelSource) error { return r.db.Create(m).Error }
func (r *ModelSourceRepository) GetByID(id uuid.UUID) (*model.ModelSource, error) {
	var m model.ModelSource
	err := r.db.Where("id = ?", id).First(&m).Error
	return &m, err
}
func (r *ModelSourceRepository) List(page, pageSize int, search string) ([]model.ModelSource, int64, error) {
	var items []model.ModelSource
	var total int64
	q := r.db.Model(&model.ModelSource{})
	if search != "" {
		q = q.Where("display_name LIKE ? OR provider LIKE ? OR model_name LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ModelSourceRepository) Update(m *model.ModelSource) error { return r.db.Save(m).Error }
func (r *ModelSourceRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ModelSource{}, "id = ?", id).Error
}
func (r *ModelSourceRepository) UpdateHealth(id uuid.UUID, status string) error {
	return r.db.Model(&model.ModelSource{}).Where("id = ?", id).Updates(map[string]interface{}{
		"health_status": status, "last_health_check": time.Now(),
	}).Error
}

// --- Model Policy Repository ---
type ModelPolicyRepository struct{ db *gorm.DB }

func NewModelPolicyRepository(db *gorm.DB) *ModelPolicyRepository {
	return &ModelPolicyRepository{db: db}
}

func (r *ModelPolicyRepository) Create(p *model.ModelPolicy) error { return r.db.Create(p).Error }
func (r *ModelPolicyRepository) GetByID(id uuid.UUID) (*model.ModelPolicy, error) {
	var p model.ModelPolicy
	err := r.db.Preload("Upstreams.ModelSource").Preload("Bindings").Where("id = ?", id).First(&p).Error
	return &p, err
}
func (r *ModelPolicyRepository) List(page, pageSize int, search string) ([]model.ModelPolicy, int64, error) {
	var items []model.ModelPolicy
	var total int64
	q := r.db.Model(&model.ModelPolicy{})
	if search != "" {
		q = q.Where("name LIKE ?", "%"+search+"%")
	}
	q.Count(&total)
	err := q.Preload("Upstreams").Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ModelPolicyRepository) Update(p *model.ModelPolicy) error { return r.db.Save(p).Error }
func (r *ModelPolicyRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.ModelPolicy{}, "id = ?", id).Error
}
func (r *ModelPolicyRepository) AddUpstream(u *model.ModelPolicyUpstream) error {
	return r.db.Create(u).Error
}
func (r *ModelPolicyRepository) RemoveUpstream(id uuid.UUID) error {
	return r.db.Delete(&model.ModelPolicyUpstream{}, "id = ?", id).Error
}
func (r *ModelPolicyRepository) AddBinding(b *model.ModelPolicyBinding) error {
	return r.db.Create(b).Error
}
func (r *ModelPolicyRepository) RemoveBinding(id uuid.UUID) error {
	return r.db.Delete(&model.ModelPolicyBinding{}, "id = ?", id).Error
}

// --- Model Call Log Repository ---
type ModelCallLogRepository struct{ db *gorm.DB }

func NewModelCallLogRepository(db *gorm.DB) *ModelCallLogRepository {
	return &ModelCallLogRepository{db: db}
}

func (r *ModelCallLogRepository) Create(log *model.ModelCallLog) error { return r.db.Create(log).Error }
func (r *ModelCallLogRepository) List(page, pageSize int, policyID, sourceID *uuid.UUID, startTime *time.Time) ([]model.ModelCallLog, int64, error) {
	var items []model.ModelCallLog
	var total int64
	q := r.db.Model(&model.ModelCallLog{})
	if policyID != nil {
		q = q.Where("policy_id = ?", *policyID)
	}
	if sourceID != nil {
		q = q.Where("model_source_id = ?", *sourceID)
	}
	if startTime != nil {
		q = q.Where("created_at >= ?", *startTime)
	}
	q.Count(&total)
	err := q.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&items).Error
	return items, total, err
}
func (r *ModelCallLogRepository) CostBySource(start, end time.Time) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.db.Model(&model.ModelCallLog{}).
		Select("model_source_id, SUM(cost) as total_cost, SUM(total_tokens) as total_tokens, COUNT(*) as call_count").
		Where("created_at BETWEEN ? AND ?", start, end).
		Group("model_source_id").Scan(&results).Error
	return results, err
}
