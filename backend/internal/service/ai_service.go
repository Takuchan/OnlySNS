package service

import (
	"context"
	"encoding/json"
	"errors"
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
- 形式: {"tags":["タグ名","タグ名"]}
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
- 必ずポジティブに励ます
- 日本語のみ

投稿:
%s`, content)
	res, err := s.client.Generate(ctx, prompt, 0.7)
	if err != nil || strings.TrimSpace(res) == "" {
		return "ナイス学習！コツコツ積み上げてるの、ちゃんと強いで。"
	}
	return trimToRunes(res, 500)
}

func (s *AIService) TsukkomiFromTrend(ctx context.Context, posts []*domain.Post) string {
	if len(posts) == 0 {
		return "今日の学習ログを投稿すると、ここにゆるいつっこみが出るで。"
	}

	limit := minInt(len(posts), 30)
	recent := posts[:limit]
	summary := buildTrendSummary(recent)

	prompt := fmt.Sprintf(`あなたは学習を応援する日本語AIです。
ユーザーの投稿傾向サマリーを読んで、ポジティブで軽いユーモアのある"つっこみ"を2文以内で返してください。
制約:
- 100文字以内
- 褒める要素を1つ以上入れる
- 「次にやると良さそうな小さな一歩」を自然に1つ入れる
- 断定的な批判は禁止

投稿傾向サマリー:
%s`, summary)

	res, err := s.client.Generate(ctx, prompt, 0.65)
	if err != nil || strings.TrimSpace(res) == "" {
		return "最近の積み上げ、めっちゃええ感じやん。次は5分だけ復習タイム入れたら、さらに仕上がるで。"
	}
	return trimToRunes(res, 100)
}

func (s *AIService) ExplainLikeFive(ctx context.Context, content string) (string, error) {
	prompt := fmt.Sprintf(`この投稿に対する反応を200文字以内で人間らしく反応してください。寄り添ってください。`, content)

	res, err := s.client.Generate(ctx, prompt, 0.4)
	if err != nil || strings.TrimSpace(res) == "" {
		res, err = s.client.Generate(ctx, prompt, 0.2)
		if err != nil {
			return "", fmt.Errorf("eli5 generation failed: %w", err)
		}
	}
	clean := strings.TrimSpace(res)
	if clean == "" {
		return "", errors.New("eli5 generation returned empty response")
	}
	return clean, nil
}

func (s *AIService) GenerateQuiz(ctx context.Context, content string) (Quiz, error) {
	prompt := fmt.Sprintf(`次の学習内容から4択クイズを1問だけ作成してください。
必ずJSONのみで返してください。
形式:
{"question":"...","choices":["A","B","C","D"],"answer_index":0,"explanation":"..."}
制約:
- 日本語のみ
- answer_indexは0〜3
- choicesは4つ
- 選択肢は紛らわしいが公平に
- explanationは正解理由を簡潔に

内容:
%s`, content)

	raw, err := s.client.GenerateJSON(ctx, prompt)
	if err != nil || strings.TrimSpace(raw) == "" {
		raw, err = s.client.Generate(ctx, prompt, 0.2)
		if err != nil {
			return Quiz{}, fmt.Errorf("quiz generation failed: %w", err)
		}
	}

	q, err := parseQuiz(raw)
	if err != nil {
		return Quiz{}, err
	}
	if len(q.Choices) != 4 || q.AnswerIndex < 0 || q.AnswerIndex > 3 || strings.TrimSpace(q.Question) == "" {
		return Quiz{}, errors.New("quiz result has invalid format")
	}
	return q, nil
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

func parseQuiz(raw string) (Quiz, error) {
	var q Quiz
	if err := json.Unmarshal([]byte(raw), &q); err == nil {
		return q, nil
	}

	jsonText := extractJSONObject(raw)
	if jsonText == "" {
		return Quiz{}, errors.New("quiz json not found in model response")
	}
	if err := json.Unmarshal([]byte(jsonText), &q); err != nil {
		return Quiz{}, fmt.Errorf("failed to parse quiz json: %w", err)
	}
	return q, nil
}

func extractJSONObject(raw string) string {
	start := strings.Index(raw, "{")
	if start == -1 {
		return ""
	}
	depth := 0
	inString := false
	escaped := false
	for i := start; i < len(raw); i++ {
		ch := raw[i]
		if inString {
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = false
			}
			continue
		}
		if ch == '"' {
			inString = true
			continue
		}
		if ch == '{' {
			depth++
		}
		if ch == '}' {
			depth--
			if depth == 0 {
				return raw[start : i+1]
			}
		}
	}
	return ""
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

func buildTrendSummary(posts []*domain.Post) string {
	tokenCount := map[string]int{}
	tagCount := map[string]int{}
	totalChars := 0
	for _, p := range posts {
		totalChars += len([]rune(p.Content))
		for t := range tokenize(p.Content) {
			tokenCount[t]++
		}
		for _, tg := range p.Tags {
			if strings.TrimSpace(tg) == "" {
				continue
			}
			tagCount[tg]++
		}
	}

	topTokens := topKeys(tokenCount, 5)
	topTags := topKeys(tagCount, 4)
	avgChars := 0
	if len(posts) > 0 {
		avgChars = totalChars / len(posts)
	}

	return fmt.Sprintf(
		"直近投稿数: %d\n平均文字数: %d\n頻出キーワード: %s\n頻出タグ: %s",
		len(posts),
		avgChars,
		strings.Join(topTokens, ", "),
		strings.Join(topTags, ", "),
	)
}

func topKeys(m map[string]int, n int) []string {
	type kv struct {
		k string
		v int
	}
	arr := make([]kv, 0, len(m))
	for k, v := range m {
		arr = append(arr, kv{k: k, v: v})
	}
	sort.Slice(arr, func(i, j int) bool {
		if arr[i].v == arr[j].v {
			return arr[i].k < arr[j].k
		}
		return arr[i].v > arr[j].v
	})
	if len(arr) > n {
		arr = arr[:n]
	}
	out := make([]string, 0, len(arr))
	for _, x := range arr {
		out = append(out, x.k)
	}
	if len(out) == 0 {
		return []string{"(なし)"}
	}
	return out
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
