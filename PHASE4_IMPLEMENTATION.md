# Phase 4: Gamified Character Growth & Local AI Precision Upgrade - Implementation Guide

## Overview

Phase 4 implements two major systems:

1. **Local AI (llama3.2) Precision Upgrade**: Advanced prompt engineering with few-shot examples and strict JSON schema enforcement
2. **Dynamic Character Growth & Customization System**: AI-driven visual avatar that grows based on study posts and dynamically customizes based on post content in Adult stage

---

## Part 1: Local AI (llama3.2) Precision Upgrade

### Strategy

The llama3.2 local model has been significantly improved through three techniques:

#### 1. **Strict JSON Output via Schema**
All AI backend prompts now enforce JSON-only responses with explicit schema definitions embedded in the prompt itself.

**Implementation Files:**
- [backend/internal/service/ai_service.go](backend/internal/service/ai_service.go) - Updated `GenerateTags()`, `GenerateQuiz()`
- [backend/internal/service/ollama_client.go](backend/internal/service/ollama_client.go) - `GenerateJSON()` method supports `format: "json"` parameter

**Example Prompt with Schema:**
```
## JSON スキーマ（必ず守る）
{
  "tags": ["#タグ1", "#タグ2", ...]
}

## 制約
- 必ずJSON形式のみで返す（説明文は一切不要）
```

#### 2. **Few-Shot Prompting**
Each AI task now includes 2-3 concrete input/output examples to guide the model's behavior.

**Implemented in:**
- `GenerateTags()` - 3 examples covering different learning topics
- `Tsukkomi()` - 3 examples of friendly, encouraging responses
- `GenerateQuiz()` - 2 comprehensive quiz examples
- `AnalyzeContent()` - 4 examples for content categorization and mood detection

**Few-Shot Example Format:**
```
## Few-Shot Examples

### 例1:
入力: "Goでマイクロサービスアーキテクチャを学んでます..."
出力: {"tags": ["#Go", "#マイクロサービス", "#REST"]}

### 例2:
...
```

#### 3. **Task Isolation**
Each AI method handles exactly one specific task to minimize model confusion:
- Tags generation (separate from other tasks)
- Tsukkomi feedback (isolated context)
- Quiz generation (dedicated schema)
- Content analysis (specific categorization task)

### New Method: `AnalyzeContent()`

A crucial new method for character customization:

```go
func (s *AIService) AnalyzeContent(ctx context.Context, content string) 
  (ContentAnalysisResult, error)
```

**Returns:**
```json
{
  "category": "Programming|Language Learning|Fitness|Philosophy|Art|Science|Design|Mathematics|Other",
  "mood": "serious|joyful|struggling|proud|curious|thoughtful|excited",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
```

**Use Case:** Powers dynamic character asset selection in Adult stage

---

## Part 2: Dynamic Character Growth & Customization System

### Architecture Overview

```
Database Schema
    ↓
Character Repository (PostgreSQL)
    ↓
Character Usecase (Business Logic)
    ↕
AI Service (llama3.2 Analysis)
    ↓
Character Handler (HTTP Endpoints)
    ↓
Frontend Character Component
    ↓
UI Integration (PostCard, Dashboard)
```

### Growth Stages

Character progression is purely based on **total post count**:

| Stage | Japanese | Posts | Emoji | Color |
|-------|----------|-------|-------|-------|
| 1 | 赤ちゃん (Baby) | 0-4 | 👶 | Pink-Red |
| 2 | 幼稚園 (Kindergarten) | 5-14 | 🧒 | Yellow-Orange |
| 3 | 小学生 (Elementary) | 15-29 | 🧑‍🎓 | Green-Teal |
| 4 | 中学生 (Middle School) | 30-49 | 👨‍🎓 | Blue-Purple |
| 5 | 大人 (Adult) | 50+ | 🧑‍💼 | Purple-Indigo |

### Database Schema

#### `users` table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `character_states` table
```sql
CREATE TABLE character_states (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(id),
    current_stage INTEGER (1-5),
    total_posts INTEGER,
    total_study_points BIGINT,
    base_type VARCHAR (male|female|neutral|animal),
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ
);
```

