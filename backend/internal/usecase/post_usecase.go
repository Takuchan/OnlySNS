package usecase

import (
	"context"
	"math/rand"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/takuchan/onlysns/internal/domain"
	"github.com/takuchan/onlysns/internal/repository"
)

var urlRegex = regexp.MustCompile(`https?://\S+`)

type PostUsecase struct {
	repo repository.PostRepository
}

func NewPostUsecase(repo repository.PostRepository) *PostUsecase {
	return &PostUsecase{repo: repo}
}

func CountChars(content string) int {
	// Remove URLs before counting
	stripped := urlRegex.ReplaceAllString(content, "")
	count := 0
	for _, r := range stripped {
		if isDoubleWidthChar(r) {
			count += 2
		} else if !unicode.IsControl(r) {
			count++
		}
	}
	return count
}

func isDoubleWidthChar(r rune) bool {
	return (r >= 0x3000 && r <= 0x9FFF) ||
		(r >= 0xF900 && r <= 0xFAFF) ||
		(r >= 0xFF01 && r <= 0xFF60) ||
		(r >= 0xFFE0 && r <= 0xFFE6) ||
		(r >= 0x1F300 && r <= 0x1F9FF) ||
		(r >= 0x20000 && r <= 0x2A6DF)
}

type CreatePostInput struct {
	Content    string
	Code       string
	Language   string
	MediaItems []domain.Media
}

func (u *PostUsecase) CreatePost(ctx context.Context, input CreatePostInput) (*domain.Post, error) {
	charCount := CountChars(input.Content)

	post := &domain.Post{
		ID:           uuid.New().String(),
		Content:      input.Content,
		CharCount:    charCount,
		Likes:        0,
		Shares:       0,
		TargetLikes:  rand.Intn(9951) + 50,  // 50 to 10000
		TargetShares: rand.Intn(4991) + 10,  // 10 to 5000
		Media:        []domain.Media{},
		CodeSnippets: []domain.CodeSnippet{},
	}

	for _, m := range input.MediaItems {
		m.PostID = post.ID
		post.Media = append(post.Media, m)
	}

	if input.Code != "" {
		lines := strings.Split(input.Code, "\n")
		lineCount := len(lines)
		cs := domain.CodeSnippet{
			ID:        uuid.New().String(),
			PostID:    post.ID,
			Code:      input.Code,
			Language:  input.Language,
			LineCount: lineCount,
			CreatedAt: time.Now(),
		}
		post.CodeSnippets = append(post.CodeSnippets, cs)
	}

	if err := u.repo.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (u *PostUsecase) ListPosts(ctx context.Context, page, limit int) ([]*domain.Post, int, error) {
	return u.repo.List(ctx, page, limit)
}

func (u *PostUsecase) DeletePost(ctx context.Context, id string) error {
	return u.repo.Delete(ctx, id)
}

func (u *PostUsecase) ListForExport(ctx context.Context, from, to *time.Time) ([]*domain.Post, error) {
	return u.repo.ListForExport(ctx, from, to)
}

func (u *PostUsecase) LikePost(ctx context.Context, id string) (int, error) {
	return u.repo.LikePost(ctx, id)
}

func (u *PostUsecase) SearchPosts(ctx context.Context, keyword string, from, to *time.Time, page, limit int) ([]*domain.Post, int, error) {
	return u.repo.Search(ctx, keyword, from, to, page, limit)
}

func (u *PostUsecase) GetDailyActivity(ctx context.Context, days int) ([]domain.DailyActivity, error) {
	return u.repo.GetDailyActivity(ctx, days)
}

func (u *PostUsecase) UnlikePost(ctx context.Context, id string) (int, error) {
	return u.repo.UnlikePost(ctx, id)
}

func (u *PostUsecase) AddComment(ctx context.Context, comment *domain.Comment) error {
	return u.repo.AddComment(ctx, comment)
}

func (u *PostUsecase) GetComments(ctx context.Context, postID string) ([]domain.Comment, error) {
	return u.repo.GetCommentsByPostID(ctx, postID)
}
