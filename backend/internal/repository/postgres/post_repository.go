package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/takuchan/onlysns/internal/domain"
)

type postRepository struct {
	db *sql.DB
}

func NewPostRepository(db *sql.DB) *postRepository {
	return &postRepository{db: db}
}

func (r *postRepository) Create(ctx context.Context, post *domain.Post) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = tx.QueryRowContext(ctx,
		`INSERT INTO posts (id, content, char_count, likes, shares, target_likes, target_shares)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING created_at, updated_at`,
		post.ID, post.Content, post.CharCount, post.Likes, post.Shares, post.TargetLikes, post.TargetShares,
	).Scan(&post.CreatedAt, &post.UpdatedAt)
	if err != nil {
		return err
	}

	for i := range post.Media {
		m := &post.Media[i]
		err = tx.QueryRowContext(ctx,
			`INSERT INTO media (id, post_id, url, media_type) VALUES ($1, $2, $3, $4) RETURNING created_at`,
			m.ID, m.PostID, m.URL, m.MediaType,
		).Scan(&m.CreatedAt)
		if err != nil {
			return err
		}
	}

	for i := range post.CodeSnippets {
		cs := &post.CodeSnippets[i]
		err = tx.QueryRowContext(ctx,
			`INSERT INTO code_snippets (id, post_id, code, language, line_count) VALUES ($1, $2, $3, $4, $5) RETURNING created_at`,
			cs.ID, cs.PostID, cs.Code, cs.Language, cs.LineCount,
		).Scan(&cs.CreatedAt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *postRepository) List(ctx context.Context, page, limit int) ([]*domain.Post, int, error) {
	offset := (page - 1) * limit

	var total int
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM posts`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.db.QueryContext(ctx,
		`SELECT id, content, char_count, created_at, updated_at, likes, shares, target_likes, target_shares
		 FROM posts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var posts []*domain.Post
	for rows.Next() {
		p := &domain.Post{}
		if err := rows.Scan(&p.ID, &p.Content, &p.CharCount, &p.CreatedAt, &p.UpdatedAt,
			&p.Likes, &p.Shares, &p.TargetLikes, &p.TargetShares); err != nil {
			return nil, 0, err
		}
		p.Media = []domain.Media{}
		p.CodeSnippets = []domain.CodeSnippet{}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	for _, p := range posts {
		if err := r.loadMedia(ctx, p); err != nil {
			return nil, 0, err
		}
		if err := r.loadCodeSnippets(ctx, p); err != nil {
			return nil, 0, err
		}
	}

	if posts == nil {
		posts = []*domain.Post{}
	}
	return posts, total, nil
}

func (r *postRepository) GetByID(ctx context.Context, id string) (*domain.Post, error) {
	p := &domain.Post{}
	err := r.db.QueryRowContext(ctx,
		`SELECT id, content, char_count, created_at, updated_at, likes, shares, target_likes, target_shares
		 FROM posts WHERE id = $1`, id,
	).Scan(&p.ID, &p.Content, &p.CharCount, &p.CreatedAt, &p.UpdatedAt,
		&p.Likes, &p.Shares, &p.TargetLikes, &p.TargetShares)
	if err != nil {
		return nil, err
	}
	p.Media = []domain.Media{}
	p.CodeSnippets = []domain.CodeSnippet{}
	if err := r.loadMedia(ctx, p); err != nil {
		return nil, err
	}
	if err := r.loadCodeSnippets(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (r *postRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM posts WHERE id = $1`, id)
	return err
}

func (r *postRepository) ListForExport(ctx context.Context, from, to *time.Time) ([]*domain.Post, error) {
	query := `SELECT id, content, char_count, created_at, updated_at, likes, shares, target_likes, target_shares FROM posts`
	args := []interface{}{}

	if from != nil && to != nil {
		query += ` WHERE created_at >= $1 AND created_at <= $2`
		args = append(args, from, to)
	} else if from != nil {
		query += ` WHERE created_at >= $1`
		args = append(args, from)
	} else if to != nil {
		query += ` WHERE created_at <= $1`
		args = append(args, to)
	}
	query += ` ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*domain.Post
	for rows.Next() {
		p := &domain.Post{}
		if err := rows.Scan(&p.ID, &p.Content, &p.CharCount, &p.CreatedAt, &p.UpdatedAt,
			&p.Likes, &p.Shares, &p.TargetLikes, &p.TargetShares); err != nil {
			return nil, err
		}
		p.Media = []domain.Media{}
		p.CodeSnippets = []domain.CodeSnippet{}
		posts = append(posts, p)
	}
	if posts == nil {
		posts = []*domain.Post{}
	}
	return posts, rows.Err()
}

func (r *postRepository) ListForEngagement(ctx context.Context) ([]*domain.Post, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, content, char_count, created_at, updated_at, likes, shares, target_likes, target_shares
		 FROM posts WHERE likes < target_likes OR shares < target_shares`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*domain.Post
	for rows.Next() {
		p := &domain.Post{}
		if err := rows.Scan(&p.ID, &p.Content, &p.CharCount, &p.CreatedAt, &p.UpdatedAt,
			&p.Likes, &p.Shares, &p.TargetLikes, &p.TargetShares); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (r *postRepository) UpdateEngagement(ctx context.Context, id string, likes, shares int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE posts SET likes=$1, shares=$2, updated_at=NOW() WHERE id=$3`,
		likes, shares, id,
	)
	return err
}

func (r *postRepository) loadMedia(ctx context.Context, p *domain.Post) error {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, post_id, url, media_type, created_at FROM media WHERE post_id = $1`, p.ID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		m := domain.Media{}
		if err := rows.Scan(&m.ID, &m.PostID, &m.URL, &m.MediaType, &m.CreatedAt); err != nil {
			return err
		}
		p.Media = append(p.Media, m)
	}
	return rows.Err()
}

func (r *postRepository) loadCodeSnippets(ctx context.Context, p *domain.Post) error {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, post_id, code, language, line_count, created_at FROM code_snippets WHERE post_id = $1`, p.ID,
	)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		cs := domain.CodeSnippet{}
		if err := rows.Scan(&cs.ID, &cs.PostID, &cs.Code, &cs.Language, &cs.LineCount, &cs.CreatedAt); err != nil {
			return err
		}
		p.CodeSnippets = append(p.CodeSnippets, cs)
	}
	return rows.Err()
}
