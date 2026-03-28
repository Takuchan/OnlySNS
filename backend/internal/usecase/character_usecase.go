package usecase

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

	"github.com/takuchan/onlysns/internal/domain"
	"github.com/takuchan/onlysns/internal/repository"
	"github.com/takuchan/onlysns/internal/service"
)

type CharacterUsecase struct {
	characterRepo repository.CharacterStateRepository
	analysisRepo  repository.PostAnalysisRepository
	postRepo      repository.PostRepository
	aiService     *service.AIService
}

func NewCharacterUsecase(
	characterRepo repository.CharacterStateRepository,
	analysisRepo repository.PostAnalysisRepository,
	postRepo repository.PostRepository,
	aiService *service.AIService,
) *CharacterUsecase {
	return &CharacterUsecase{
		characterRepo: characterRepo,
		analysisRepo:  analysisRepo,
		postRepo:      postRepo,
		aiService:     aiService,
	}
}

// GetCharacterState returns the current character state for a user
func (uc *CharacterUsecase) GetCharacterState(ctx context.Context, userID string) (*domain.CharacterState, error) {
	state, err := uc.characterRepo.GetCharacterState(ctx, userID)
	if err != nil {
		return nil, err
	}

	posts, err := uc.postRepo.ListForExport(ctx, nil, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to list posts for growth: %w", err)
	}

	points := calculateLearningJourneyPoints(posts)
	stage := determineStageFromPoints(points)

	state.TotalPosts = len(posts)
	state.TotalStudyPoints = points
	state.CurrentStage = stage

	if err := uc.characterRepo.UpdateCharacterState(ctx, state); err != nil {
		return nil, fmt.Errorf("failed to persist recalculated character state: %w", err)
	}

	return state, nil
}

// AnalyzeAndStorePostContent analyzes a post and stores the analysis
func (uc *CharacterUsecase) AnalyzeAndStorePostContent(ctx context.Context, postID string, content string) (*domain.PostAnalysis, error) {
	// Run AI analysis
	analysisResult, err := uc.aiService.AnalyzeContent(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze content: %w", err)
	}

	// Store analysis in database
	analysisData, _ := json.Marshal(analysisResult)
	analysis := &domain.PostAnalysis{
		PostID:       postID,
		Category:     analysisResult.Category,
		Mood:         analysisResult.Mood,
		Keywords:     analysisResult.Keywords,
		AnalysisData: string(analysisData),
	}

	if err := uc.analysisRepo.Create(ctx, analysis); err != nil {
		return nil, fmt.Errorf("failed to store post analysis: %w", err)
	}

	return analysis, nil
}

// GetPostAnalysis retrieves the stored analysis for a post
func (uc *CharacterUsecase) GetPostAnalysis(ctx context.Context, postID string) (*domain.PostAnalysis, error) {
	return uc.analysisRepo.GetByPostID(ctx, postID)
}

// UpdateCharacterGrowth updates character stage based on aggregate learning journey points
// Returns true if the stage changed
func (uc *CharacterUsecase) UpdateCharacterGrowth(ctx context.Context, userID string) (bool, error) {
	before, err := uc.characterRepo.GetCharacterState(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get previous character state: %w", err)
	}

	state, err := uc.GetCharacterState(ctx, userID)
	if err != nil {
		return false, fmt.Errorf("failed to get character state: %w", err)
	}
	return before.CurrentStage != state.CurrentStage, nil
}

// ProcessNewPost handles character growth and analysis when a new post is created
func (uc *CharacterUsecase) ProcessNewPost(ctx context.Context, userID, postID, content string, studyPoints int64) (*domain.PostAnalysis, bool, error) {
	_ = studyPoints
	// Ensure user and character state exist
	if _, err := uc.characterRepo.GetOrCreateUser(ctx, userID); err != nil {
		return nil, false, fmt.Errorf("failed to initialize user: %w", err)
	}

	// Get and analyze post content
	analysis, err := uc.AnalyzeAndStorePostContent(ctx, postID, content)
	if err != nil {
		return nil, false, err
	}

	before, err := uc.characterRepo.GetCharacterState(ctx, userID)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get current character state: %w", err)
	}

	updated, err := uc.GetCharacterState(ctx, userID)
	if err != nil {
		return nil, false, err
	}

	stageChanged := before.CurrentStage != updated.CurrentStage

	return analysis, stageChanged, nil
}

