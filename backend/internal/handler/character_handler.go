package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/takuchan/onlysns/internal/usecase"
)

type CharacterHandler struct {
	characterUsecase *usecase.CharacterUsecase
}

func NewCharacterHandler(characterUsecase *usecase.CharacterUsecase) *CharacterHandler {
	return &CharacterHandler{characterUsecase: characterUsecase}
}

// GetCharacterState returns the current character state for the user
// GET /api/v1/character/state
func (h *CharacterHandler) GetCharacterState(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		// For now, use a default user ID. In a real app, this would come from authentication
		userID = "default-user"
	}

	state, err := h.characterUsecase.GetCharacterState(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character state"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"character_state": state,
		"stage_name":      getCharacterStageName(state.CurrentStage),
	})
}

// GetPostAnalysis returns the AI analysis result for a post
// GET /api/v1/posts/:id/analysis
func (h *CharacterHandler) GetPostAnalysis(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "post_id is required"})
		return
	}

	analysis, err := h.characterUsecase.GetPostAnalysis(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post analysis not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"analysis": analysis,
	})
}

// GetCharacterAssets returns the character assets for a specific post
// GET /api/v1/posts/:id/character-assets
func (h *CharacterHandler) GetCharacterAssets(c *gin.Context) {
	postID := c.Param("id")
	if postID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "post_id is required"})
		return
	}

	assets, err := h.characterUsecase.GetCharacterAssets(c.Request.Context(), postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get character assets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"assets": assets,
	})
}

// getCharacterStageName returns the Japanese name for a character stage
func getCharacterStageName(stage int) string {
	switch stage {
	case 1:
		return "赤ちゃん"
	case 2:
		return "幼稚園"
	case 3:
		return "小学生"
	case 4:
		return "中学生"
	case 5:
		return "大人"
	default:
		return "不明"
	}
}
