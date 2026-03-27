package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ikawaha/kagome-dict/ipa"
	"github.com/ikawaha/kagome/v2/tokenizer"
)

type AnalyzeHandler struct{}

func NewAnalyzeHandler() *AnalyzeHandler {
	return &AnalyzeHandler{}
}

func (h *AnalyzeHandler) AnalyzeText(c *gin.Context) {
	type Request struct {
		Text string `json:"text" binding:"required"`
	}
	var req Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text is required"})
		return
	}

	t, err := tokenizer.New(ipa.Dict(), tokenizer.OmitBosEos())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tokenizer init failed"})
		return
	}

	tokens := t.Tokenize(req.Text)

	freq := make(map[string]int)
	for _, token := range tokens {
		features := token.Features()
		if len(features) > 0 {
			pos := features[0]
			if pos == "名詞" || pos == "動詞" || pos == "形容詞" {
				surface := token.Surface
				if len([]rune(surface)) >= 2 {
					freq[surface]++
				}
			}
		}
	}

	type WordFreq struct {
		Word  string `json:"word"`
		Count int    `json:"count"`
	}

	var result []WordFreq
	for w, cnt := range freq {
		result = append(result, WordFreq{Word: w, Count: cnt})
	}

	// Sort by count descending (bubble sort for small arrays)
	for i := 0; i < len(result)-1; i++ {
		for j := 0; j < len(result)-i-1; j++ {
			if result[j].Count < result[j+1].Count {
				result[j], result[j+1] = result[j+1], result[j]
			}
		}
	}

	if len(result) > 30 {
		result = result[:30]
	}

	if result == nil {
		result = []WordFreq{}
	}

	c.JSON(http.StatusOK, gin.H{"words": result})
}