func calculateLearningJourneyPoints(posts []*domain.Post) int64 {
	if len(posts) == 0 {
		return 0
	}

	var total float64
	uniqueTags := map[string]struct{}{}
	topicSignals := map[string]int{}

	for _, p := range posts {
		contentRunes := float64(len([]rune(strings.TrimSpace(p.Content))))
		depth := math.Min(contentRunes/20.0, 14.0)

		tagScore := math.Min(float64(len(p.Tags))*1.8, 9.0)
		for _, t := range p.Tags {
			normalized := strings.ToLower(strings.TrimSpace(t))
			if normalized != "" {
				uniqueTags[normalized] = struct{}{}
				topicSignals[normalized]++
			}
		}

		codeScore := math.Min(float64(len(p.CodeSnippets))*5.0, 10.0)
		mediaScore := math.Min(float64(len(p.Media))*2.5, 5.0)
		engagementScore := math.Min(float64(p.Likes+p.Shares)/10.0, 8.0)

		// Base per-post score + content richness
		total += 4.0 + depth + tagScore + codeScore + mediaScore + engagementScore
	}

	diversityBonus := math.Min(float64(len(uniqueTags))*1.5, 24.0)
	consistencyBonus := consistencyBonus(posts)
	focusBonus := focusBonus(topicSignals)

	return int64(math.Round(total + diversityBonus + consistencyBonus + focusBonus))
}

func consistencyBonus(posts []*domain.Post) float64 {
	if len(posts) < 3 {
		return 0
	}

	dayCount := map[string]struct{}{}
	for _, p := range posts {
		dayKey := p.CreatedAt.Format("2006-01-02")
		dayCount[dayKey] = struct{}{}
	}
	activeDays := float64(len(dayCount))
	return math.Min(activeDays*1.2, 22.0)
}

func focusBonus(topicSignals map[string]int) float64 {
	if len(topicSignals) == 0 {
		return 0
	}
	counts := make([]int, 0, len(topicSignals))
	for _, c := range topicSignals {
		counts = append(counts, c)
	}
	sort.Ints(counts)
	best := float64(counts[len(counts)-1])
	return math.Min(best*1.8, 16.0)
}

func determineStageFromPoints(points int64) int {
	// Intentionally opaque thresholds for in-app UX; documented internally in README.
	switch {
	case points >= 720:
		return domain.CharacterStageAdult
	case points >= 410:
		return domain.CharacterStageMiddle
	case points >= 220:
		return domain.CharacterStageElementary
	case points >= 90:
		return domain.CharacterStageKindergarten
	default:
		return domain.CharacterStageBaby
	}
}

// GetCharacterAssets generates character assets for Adult stage based on post analysis
// Returns face ID (1-20) and accessory ID (0-20, 0 means no accessory)
// Note: Currently returns post-analysis-based assets for all posts
// In future, when user authentication is added, can check actual character stage
func (uc *CharacterUsecase) GetCharacterAssets(ctx context.Context, postID string) (*domain.CharacterAssets, error) {
	analysis, err := uc.GetPostAnalysis(ctx, postID)
	if err != nil {
		// If no analysis found, return default assets
		return &domain.CharacterAssets{
			FaceID:      1,
			AccessoryID: 0,
		}, nil
	}

	// Map category and mood to face and accessory IDs
	assets := mapAnalysisToAssets(analysis)
	return assets, nil
}

// mapAnalysisToAssets maps content analysis to character assets
func mapAnalysisToAssets(analysis *domain.PostAnalysis) *domain.CharacterAssets {
	assets := &domain.CharacterAssets{
		Mood:        analysis.Mood,
		Category:    analysis.Category,
		Keywords:    analysis.Keywords,
		FaceID:      1, // Default face
		AccessoryID: 0, // Default no accessory
	}

	// Map mood to face expression (1-20)
	faceMap := map[string]int{
		"serious":    1, // Serious expression
		"joyful":     2, // Happy/joyful
		"struggling": 3, // Struggling/determined
		"proud":      4, // Proud/confident
		"curious":    5, // Curious/wondering
		"thoughtful": 6, // Thoughtful/pondering
		"excited":    7, // Excited/enthusiastic
	}
	if faceID, ok := faceMap[analysis.Mood]; ok {
		assets.FaceID = faceID
	}

	// Map category to accessory (1-20)
	accessoryMap := map[string]int{
		"Programming":       10, // Glasses
		"Language Learning": 11, // Language book
		"Fitness":           12, // Sweatband
		"Philosophy":        13, // Thinking cap
		"Art":               14, // Artist palette
		"Science":           15, // Glasses (scientist)
		"Design":            16, // Designer pen
		"Mathematics":       17, // Calculator
		"Other":             0,  // No accessory
	}
	if accessoryID, ok := accessoryMap[analysis.Category]; ok {
		assets.AccessoryID = accessoryID
	}

	return assets
}
