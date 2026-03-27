package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type OllamaClient struct {
	baseURL        string
	generationModel string
	embeddingModel  string
	httpClient     *http.Client
}

func NewOllamaClient(baseURL, generationModel, embeddingModel string) *OllamaClient {
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}
	if generationModel == "" {
		generationModel = "llama3"
	}
	if embeddingModel == "" {
		embeddingModel = generationModel
	}
	return &OllamaClient{
		baseURL:         strings.TrimRight(baseURL, "/"),
		generationModel: generationModel,
		embeddingModel:  embeddingModel,
		httpClient:      &http.Client{Timeout: 120 * time.Second},
	}
}

type generateRequest struct {
	Model   string                 `json:"model"`
	Prompt  string                 `json:"prompt"`
	Stream  bool                   `json:"stream"`
	Format  string                 `json:"format,omitempty"`
	Options map[string]interface{} `json:"options,omitempty"`
}

type generateResponse struct {
	Response string `json:"response"`
}

type embeddingRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
}

type embeddingResponse struct {
	Embedding []float64 `json:"embedding"`
}

type pullRequest struct {
	Name   string `json:"name"`
	Stream bool   `json:"stream"`
}

func (c *OllamaClient) Generate(ctx context.Context, prompt string, temperature float64) (string, error) {
	reqBody := generateRequest{
		Model:  c.generationModel,
		Prompt: prompt,
		Stream: false,
		Options: map[string]interface{}{
			"temperature": temperature,
		},
	}
	resp := &generateResponse{}
	if err := c.postJSON(ctx, "/api/generate", reqBody, resp); err != nil {
		return "", err
	}
	return strings.TrimSpace(resp.Response), nil
}

func (c *OllamaClient) GenerateJSON(ctx context.Context, prompt string) (string, error) {
	reqBody := generateRequest{
		Model:  c.generationModel,
		Prompt: prompt,
		Stream: false,
		Format: "json",
		Options: map[string]interface{}{
			"temperature": 0.2,
		},
	}
	resp := &generateResponse{}
	if err := c.postJSON(ctx, "/api/generate", reqBody, resp); err != nil {
		return "", err
	}
	return strings.TrimSpace(resp.Response), nil
}

func (c *OllamaClient) Embeddings(ctx context.Context, text string) ([]float64, error) {
	reqBody := embeddingRequest{Model: c.embeddingModel, Prompt: text}
	resp := &embeddingResponse{}
	if err := c.postJSON(ctx, "/api/embeddings", reqBody, resp); err != nil {
		return nil, err
	}
	if len(resp.Embedding) == 0 {
		return nil, fmt.Errorf("empty embedding vector")
	}
	return resp.Embedding, nil
}

func (c *OllamaClient) PullModel(ctx context.Context, name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	reqBody := pullRequest{Name: name, Stream: false}
	var out map[string]interface{}
	return c.postJSON(ctx, "/api/pull", reqBody, &out)
}

func (c *OllamaClient) postJSON(ctx context.Context, path string, reqBody any, out any) error {
	body, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	payload, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("ollama error: %s: %s", resp.Status, strings.TrimSpace(string(payload)))
	}
	if err := json.Unmarshal(payload, out); err != nil {
		return fmt.Errorf("failed to decode ollama response: %w", err)
	}
	return nil
}
