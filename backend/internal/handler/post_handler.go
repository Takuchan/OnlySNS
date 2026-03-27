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
	"github.com/takuchan/onlysns/internal/service"
	"github.com/takuchan/onlysns/internal/usecase"
)

type PostHandler struct {
	postUsecase *usecase.PostUsecase
	ogpService  *service.OGPService
	aiService   *service.AIService
}

func NewPostHandler(postUsecase *usecase.PostUsecase, ogpService *service.OGPService, aiService *service.AIService) *PostHandler {
	return &PostHandler{postUsecase: postUsecase, ogpService: ogpService, aiService: aiService}
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
		Tags:       h.aiService.GenerateTags(c.Request.Context(), content),
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

func (h *PostHandler) LikePost(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	likes, err := h.postUsecase.LikePost(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"likes": likes})
}

func (h *PostHandler) RepostPost(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	reposts, err := h.postUsecase.RepostPost(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"reposts": reposts})
}

func (h *PostHandler) FetchOGP(c *gin.Context) {
	rawURL := c.Query("url")
	if strings.TrimSpace(rawURL) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url is required"})
		return
	}

	meta, err := h.ogpService.Fetch(rawURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, meta)
}

func (h *PostHandler) LatestTsukkomi(c *gin.Context) {
	posts, _, err := h.postUsecase.ListPosts(c.Request.Context(), 1, 1)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if len(posts) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": h.aiService.Tsukkomi(c.Request.Context(), "")})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": h.aiService.Tsukkomi(c.Request.Context(), posts[0].Content),
		"post_id": posts[0].ID,
	})
}

func (h *PostHandler) SimplifyPost(c *gin.Context) {
	id := c.Param("id")
	post, err := h.postUsecase.GetPostByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"simplified": h.aiService.ExplainLikeFive(c.Request.Context(), post.Content)})
}

func (h *PostHandler) GeneratePostQuiz(c *gin.Context) {
	id := c.Param("id")
	post, err := h.postUsecase.GetPostByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	quiz := h.aiService.GenerateQuiz(c.Request.Context(), post.Content)
	c.JSON(http.StatusOK, quiz)
}

func (h *PostHandler) RelatedPosts(c *gin.Context) {
	id := c.Param("id")
	limit := 3
	if q := c.Query("limit"); q != "" {
		if v, err := strconv.Atoi(q); err == nil && v > 0 && v <= 10 {
			limit = v
		}
	}

	target, err := h.postUsecase.GetPostByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	all, _, err := h.postUsecase.ListPosts(c.Request.Context(), 1, 500)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	related := h.aiService.RecommendRelated(c.Request.Context(), target, all, limit)
	c.JSON(http.StatusOK, gin.H{"posts": related})
}

func (h *PostHandler) SearchPosts(c *gin.Context) {
	keyword := c.Query("q")
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
			endOfDay := parsed.Add(24*time.Hour - time.Second)
			to = &endOfDay
		}
	}

	posts, total, err := h.postUsecase.SearchPosts(c.Request.Context(), keyword, from, to, page, limit)
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

func (h *PostHandler) GetActivity(c *gin.Context) {
	days := 365
	if d := c.Query("days"); d != "" {
		if v, err := strconv.Atoi(d); err == nil && v > 0 && v <= 730 {
			days = v
		}
	}

	activity, err := h.postUsecase.GetDailyActivity(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"activity": activity})
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
