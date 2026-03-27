package worker

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/takuchan/onlysns/internal/ai"
	"github.com/takuchan/onlysns/internal/domain"
	"github.com/takuchan/onlysns/internal/repository"
)

type MotivatorWorker struct {
	repo     repository.PostRepository
	aiSvc    *ai.Service
	rng      *rand.Rand
	interval time.Duration
}

func NewMotivatorWorker(repo repository.PostRepository, aiSvc *ai.Service) *MotivatorWorker {
	return &MotivatorWorker{
		repo:     repo,
		aiSvc:    aiSvc,
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
		interval: 6 * time.Hour,
	}
}

func (w *MotivatorWorker) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(w.interval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				w.run(ctx)
			}
		}
	}()
}

func (w *MotivatorWorker) run(ctx context.Context) {
	posts, _, err := w.repo.List(ctx, 1, 5)
	if err != nil || len(posts) == 0 {
		return
	}

	post := posts[w.rng.Intn(len(posts))]

	prompt := fmt.Sprintf("アクション映画のヒーローのように、以下の学習投稿に対して日本語でモチベーションを上げる熱いコメントをください（2-3文、絵文字使用可）:\n\n%s", post.Content)

	response, err := w.aiSvc.Generate(ctx, prompt)
	if err != nil {
		log.Printf("motivator worker: AI generate error: %v", err)
		return
	}

	comment := &domain.Comment{
		ID:      uuid.New().String(),
		PostID:  post.ID,
		Content: response,
		IsAI:    true,
	}

	if err := w.repo.AddComment(ctx, comment); err != nil {
		log.Printf("motivator worker: add comment error: %v", err)
	}
}
