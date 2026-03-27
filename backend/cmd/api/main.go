package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/takuchan/onlysns/internal/handler"
	"github.com/takuchan/onlysns/internal/repository/postgres"
	"github.com/takuchan/onlysns/internal/service"
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

	// Ensure uploads directory exists
	if err := os.MkdirAll("./uploads", 0755); err != nil {
		log.Fatalf("failed to create uploads directory: %v", err)
	}

	postRepo := postgres.NewPostRepository(db)
	postUsecase := usecase.NewPostUsecase(postRepo)
	ogpService := service.NewOGPService()
	ollamaClient := service.NewOllamaClient(
		os.Getenv("OLLAMA_BASE_URL"),
		os.Getenv("OLLAMA_MODEL"),
		os.Getenv("OLLAMA_EMBEDDING_MODEL"),
	)
	ensureOllamaModels(ollamaClient)
	aiService := service.NewAIService(ollamaClient)
	postHandler := handler.NewPostHandler(postUsecase, ogpService, aiService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	engWorker := worker.NewEngagementWorker(postRepo)
	engWorker.Start(ctx)

	// Graceful shutdown on SIGINT/SIGTERM
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		log.Println("shutting down server...")
		cancel()
	}()

	r := handler.SetupRouter(postHandler)
	log.Println("starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func ensureOllamaModels(client *service.OllamaClient) {
	autoPull := strings.TrimSpace(os.Getenv("OLLAMA_AUTO_PULL"))
	if autoPull == "0" || strings.EqualFold(autoPull, "false") {
		log.Println("ollama model auto-pull disabled")
		return
	}

	models := []string{os.Getenv("OLLAMA_MODEL"), os.Getenv("OLLAMA_EMBEDDING_MODEL")}
	for _, model := range models {
		model = strings.TrimSpace(model)
		if model == "" {
			continue
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		err := client.PullModel(ctx, model)
		cancel()
		if err != nil {
			log.Printf("ollama pull warning (%s): %v", model, err)
			continue
		}
		log.Printf("ollama model ready: %s", model)
	}
}
