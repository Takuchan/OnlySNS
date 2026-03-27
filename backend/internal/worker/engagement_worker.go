package worker

import (
	"context"
	"log"
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
		ticker := time.NewTicker(2 * time.Hour)
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
		likesIncrement := 0
		if p.TargetLikes > p.Likes {
			maxInc := (p.TargetLikes - p.Likes) / 10
			if maxInc < 1 {
				maxInc = 1
			}
			likesIncrement = w.rng.Intn(maxInc) + 1
		}

		sharesIncrement := 0
		if p.TargetShares > p.Shares {
			maxInc := (p.TargetShares - p.Shares) / 10
			if maxInc < 1 {
				maxInc = 1
			}
			sharesIncrement = w.rng.Intn(maxInc) + 1
		}

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