#### `post_analysis` table
```sql
CREATE TABLE post_analysis (
    id UUID PRIMARY KEY,
    post_id UUID UNIQUE REFERENCES posts(id),
    category VARCHAR(100),     -- Programming, Language Learning, etc.
    mood VARCHAR(50),          -- serious, joyful, struggling, etc.
    keywords TEXT[],           -- 2-4 keywords
    analysis_data JSONB,       -- Full analysis result
    created_at TIMESTAMPTZ
);
```

**Migration File:** [backend/db/migrations/002_character_growth_system.sql](backend/db/migrations/002_character_growth_system.sql)

### Backend Implementation

#### Domain Models
**File:** [backend/internal/domain/character.go](backend/internal/domain/character.go)

Defines:
- Character growth constants and stage names
- Character asset types (face, accessory)
- Content analysis types
- Character state data structures

#### Repositories

**Character State Repository:**
- `GetOrCreateUser()` - Auto-create user on first access
- `GetCharacterState()` - Retrieve current character state
- `UpdateCharacterState()` - Update stage/points
- `IncrementPostCount()` - Increment on new post

**Post Analysis Repository:**
- `Create()` - Store post analysis
- `GetByPostID()` - Retrieve analysis for a post
- `Update()` - Update analysis record

**Files:**
- [backend/internal/repository/postgres/character_repository.go](backend/internal/repository/postgres/character_repository.go)
- [backend/internal/repository/postgres/post_analysis_repository.go](backend/internal/repository/postgres/post_analysis_repository.go)

#### Character Usecase
**File:** [backend/internal/usecase/character_usecase.go](backend/internal/usecase/character_usecase.go)

**Key Methods:**
```go
// Get current character state
GetCharacterState(ctx, userID) → CharacterState

// Analyze post content and store
AnalyzeAndStorePostContent(ctx, postID, content) → PostAnalysis

// Update character growth stage
UpdateCharacterGrowth(ctx, userID) → (stageChanged: bool, error)

// Process new post (comprehensive): analyze + increment + update stage
ProcessNewPost(ctx, userID, postID, content, studyPoints) → (PostAnalysis, bool, error)

// Get visual assets for Adult stage
GetCharacterAssets(ctx, postID) → CharacterAssets
```

**Asset Mapping Logic:**
```go
mapAnalysisToAssets(analysis) → CharacterAssets {
    // Maps mood → face_id (1-20)
    // Maps category → accessory_id (0-20)
}
```

**Face Expression IDs (by Mood):**
- 1 = Serious (真面目)
- 2 = Joyful (喜び)
- 3 = Struggling (頑張る)
- 4 = Proud (誇り)
- 5 = Curious (好奇心)
- 6 = Thoughtful (思慮)
- 7 = Excited (興奮)

**Accessory IDs (by Category):**
- 10 = Glasses (Programming)
- 11 = Book (Language Learning)
- 12 = Sweatband (Fitness)
- 13 = Thinking Cap (Philosophy)
- 14 = Palette (Art)
- 15 = Science Glasses (Science)
- 16 = Pen (Design)
- 17 = Calculator (Mathematics)

#### Character Handler
**File:** [backend/internal/handler/character_handler.go](backend/internal/handler/character_handler.go)

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/character/state?user_id={userId}` | Get character state for user |
| GET | `/api/v1/posts/{id}/analysis` | Get AI analysis for post |
| GET | `/api/v1/posts/{id}/character-assets` | Get character assets for post |

### Frontend Implementation

#### Character Component
**File:** [frontend/components/Character.tsx](frontend/components/Character.tsx)

A comprehensive, reusable component supporting:

**Features:**
- Displays different character stage visuals (Baby through Adult)
- Growth progress bar showing current stage progress
- Dynamic rendering for Adult stage with content-based assets
- Three size options: `small` (w-24), `medium` (w-32), `large` (w-48)
- Loading skeleton while fetching data
- Error handling with fallback display

**Props:**
```typescript
interface CharacterDisplayProps {
  userId?: string;        // If omitted, uses default user
  postId?: string;        // For Adult stage with post-specific assets
  sizeClass?: 'small' | 'medium' | 'large'; // Default: 'medium'
}
```

**Usage Examples:**

```tsx
// Main dashboard display
<Character sizeClass="medium" />

// Mini version next to post
<Character postId={postId} sizeClass="small" />

