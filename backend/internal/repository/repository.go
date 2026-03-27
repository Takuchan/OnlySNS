package repository

import (
	"context"
	"time"

	"github.com/takuchan/onlysns/internal/domain"
)

type PostRepository interface {
	Create(ctx context.Context, post *domain.Post) error
	List(ctx context.Context, page, limit int) ([]*domain.Post, int, error)
	GetByID(ctx context.Context, id string) (*domain.Post, error)
	Delete(ctx context.Context, id string) error
	ListForExport(ctx context.Context, from, to *time.Time) ([]*domain.Post, error)
	ListForEngagement(ctx context.Context) ([]*domain.Post, error)
	UpdateEngagement(ctx context.Context, id string, likes, shares int) error
	LikePost(ctx context.Context, id string) (int, error)
	UnlikePost(ctx context.Context, id string) (int, error)
	Search(ctx context.Context, keyword string, from, to *time.Time, page, limit int) ([]*domain.Post, int, error)
	GetDailyActivity(ctx context.Context, days int) ([]domain.DailyActivity, error)
	AddComment(ctx context.Context, comment *domain.Comment) error
	GetCommentsByPostID(ctx context.Context, postID string) ([]domain.Comment, error)
}
