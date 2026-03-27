package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

const defaultOllamaURL = "http://localhost:11434"
const defaultModel = "llama3.2"
const defaultVisionModel = "llava"

type Service struct {
	baseURL     string
	model       string
	visionModel string
	httpClient  *http.Client
}

func NewService() *Service {
	baseURL := os.Getenv("OLLAMA_URL")
	if baseURL == "" {
		baseURL = defaultOllamaURL
	}
	model := os.Getenv("OLLAMA_MODEL")
	if model == "" {
		model = defaultModel
	}
	visionModel := os.Getenv("OLLAMA_VISION_MODEL")
	if visionModel == "" {
		visionModel = defaultVisionModel
	}
	return &Service{
		baseURL:     baseURL,
		model:       model,
		visionModel: visionModel,
		httpClient:  &http.Client{Timeout: 120 * time.Second},
	}
}

type generateRequest struct {
	Model  string   `json:"model"`
	Prompt string   `json:"prompt"`
	Images []string `json:"images,omitempty"`
	Stream bool     `json:"stream"`
}

type generateResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

func (s *Service) Generate(ctx context.Context, prompt string) (string, error) {
	return s.generate(ctx, s.model, prompt, nil)
}

func (s *Service) GenerateWithImage(ctx context.Context, prompt string, imageBytes []byte) (string, error) {
	b64 := base64.StdEncoding.EncodeToString(imageBytes)
	return s.generate(ctx, s.visionModel, prompt, []string{b64})
}

func (s *Service) generate(ctx context.Context, model, prompt string, images []string) (string, error) {
	reqBody := generateRequest{
		Model:  model,
		Prompt: prompt,
		Images: images,
		Stream: false,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/api/generate", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	var genResp generateResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}
	return genResp.Response, nil
}