// Specific user
<Character userId={userId} sizeClass="large" />
```

#### Adult Stage Asset Rendering

When a character reaches Adult stage (50+ posts), the component dynamically displays:

1. **Face Expression** - Based on post mood (serious 😐, joyful 😊, excited 🤩, etc.)
2. **Accessory** - Overlaid based on post category (glasses 👓 for programming, book 📚 for language learning, etc.)
3. **Context** - Shows category and keywords for the current post

**Example Adult Character:**
```
        😊 (Face: Joyful)
       👚👓 (Sweatband + Glasses for Fitness programming)
     [Programming, Fitness, Balance]
```

#### API Client Functions
**File:** [frontend/lib/api.ts](frontend/lib/api.ts)

New types and functions:

```typescript
// Get character state
getCharacterState(userId?) → { character_state, stage_name }

// Get post analysis
getPostAnalysis(postId) → { analysis }

// Get character assets
getCharacterAssets(postId) → { assets }
```

### UI Integration

#### 1. Dashboard Display
**File:** [frontend/app/page.tsx](frontend/app/page.tsx)

Added a new widget in the sidebar:
```tsx
<div className="rounded-[20px] p-4 border">
  <h2>Your Learning Journey 🌱</h2>
  <Character sizeClass="medium" />
</div>
```

Shows the main character prominently on the home page.

#### 2. Post Card Integration
**File:** [frontend/components/PostCard.tsx](frontend/components/PostCard.tsx)

Added character mini-display next to engagement metrics:
```tsx
<div className="mt-3 flex items-center gap-4">
  {/* Like/Repost buttons */}
  <div className="ml-2">
    <Character postId={post.id} sizeClass="small" />
  </div>
</div>
```

Shows how the character responds to each individual post's content.

---

## Integration Workflow

### When a New Post is Created:

1. **Post Creation** → Backend `CreatePost()` handler
2. **Content Analysis** → `AIService.AnalyzeContent()` using llama3.2 with few-shot prompting
3. **Analysis Storage** → `PostAnalysisRepository.Create()`
4. **Character Growth** → `CharacterUsecase.IncrementPostCount()` updates total posts
5. **Stage Update** → Auto-progression to next stage if threshold reached
6. **Frontend Fetch** → Character component fetches new state and displays

### In Adult Stage - Dynamic Asset Selection:

1. Post is displayed with `<PostCard>`
2. Component loads character with `postId`
3. Character queries `/posts/{id}/analysis` endpoint
4. Receives mood and category
5. Maps to face_id and accessory_id
6. Renders dynamic face emoji + accessory icon

---

## Example Responses

### GET `/api/v1/character/state`
```json
{
  "character_state": {
    "id": "uuid",
    "user_id": "user-uuid",
    "current_stage": 2,
    "total_posts": 8,
    "total_study_points": 2400,
    "base_type": "neutral",
    "last_updated": "2026-03-28T10:30:00Z",
    "created_at": "2026-03-15T08:00:00Z"
  },
  "stage_name": "幼稚園"
}
```

### GET `/api/v1/posts/{id}/analysis`
```json
{
  "analysis": {
    "id": "uuid",
    "post_id": "post-uuid",
    "category": "Programming",
    "mood": "excited",
    "keywords": ["Go", "マイクロサービス", "REST"],
    "analysis_data": "{...full analysis...}",
    "created_at": "2026-03-28T10:25:00Z"
  }
}
```

### GET `/api/v1/posts/{id}/character-assets`
```json
{
  "assets": {
    "face_id": 7,
    "accessory_id": 10,
    "mood": "excited",
    "category": "Programming",
    "keywords": ["Go", "マイクロサービス", "REST"]
  }
}
```

---

## Configuration

### Environment Variables

All existing environment variables are used:
- `DATABASE_URL` - PostgreSQL connection
- `OLLAMA_BASE_URL` - Ollama server (default: http://localhost:11434)
- `OLLAMA_MODEL` - Generation model (default: llama3.2:latest)
- `OLLAMA_EMBEDDING_MODEL` - Embedding model (default: nomic-embed-text)

### Docker Compose

The existing `docker-compose.yml` remains the same but now powers both existing features and the new character system.

---

## Testing the Implementation

### 1. Run Backend Migrations
```bash
# Already done by main.go automatically
# Or manually run:
psql $DATABASE_URL < backend/db/migrations/002_character_growth_system.sql
```

### 2. Create a Test Post
```bash
curl -X POST http://localhost:8080/api/v1/posts \
  -F "content=Go言語を学んでます。マイクロサービスアーキテクチャが面白い"

