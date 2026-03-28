package domain

import (
	"time"
)

// Character growth stages
const (
	CharacterStageBaby         = 1
	CharacterStageKindergarten = 2
	CharacterStageElementary   = 3
	CharacterStageMiddle       = 4
	CharacterStageAdult        = 5
)

var CharacterStageNames = map[int]string{
	1: "赤ちゃん",
	2: "幼稚園",
	3: "小学生",
	4: "中学生",
	5: "大人",
}

// Character base types
const (
	CharacterTypeNeutral = "neutral"
	CharacterTypeFemale  = "female"
	CharacterTypeMale    = "male"
	CharacterTypeAnimal  = "animal"
)

// ContentMood represents the emotional tone of a post
type ContentMood string

const (
	MoodSerious    ContentMood = "serious"
	MoodJoyful     ContentMood = "joyful"
	MoodStruggling ContentMood = "struggling"
	MoodProud      ContentMood = "proud"
	MoodCurious    ContentMood = "curious"
	MoodThoughtful ContentMood = "thoughtful"
	MoodExcited    ContentMood = "excited"
)

// ContentCategory represents the topic/domain of a post
type ContentCategory string

const (
	CategoryProgramming      ContentCategory = "Programming"
	CategoryLanguageLearning ContentCategory = "Language Learning"
	CategoryFitness          ContentCategory = "Fitness"
	CategoryPhilosophy       ContentCategory = "Philosophy"
	CategoryArt              ContentCategory = "Art"
	CategoryScience          ContentCategory = "Science"
	CategoryDesign           ContentCategory = "Design"
	CategoryMathematics      ContentCategory = "Mathematics"
	CategoryOther            ContentCategory = "Other"
)

// User represents a learner in the system
type User struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CharacterState represents the current state of a user's character
type CharacterState struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	CurrentStage     int       `json:"current_stage"`
	TotalPosts       int       `json:"total_posts"`
	TotalStudyPoints int64     `json:"total_study_points"`
	BaseType         string    `json:"base_type"`
	LastUpdated      time.Time `json:"last_updated"`
	CreatedAt        time.Time `json:"created_at"`
}

// PostAnalysis stores AI-generated analysis of a post's content
type PostAnalysis struct {
	ID           string    `json:"id"`
	PostID       string    `json:"post_id"`
	Category     string    `json:"category"`
	Mood         string    `json:"mood"`
	Keywords     []string  `json:"keywords"`
	AnalysisData string    `json:"analysis_data"` // JSON string of full analysis
	CreatedAt    time.Time `json:"created_at"`
}

// CharacterAssets represents the visual assets of a character in Adult stage
type CharacterAssets struct {
	FaceID      int      `json:"face_id"`      // 1-20
	AccessoryID int      `json:"accessory_id"` // 1-20 or 0 for none
	Mood        string   `json:"mood"`
	Category    string   `json:"category"`
	Keywords    []string `json:"keywords"`
}
