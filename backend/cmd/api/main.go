package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
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

	// Run migrations
	migration, err := os.ReadFile("db/migrations/001_initial.sql")
	if err != nil {
		log.Fatalf("failed to read migration file: %v", err)
	}
	if _, err := db.Exec(string(migration)); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
	log.Println("migrations applied")

	postRepo := postgres.NewPostRepository(db)
	postUsecase := usecase.NewPostUsecase(postRepo)
	postHandler := handler.NewPostHandler(postUsecase)

	engWorker := worker.NewEngagementWorker(postRepo)
	engWorker.Start()

	r := handler.SetupRouter(postHandler)
	log.Println("starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
