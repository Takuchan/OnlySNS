package handler

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/takuchan/onlysns/internal/ai"
)

type AIHandler struct {
	svc *ai.Service
}

func NewAIHandler(svc *ai.Service) *AIHandler {
	return &AIHandler{svc: svc}
}

func (h *AIHandler) CodeReview(c *gin.Context) {
	var req struct {
		Code     string `json:"code" binding:"required"`
		Language string `json:"language"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}
	if req.Language == "" {
		req.Language = "text"
	}

	prompt := fmt.Sprintf(
		"以下のコードを日本語で簡潔にレビューしてください。改善点や最適化のヒントを教えてください:\n\n```%s\n%s\n```",
		req.Language, req.Code,
	)

	response, err := h.svc.Generate(c.Request.Context(), prompt)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"response": response})
}

func (h *AIHandler) Summarize(c *gin.Context) {
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	prompt := fmt.Sprintf(
		"以下の文章に対して、1行のタイトルと1文のTL;DRを日本語で生成してください。以下の形式で返してください:\nタイトル: ...\nTL;DR: ...\n\n%s",
		req.Content,
	)

	response, err := h.svc.Generate(c.Request.Context(), prompt)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}

	title := ""
	tldr := ""
	for _, line := range strings.Split(response, "\n") {
		if strings.HasPrefix(line, "タイトル:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "タイトル:"))
		} else if strings.HasPrefix(line, "TL;DR:") {
			tldr = strings.TrimSpace(strings.TrimPrefix(line, "TL;DR:"))
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"title":    title,
		"tldr":     tldr,
		"response": response,
	})
}

func (h *AIHandler) ExtractEntities(c *gin.Context) {
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	prompt := fmt.Sprintf(
		"以下のテキストから技術用語、ハードウェア、プログラミング言語、フレームワーク、ガジェットを抽出してください。カンマ区切りで返してください:\n%s",
		req.Content,
	)

	response, err := h.svc.Generate(c.Request.Context(), prompt)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}

	var entities []string
	for _, e := range strings.Split(response, ",") {
		trimmed := strings.TrimSpace(e)
		if trimmed != "" {
			entities = append(entities, trimmed)
		}
	}
	if entities == nil {
		entities = []string{}
	}

	c.JSON(http.StatusOK, gin.H{
		"entities": entities,
		"response": response,
	})
}

func (h *AIHandler) NextStep(c *gin.Context) {
	var req struct {
		Topics []string `json:"topics" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "topics is required"})
		return
	}

	prompt := fmt.Sprintf(
		"以下のトピックを学習している人に対して、次に学ぶべき概念や技術を日本語で提案してください（1〜3個）:\n%s",
		strings.Join(req.Topics, ", "),
	)

	response, err := h.svc.Generate(c.Request.Context(), prompt)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"response": response})
}

func (h *AIHandler) Caption(c *gin.Context) {
	file, _, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image file is required"})
		return
	}
	defer file.Close()

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read image"})
		return
	}

	prompt := "この画像を日本語で説明してください。また、関連するタグを#タグ形式で提案してください。"

	response, err := h.svc.GenerateWithImage(c.Request.Context(), prompt, imageBytes)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI service unavailable"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"response": response})
}
