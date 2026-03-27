package handler

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/takuchan/onlysns/internal/domain"
	"github.com/takuchan/onlysns/internal/usecase"
)

type PostHandler struct {
	postUsecase *usecase.PostUsecase
}

func NewPostHandler(postUsecase *usecase.PostUsecase) *PostHandler {
	return &PostHandler{postUsecase: postUsecase}
}

func (h *PostHandler) CreatePost(c *gin.Context) {
	content := c.PostForm("content")
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	charCount := usecase.CountChars(content)
	if charCount > 560 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content exceeds 560 character units"})
		return
	}

	code := c.PostForm("code")
	language := c.PostForm("language")

	if code != "" {
		lines := strings.Split(code, "\n")
		if len(lines) > 20 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "code snippet exceeds 20 lines"})
			return
		}
	}

	var mediaItems []domain.Media
	form, _ := c.MultipartForm()
	if form != nil {
		files := form.File["media[]"]
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open uploaded file"})
				return
			}
			defer file.Close()

			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			mediaID := uuid.New().String()
			filename := mediaID + ext

			dst, err := os.Create("./uploads/" + filename)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
				return
			}
			defer dst.Close()

			if _, err := io.Copy(dst, file); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write file"})
				return
			}

			mediaType := detectMediaType(fileHeader.Filename, fileHeader.Header.Get("Content-Type"))
			mediaItems = append(mediaItems, domain.Media{
				ID:        mediaID,
				URL:       "/uploads/" + filename,
				MediaType: mediaType,
			})
		}
	}

	input := usecase.CreatePostInput{
		Content:    content,
		Code:       code,
		Language:   language,
		MediaItems: mediaItems,
	}

	post, err := h.postUsecase.CreatePost(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

func (h *PostHandler) ListPosts(c *gin.Context) {
	page := 1
	limit := 20

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	posts, total, err := h.postUsecase.ListPosts(c.Request.Context(), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"posts": posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *PostHandler) DeletePost(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	if err := h.postUsecase.DeletePost(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *PostHandler) ExportPosts(c *gin.Context) {
	format := c.Query("format")
	if format == "" {
		format = "json"
	}

	var from, to *time.Time
	if f := c.Query("from"); f != "" {
		t, err := time.Parse("2006-01-02", f)
		if err == nil {
			from = &t
		}
	}
	if t := c.Query("to"); t != "" {
		parsed, err := time.Parse("2006-01-02", t)
		if err == nil {
			// end of day
			endOfDay := parsed.Add(24*time.Hour - time.Second)
			to = &endOfDay
		}
	}

	posts, err := h.postUsecase.ListForExport(c.Request.Context(), from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	switch format {
	case "csv":
		c.Header("Content-Disposition", "attachment; filename=posts.csv")
		c.Header("Content-Type", "text/csv")
		w := csv.NewWriter(c.Writer)
		if err := w.Write([]string{"id", "content", "likes", "shares", "created_at"}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write CSV header"})
			return
		}
		for _, p := range posts {
			if err := w.Write([]string{
				p.ID,
				p.Content,
				fmt.Sprintf("%d", p.Likes),
				fmt.Sprintf("%d", p.Shares),
				p.CreatedAt.Format(time.RFC3339),
			}); err != nil {
				return
			}
		}
		w.Flush()
		if err := w.Error(); err != nil {
			log.Printf("csv flush error: %v", err)
		}
	default:
		c.JSON(http.StatusOK, posts)
	}
}

func detectMediaType(filename, contentType string) domain.MediaType {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".gif":
		return domain.MediaTypeGIF
	case ".mp4", ".mov", ".avi", ".webm":
		return domain.MediaTypeVideo
	default:
		if strings.Contains(contentType, "video") {
			return domain.MediaTypeVideo
		}
		return domain.MediaTypeImage
	}
}
