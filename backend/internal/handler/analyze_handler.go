package handler

import (
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"github.com/ikawaha/kagome-dict/ipa"
	"github.com/ikawaha/kagome/v2/tokenizer"
)

type AnalyzeHandler struct {
	tok *tokenizer.Tokenizer
}

func NewAnalyzeHandler() *AnalyzeHandler {
	t, err := tokenizer.New(ipa.Dict(), tokenizer.OmitBosEos())
	if err != nil {
		// Fall back to a nil tokenizer; AnalyzeText will return a 500.
		return &AnalyzeHandler{}
	}
	return &AnalyzeHandler{tok: t}
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

	if h.tok == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "tokenizer init failed"})
		return
	}

	tokens := h.tok.Tokenize(req.Text)

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

	result := make([]WordFreq, 0, len(freq))
	for w, cnt := range freq {
		result = append(result, WordFreq{Word: w, Count: cnt})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	if len(result) > 30 {
		result = result[:30]
	}

	c.JSON(http.StatusOK, gin.H{"words": result})
}
