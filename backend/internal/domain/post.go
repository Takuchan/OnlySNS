package domain

import (
	"time"
)

type MediaType string

const (
	MediaTypeImage MediaType = "image"
	MediaTypeVideo MediaType = "video"
	MediaTypeGIF   MediaType = "gif"
)

type Post struct {
	ID           string        `json:"id"`
	Content      string        `json:"content"`
	CharCount    int           `json:"char_count"`
	CreatedAt    time.Time     `json:"created_at"`
	UpdatedAt    time.Time     `json:"updated_at"`
	Likes        int           `json:"likes"`
	Shares       int           `json:"shares"`
	TargetLikes  int           `json:"target_likes"`
	TargetShares int           `json:"target_shares"`
	Media        []Media       `json:"media"`
	CodeSnippets []CodeSnippet `json:"code_snippets"`
	Comments     []Comment     `json:"comments"`
}

type Media struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	URL       string    `json:"url"`
	MediaType MediaType `json:"media_type"`
	CreatedAt time.Time `json:"created_at"`
}

type CodeSnippet struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	Code      string    `json:"code"`
	Language  string    `json:"language"`
	LineCount int       `json:"line_count"`
	CreatedAt time.Time `json:"created_at"`
}

// Comment represents an AI-generated or user comment on a post.
type Comment struct {
	ID        string    `json:"id"`
	PostID    string    `json:"post_id"`
	Content   string    `json:"content"`
	IsAI      bool      `json:"is_ai"`
	CreatedAt time.Time `json:"created_at"`
}

// DailyActivity represents the number of posts made on a given date, used for streak heatmaps.
type DailyActivity struct {
	Date  string `json:"date"`  // YYYY-MM-DD
	Count int    `json:"count"`
}
