package worker

import (
	"context"
	"log"
	"math"
	"math/rand"
	"time"

	"github.com/takuchan/onlysns/internal/repository"
)

type EngagementWorker struct {
	repo repository.PostRepository
	rng  *rand.Rand
}

func NewEngagementWorker(repo repository.PostRepository) *EngagementWorker {
	return &EngagementWorker{
		repo: repo,
		rng:  rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

func (w *EngagementWorker) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(8 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("engagement worker: shutting down")
				return
			case <-ticker.C:
				w.run()
			}
		}
	}()
}

func (w *EngagementWorker) run() {
	ctx := context.Background()
	posts, err := w.repo.ListForEngagement(ctx)
	if err != nil {
		log.Printf("engagement worker: failed to list posts: %v", err)
		return
	}

	for _, p := range posts {
		likesIncrement := w.organicStep(p.Likes, p.TargetLikes)
		sharesIncrement := w.organicStep(p.Shares, p.TargetShares)

		newLikes := p.Likes + likesIncrement
		if newLikes > p.TargetLikes {
			newLikes = p.TargetLikes
		}

		newShares := p.Shares + sharesIncrement
		if newShares > p.TargetShares {
			newShares = p.TargetShares
		}

		if err := w.repo.UpdateEngagement(ctx, p.ID, newLikes, newShares); err != nil {
			log.Printf("engagement worker: failed to update post %s: %v", p.ID, err)
		}
	}
}

func (w *EngagementWorker) organicStep(current, target int) int {
	remaining := target - current
	if remaining <= 0 {
		return 0
	}

	progress := 0.0
	if target > 0 {
		progress = float64(current) / float64(target)
	}
	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}

	// Bigger jumps early, smaller towards saturation with random bursts.
	curve := math.Pow(1-progress, 1.8)
	minStep := 1 + target/50_000_000
	maxStep := int(float64(remaining)*0.12*curve) + minStep
	if maxStep < minStep {
		maxStep = minStep
	}

	step := minStep
	if maxStep > minStep {
		step += w.rng.Intn(maxStep-minStep+1)
	}

	if w.rng.Float64() < 0.08 {
		step += w.rng.Intn(maxStep + 1)
	}

	if step > remaining {
		step = remaining
	}
	return step
}