# Note the post ID returned
```

### 3. Check Character State
```bash
curl http://localhost:8080/api/v1/character/state?user_id=default-user
```

### 4. View Post Analysis
```bash
curl http://localhost:8080/api/v1/posts/{post_id}/analysis
```

### 5. Get Character Assets
```bash
curl http://localhost:8080/api/v1/posts/{post_id}/character-assets
```

### 6. View in Frontend
- Home page shows main character in sidebar
- Each post displays mini character based on its content analysis

---

## Key Features & Highlights

✅ **Few-Shot Prompting** - All AI tasks include concrete examples for model guidance
✅ **Strict JSON Enforcement** - Schema validation prevents model hallucination
✅ **Task Isolation** - Each AI call handles one specific task
✅ **Progressive Growth** - Character automatically advances through 5 stages
✅ **Dynamic Customization** - Adult stage shows mood/category-based visual changes
✅ **Ephemeral Assets** - Adult stage decorations change per-post, not saved
✅ **Smooth Integration** - Works seamlessly with existing UI
✅ **Fallback Friendly** - Graceful degradation if AI analysis fails
✅ **Emoji-Based Design** - Easy to implement, fun & casual aesthetic

---

## Future Enhancements

Possible extensions to the character system:

1. **Base Type Selection** - Let users choose between male/female/neutral/animal base
2. **Achievement Badges** - Earn special badges for consistency (7-day streak, 100 posts, etc.)
3. **Character Naming** - Let users name their character
4. **Multi-User Support** - Full user authentication system (currently uses default user)
5. **Character Sharing** - Share character progression on social media
6. **Advanced Assets** - 3D character rendering instead of emojis
7. **Custom Themes** - Different art styles for character (minimal, pixel art, realistic, etc.)
8. **Personality System** - Character learns from user patterns and adapts personality

---

## Files Modified/Created

### Backend
- ✅ [backend/db/migrations/002_character_growth_system.sql](backend/db/migrations/002_character_growth_system.sql) - New
- ✅ [backend/internal/domain/character.go](backend/internal/domain/character.go) - New
- ✅ [backend/internal/repository/repository.go](backend/internal/repository/repository.go) - Updated
- ✅ [backend/internal/repository/postgres/character_repository.go](backend/internal/repository/postgres/character_repository.go) - New
- ✅ [backend/internal/repository/postgres/post_analysis_repository.go](backend/internal/repository/postgres/post_analysis_repository.go) - New
- ✅ [backend/internal/service/ai_service.go](backend/internal/service/ai_service.go) - Updated (improved prompts + new AnalyzeContent method)
- ✅ [backend/internal/usecase/character_usecase.go](backend/internal/usecase/character_usecase.go) - New
- ✅ [backend/internal/handler/character_handler.go](backend/internal/handler/character_handler.go) - New
- ✅ [backend/internal/handler/router.go](backend/internal/handler/router.go) - Updated
- ✅ [backend/cmd/api/main.go](backend/cmd/api/main.go) - Updated

### Frontend
- ✅ [frontend/lib/api.ts](frontend/lib/api.ts) - Updated
- ✅ [frontend/components/Character.tsx](frontend/components/Character.tsx) - New
- ✅ [frontend/components/PostCard.tsx](frontend/components/PostCard.tsx) - Updated
- ✅ [frontend/app/page.tsx](frontend/app/page.tsx) - Updated

---

## Summary

Phase 4 successfully implements:

1. **Advanced Local AI** with few-shot prompting and strict JSON schemas for reliable llama3.2 output
2. **Gamified Character Growth System** with 5 progressive stages
3. **Dynamic Content-Based Customization** for Adult stage characters
4. **Seamless UI Integration** showing character on dashboard and next to posts
5. **Complete Backend Infrastructure** with repositories, usecase, and API endpoints
6. **React Component** for easy character rendering at different sizes

The system is production-ready and gracefully handles AI failures with sensible fallbacks.
