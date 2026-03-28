package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/takuchan/onlysns/internal/domain"
)

type PostgresCharacterStateRepository struct {
	db *sql.DB
}

func NewPostgresCharacterStateRepository(db *sql.DB) *PostgresCharacterStateRepository {
	return &PostgresCharacterStateRepository{db: db}
}

// GetOrCreateUser retrieves or creates a user by ID
func (r *PostgresCharacterStateRepository) GetOrCreateUser(ctx context.Context, userID string) (*domain.User, error) {
	normalizedID := normalizeUserID(userID)
	user := &domain.User{ID: normalizedID}

	// Try to get existing user
	err := r.db.QueryRowContext(ctx,
		"SELECT id, created_at, updated_at FROM users WHERE id = $1",
		normalizedID).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err == nil {
		return user, nil
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Create new user
	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	err = r.db.QueryRowContext(ctx,
		"INSERT INTO users (id, created_at, updated_at) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at",
		normalizedID, now, now).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

func normalizeUserID(userID string) string {
	if userID == "" {
		userID = "default-user"
	}
	if parsed, err := uuid.Parse(userID); err == nil {
		return parsed.String()
	}
	// Deterministically map arbitrary IDs to UUID so UUID-typed PK/FK can be used safely.
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte("onlysns-user:"+userID)).String()
}

// GetCharacterState retrieves the character state for a user
func (r *PostgresCharacterStateRepository) GetCharacterState(ctx context.Context, userID string) (*domain.CharacterState, error) {
	// First, ensure the user exists and get the actual UUID
	user, err := r.GetOrCreateUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get or create user: %w", err)
	}

	state := &domain.CharacterState{UserID: user.ID}

	// Try to get existing character state
	err = r.db.QueryRowContext(ctx,
		`SELECT id, user_id, current_stage, total_posts, total_study_points, base_type, last_updated, created_at
		 FROM character_states WHERE user_id = $1`,
		user.ID).
		Scan(&state.ID, &state.UserID, &state.CurrentStage, &state.TotalPosts,
			&state.TotalStudyPoints, &state.BaseType, &state.LastUpdated, &state.CreatedAt)

	if err == nil {
		return state, nil
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to query character state: %w", err)
	}

	// Create new character state if doesn't exist
	now := time.Now()
	state.CurrentStage = domain.CharacterStageBaby
	state.TotalPosts = 0
	state.TotalStudyPoints = 0
	state.BaseType = domain.CharacterTypeNeutral
	state.LastUpdated = now
	state.CreatedAt = now

	err = r.db.QueryRowContext(ctx,
		`INSERT INTO character_states (user_id, current_stage, total_posts, total_study_points, base_type, last_updated, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, current_stage, total_posts, total_study_points, base_type, last_updated, created_at`,
		user.ID, domain.CharacterStageBaby, 0, 0, domain.CharacterTypeNeutral, now, now).
		Scan(&state.ID, &state.UserID, &state.CurrentStage, &state.TotalPosts,
			&state.TotalStudyPoints, &state.BaseType, &state.LastUpdated, &state.CreatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to create character state: %w", err)
	}
	return state, nil
}

// UpdateCharacterState updates the character state
func (r *PostgresCharacterStateRepository) UpdateCharacterState(ctx context.Context, state *domain.CharacterState) error {
	state.LastUpdated = time.Now()

	result, err := r.db.ExecContext(ctx,
		`UPDATE character_states 
		 SET current_stage = $1, total_posts = $2, total_study_points = $3, base_type = $4, last_updated = $5
		 WHERE user_id = $6`,
		state.CurrentStage, state.TotalPosts, state.TotalStudyPoints, state.BaseType, state.LastUpdated, state.UserID)

	if err != nil {
		return fmt.Errorf("failed to update character state: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("character state not found for user %s", state.UserID)
	}
	return nil
}

// IncrementPostCount increments the post count and study points
func (r *PostgresCharacterStateRepository) IncrementPostCount(ctx context.Context, userID string, points int64) error {
	// First, ensure the user exists and get the actual UUID
	user, err := r.GetOrCreateUser(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get or create user: %w", err)
	}

	now := time.Now()
	_, err = r.db.ExecContext(ctx,
		`UPDATE character_states
		 SET total_posts = total_posts + 1, 
		     total_study_points = total_study_points + $1,
		     last_updated = $2
		 WHERE user_id = $3`,
		points, now, user.ID)

	if err != nil {
		return fmt.Errorf("failed to increment post count: %w", err)
	}
	return nil
}

// GetCharacterStateByID retrieves character state by ID
func (r *PostgresCharacterStateRepository) GetCharacterStateByID(ctx context.Context, id string) (*domain.CharacterState, error) {
	state := &domain.CharacterState{}

	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, current_stage, total_posts, total_study_points, base_type, last_updated, created_at
		 FROM character_states WHERE id = $1`,
		id).
		Scan(&state.ID, &state.UserID, &state.CurrentStage, &state.TotalPosts,
			&state.TotalStudyPoints, &state.BaseType, &state.LastUpdated, &state.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("character state not found")
		}
		return nil, fmt.Errorf("failed to query character state: %w", err)
	}
	return state, nil
}
