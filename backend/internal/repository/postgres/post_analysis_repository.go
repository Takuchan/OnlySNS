package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/takuchan/onlysns/internal/domain"
)

type PostgresPostAnalysisRepository struct {
	db *sql.DB
}

func NewPostgresPostAnalysisRepository(db *sql.DB) *PostgresPostAnalysisRepository {
	return &PostgresPostAnalysisRepository{db: db}
}

// Create inserts a new post analysis record
func (r *PostgresPostAnalysisRepository) Create(ctx context.Context, analysis *domain.PostAnalysis) error {
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO post_analysis (post_id, category, mood, keywords, analysis_data, created_at)
		 VALUES ($1, $2, $3, $4, $5, NOW())
		 RETURNING id, created_at`,
		analysis.PostID, analysis.Category, analysis.Mood, pq.Array(analysis.Keywords), analysis.AnalysisData).
		Scan(&analysis.ID, &analysis.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create post analysis: %w", err)
	}
	return nil
}

// GetByPostID retrieves the analysis for a specific post
func (r *PostgresPostAnalysisRepository) GetByPostID(ctx context.Context, postID string) (*domain.PostAnalysis, error) {
	analysis := &domain.PostAnalysis{PostID: postID}

	var keywords pq.StringArray
	err := r.db.QueryRowContext(ctx,
		`SELECT id, post_id, category, mood, keywords, analysis_data, created_at
		 FROM post_analysis WHERE post_id = $1`,
		postID).
		Scan(&analysis.ID, &analysis.PostID, &analysis.Category, &analysis.Mood, &keywords, &analysis.AnalysisData, &analysis.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("post analysis not found")
		}
		return nil, fmt.Errorf("failed to query post analysis: %w", err)
	}

	analysis.Keywords = []string(keywords)
	return analysis, nil
}

// Update updates an existing post analysis record
func (r *PostgresPostAnalysisRepository) Update(ctx context.Context, analysis *domain.PostAnalysis) error {
	result, err := r.db.ExecContext(ctx,
		`UPDATE post_analysis
		 SET category = $1, mood = $2, keywords = $3, analysis_data = $4
		 WHERE post_id = $5`,
		analysis.Category, analysis.Mood, pq.Array(analysis.Keywords), analysis.AnalysisData, analysis.PostID)

	if err != nil {
		return fmt.Errorf("failed to update post analysis: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("post analysis not found for post %s", analysis.PostID)
	}
	return nil
}
