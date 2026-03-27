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
		ticker := time.NewTicker(1 * time.Minute)
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
		likesIncrement := w.organicStep(p.CreatedAt, p.Likes, p.TargetLikes)
		sharesIncrement := w.organicStep(p.CreatedAt, p.Shares, p.TargetShares)

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

func (w *EngagementWorker) organicStep(createdAt time.Time, current, target int) int {
	remaining := target - current
	if remaining <= 0 {
		return 0
	}

	age := time.Since(createdAt)
	if age < 0 {
		age = 0
	}
	const growDuration = 24 * time.Hour
	timeRatio := math.Min(age.Seconds()/growDuration.Seconds(), 1)

	// Ease-out curve: faster in middle phase, gentle near start/end.
	progress := 1 - math.Pow(1-timeRatio, 2)
	expected := int(math.Round(float64(target) * progress))
	if expected > target {
		expected = target
	}

	baseStep := expected - current
	if baseStep <= 0 {
		// Tiny random nudge to avoid long flat periods.
		if timeRatio < 1 && w.rng.Float64() < 0.08 {
			baseStep = 1
		} else {
			return 0
		}
	}

	// Cap per-minute jumps to keep growth natural.
	maxPerMinute := max(1, target/600)
	if maxPerMinute > 18 {
		maxPerMinute = 18
	}
	step := min(baseStep, maxPerMinute)

	if step > 1 {
		jitter := w.rng.Intn(step/2 + 1)
		step = max(1, step-jitter)
	}

	if step > remaining {
		step = remaining
	}
	return step
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
