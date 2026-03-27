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
}

func NewEngagementWorker(repo repository.PostRepository) *EngagementWorker {
	return &EngagementWorker{repo: repo}
}

func (w *EngagementWorker) Start() {
	go func() {
		ticker := time.NewTicker(2 * time.Hour)
		defer ticker.Stop()
		for {
			select {
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
			likesIncrement = rand.Intn(maxInc) + 1
		}

		sharesIncrement := 0
		if p.TargetShares > p.Shares {
			maxInc := (p.TargetShares - p.Shares) / 10
			if maxInc < 1 {
				maxInc = 1
			}
			sharesIncrement = rand.Intn(maxInc) + 1
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
