package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/lib/pq"
	"github.com/takuchan/onlysns/internal/ai"
	"github.com/takuchan/onlysns/internal/handler"
	"github.com/takuchan/onlysns/internal/repository/postgres"
	"github.com/takuchan/onlysns/internal/usecase"
	"github.com/takuchan/onlysns/internal/worker"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://onlysns:onlysns_secret@localhost:5432/onlysns?sslmode=disable"
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}

	// Run migrations (idempotent via IF NOT EXISTS)
	migration, err := os.ReadFile("db/migrations/001_initial.sql")
	if err != nil {
		log.Fatalf("failed to read migration file: %v", err)
	}
	if _, err := db.Exec(string(migration)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	log.Println("migrations applied")

	if migration2, err := os.ReadFile("db/migrations/002_comments.sql"); err == nil {
		if _, err := db.Exec(string(migration2)); err != nil {
			log.Fatalf("failed to run migration 002: %v", err)
		}
		log.Println("migration 002 applied")
	}

	// Ensure uploads directory exists
	if err := os.MkdirAll("./uploads", 0755); err != nil {
		log.Fatalf("failed to create uploads directory: %v", err)
	}

	postRepo := postgres.NewPostRepository(db)
	postUsecase := usecase.NewPostUsecase(postRepo)
	postHandler := handler.NewPostHandler(postUsecase)

	aiSvc := ai.NewService()
	aiHandler := handler.NewAIHandler(aiSvc)
	analyzeHandler := handler.NewAnalyzeHandler()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	engWorker := worker.NewEngagementWorker(postRepo)
	engWorker.Start(ctx)

	motivatorWorker := worker.NewMotivatorWorker(postRepo, aiSvc)
	motivatorWorker.Start(ctx)

	// Graceful shutdown on SIGINT/SIGTERM
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("shutting down server...")
		cancel()
	}()

	r := handler.SetupRouter(postHandler, aiHandler, analyzeHandler)
	log.Println("starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

