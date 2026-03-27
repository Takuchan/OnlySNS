package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/takuchan/onlysns/internal/domain"
)

type Quiz struct {
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	AnswerIndex int      `json:"answer_index"`
	Explanation string   `json:"explanation"`
}

type AIService struct {
	client *OllamaClient
}

func NewAIService(client *OllamaClient) *AIService {
	return &AIService{client: client}
}

func (s *AIService) GenerateTags(ctx context.Context, content string) []string {
	if strings.TrimSpace(content) == "" {
		return []string{}
	}
	prompt := fmt.Sprintf(`あなたは学習SNS用のタグ生成アシスタントです。
以下の日本語テキストから検索しやすいタグを3〜6個提案してください。
- 必ずJSONのみで返す
- 形式: {"tags":["#Go言語","#Docker"]}
- 各タグは日本語中心、先頭は#、最大24文字
- 個人情報や差別表現は禁止

テキスト:
%s`, content)

	raw, err := s.client.GenerateJSON(ctx, prompt)
	if err != nil {
		return []string{}
	}
	var parsed struct {
		Tags []string `json:"tags"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return []string{}
	}
	return sanitizeTags(parsed.Tags)
}

func (s *AIService) Tsukkomi(ctx context.Context, content string) string {
	if strings.TrimSpace(content) == "" {
		return "今日の学習ログを投稿すると、ここにゆるいつっこみが出るで。"
	}
	prompt := fmt.Sprintf(`あなたは日本語で返す勉強仲間のAIです。
以下の学習投稿に対して、短くフレンドリーで少しユーモアのある"つっこみ"を1〜2文で返してください。
- 上から目線禁止
- 攻撃的表現禁止
- 日本語のみ

投稿:
%s`, content)
	res, err := s.client.Generate(ctx, prompt, 0.7)
	if err != nil || strings.TrimSpace(res) == "" {
		return "ナイス学習！コツコツ積み上げてるの、ちゃんと強いで。"
	}
	return trimToRunes(res, 140)
}

func (s *AIService) ExplainLikeFive(ctx context.Context, content string) string {
	prompt := fmt.Sprintf(`次の内容を、5歳にも伝わるやさしい日本語で説明してください。
- たとえ話を1つ入れる
- 3〜6文
- 専門用語はかみくだく

内容:
%s`, content)
	res, err := s.client.Generate(ctx, prompt, 0.4)
	if err != nil || strings.TrimSpace(res) == "" {
		return "うまく説明を作れなかったので、もう一度ためしてみてね。"
	}
	return strings.TrimSpace(res)
}

func (s *AIService) GenerateQuiz(ctx context.Context, content string) Quiz {
	prompt := fmt.Sprintf(`次の学習内容から4択クイズを1問だけ作成してください。
必ずJSONのみで返してください。
形式:
{"question":"...","choices":["A","B","C","D"],"answer_index":0,"explanation":"..."}
制約:
- 日本語のみ
- answer_indexは0〜3
- choicesは4つ

内容:
%s`, content)

	raw, err := s.client.GenerateJSON(ctx, prompt)
	if err != nil {
		return fallbackQuiz()
	}
	var q Quiz
	if err := json.Unmarshal([]byte(raw), &q); err != nil {
		return fallbackQuiz()
	}
	if len(q.Choices) != 4 || q.AnswerIndex < 0 || q.AnswerIndex > 3 || strings.TrimSpace(q.Question) == "" {
		return fallbackQuiz()
	}
	return q
}

type relatedCandidate struct {
	Post  *domain.Post
	Score float64
}

func (s *AIService) RecommendRelated(ctx context.Context, target *domain.Post, all []*domain.Post, limit int) []*domain.Post {
	if target == nil || limit <= 0 {
		return []*domain.Post{}
	}
	targetVec, err := s.client.Embeddings(ctx, target.Content)
	if err != nil {
		return lexicalFallback(target, all, limit)
	}

	candidates := make([]relatedCandidate, 0, len(all))
	for _, p := range all {
		if p.ID == target.ID {
			continue
		}
		vec, err := s.client.Embeddings(ctx, p.Content)
		if err != nil {
			continue
		}
		score := cosineSimilarity(targetVec, vec)
		if score <= 0 {
			continue
		}
		candidates = append(candidates, relatedCandidate{Post: p, Score: score})
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Score > candidates[j].Score
	})
	if len(candidates) == 0 {
		return lexicalFallback(target, all, limit)
	}
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}
	out := make([]*domain.Post, 0, len(candidates))
	for _, c := range candidates {
		out = append(out, c.Post)
	}
	return out
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) == 0 || len(a) != len(b) {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

func sanitizeTags(tags []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, 8)
	for _, t := range tags {
		t := strings.TrimSpace(t)
		if t == "" {
			continue
		}
		if !strings.HasPrefix(t, "#") {
			t = "#" + t
		}
		if len([]rune(t)) > 24 {
			continue
		}
		if _, ok := seen[t]; ok {
			continue
		}
		seen[t] = struct{}{}
		out = append(out, t)
		if len(out) >= 8 {
			break
		}
	}
	return out
}

func trimToRunes(s string, max int) string {
	r := []rune(strings.TrimSpace(s))
	if len(r) <= max {
		return string(r)
	}
	return string(r[:max]) + "…"
}

func fallbackQuiz() Quiz {
	return Quiz{
		Question:    "この投稿のテーマに最も近いものはどれ？",
		Choices:     []string{"用語の暗記", "理解の確認", "実装の振り返り", "雑談"},
		AnswerIndex: 2,
		Explanation: "技術投稿は、実装や学習内容の振り返りとして読むと理解が深まります。",
	}
}

func lexicalFallback(target *domain.Post, all []*domain.Post, limit int) []*domain.Post {
	tokens := tokenize(target.Content)
	if len(tokens) == 0 {
		return []*domain.Post{}
	}
	type scorePost struct {
		post  *domain.Post
		score int
	}
	scored := make([]scorePost, 0, len(all))
	for _, p := range all {
		if p.ID == target.ID {
			continue
		}
		s := overlap(tokens, tokenize(p.Content))
		if s > 0 {
			scored = append(scored, scorePost{post: p, score: s})
		}
	}
	sort.Slice(scored, func(i, j int) bool { return scored[i].score > scored[j].score })
	if len(scored) > limit {
		scored = scored[:limit]
	}
	out := make([]*domain.Post, 0, len(scored))
	for _, p := range scored {
		out = append(out, p.post)
	}
	return out
}

func tokenize(s string) map[string]struct{} {
	parts := strings.FieldsFunc(strings.ToLower(s), func(r rune) bool {
		return r == ' ' || r == '\n' || r == '\t' || r == '。' || r == '、' || r == ',' || r == '.' || r == '!' || r == '?' || r == '#' || r == ':' || r == ';' || r == '"' || r == '\''
	})
	m := map[string]struct{}{}
	for _, p := range parts {
		if len([]rune(p)) >= 2 {
			m[p] = struct{}{}
		}
	}
	return m
}

func overlap(a, b map[string]struct{}) int {
	score := 0
	for t := range a {
		if _, ok := b[t]; ok {
			score++
		}
	}
	return score
}
