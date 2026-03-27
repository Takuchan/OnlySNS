package usecase

import (
	"context"
	"math"
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
	Tags       []string
	Code       string
	Language   string
	MediaItems []domain.Media
}

func (u *PostUsecase) CreatePost(ctx context.Context, input CreatePostInput) (*domain.Post, error) {
	charCount := CountChars(input.Content)

	post := &domain.Post{
		ID:           uuid.New().String(),
		Content:      input.Content,
		Tags:         normalizeTags(input.Tags),
		CharCount:    charCount,
		Likes:        0,
		Shares:       0,
		TargetLikes:  randomEngagementTarget(),
		TargetShares: randomEngagementTarget(),
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

func (u *PostUsecase) GetPostByID(ctx context.Context, id string) (*domain.Post, error) {
	return u.repo.GetByID(ctx, id)
}

func (u *PostUsecase) ListForExport(ctx context.Context, from, to *time.Time) ([]*domain.Post, error) {
	return u.repo.ListForExport(ctx, from, to)
}

func (u *PostUsecase) LikePost(ctx context.Context, id string) (int, error) {
	return u.repo.LikePost(ctx, id)
}

func (u *PostUsecase) RepostPost(ctx context.Context, id string) (int, error) {
	return u.repo.RepostPost(ctx, id)
}

func (u *PostUsecase) SearchPosts(ctx context.Context, keyword string, from, to *time.Time, page, limit int) ([]*domain.Post, int, error) {
	return u.repo.Search(ctx, keyword, from, to, page, limit)
}

func (u *PostUsecase) GetDailyActivity(ctx context.Context, days int) ([]domain.DailyActivity, error) {
	return u.repo.GetDailyActivity(ctx, days)
}

func randomEngagementTarget() int {
	// Produce huge values with a heavy-tailed distribution so most are large and some are massive.
	const minTarget = 100
	const maxTarget = 500_000_000
	raw := rand.Float64()
	bias := math.Pow(raw, 0.35)
	return minTarget + int(float64(maxTarget-minTarget)*bias)
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return []string{}
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(tags))
	for _, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" {
			continue
		}
		if !strings.HasPrefix(trimmed, "#") {
			trimmed = "#" + trimmed
		}
		if len([]rune(trimmed)) > 24 {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
		if len(out) >= 8 {
			break
		}
	}
	if out == nil {
		return []string{}
	}
	return out
}
