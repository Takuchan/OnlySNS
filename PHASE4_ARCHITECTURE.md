# Phase 4 Architecture & Developer Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React)                                        │
│  ├─ Character Component (Stage display + Adult assets)          │
│  ├─ PostCard (with mini character overlay)                      │
│  ├─ Dashboard (main character display)                          │
│  └─ Theme & Responsive Design                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    HTTP/REST (JSON)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│              BACKEND API LAYER (Go/Gin)                         │
├──────────────────────────────────────────────────────────────────┤
│  POST Handlers              Character Handlers                   │
│  ├─ CreatePost              ├─ GetCharacterState               │
│  ├─ ListPosts               ├─ GetPostAnalysis                 │
│  ├─ DeletePost              └─ GetCharacterAssets               │
│  └─ ...                                                          │
│                                                                  │
│  Routing (Gin)                                                  │
│  └─ /api/v1/character/*                                         │
│  └─ /api/v1/posts/:id/*                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
        Usecase Layer     AI Layer      DB Layer
            │              │              │
┌───────────▼─────┐ ┌──────▼──────┐ ┌───▼──────────┐
│ CHARACTER       │ │ AI SERVICE  │ │ REPOSITORIES│
│ USECASE         │ │ (llama3.2)  │ │ (PostgreSQL)│
│                 │ │             │ │             │
│ ├─ Get State    │ │ ├─ Generate │ │ ├─ Character│
│ ├─ Analyze Post │ │ │   Tags    │ │ │   State   │
│ ├─ Update Growth│ │ ├─ Tsukkomi │ │ ├─ Post     │
│ ├─ Map Assets   │ │ ├─ Quiz     │ │ │   Analysis│
│ └─ Process Post │ │ ├─ Analyze  │ │ └─ Posts    │
│                 │ │ │   Content │ │             │
│ (Business Logic)│ │ └─(Ollama)  │ │(Persistence)│
└─────────────────┘ └─────────────┘ └─────────────┘
                           │
                    ┌──────▼──────────┐
                    │ OLLAMA  SERVER  │
                    │ (Local LLM)     │
                    │                 │
                    │ ├─ llama3.2     │
                    │ │   (generation)│
                    │ └─nomic-embed   │
                    │    (embeddings) │
                    └─────────────────┘

                    ┌──────────────────┐
                    │ POSTGRESQL       │
                    │ (Data Storage)   │
                    │                  │
                    │ ├─ posts         │
                    │ ├─ users         │
                    │ ├─ character_    │
                    │ │   states       │
                    │ └─ post_analysis │
                    └──────────────────┘
```

---

## Data Flow Diagrams

### When User Creates a New Post

```
1. Frontend
   └─ PostForm.tsx
      └─ User clicks "Post" button

2. API Call
   └─ POST /api/v1/posts
      └─ Form data → Backend

3. Backend HandlerLayer
   └─ postHandler.CreatePost()
      └─ Validate input
      └─ Save post to DB

4. AI Analysis (NEW!)
   └─ characterUsecase.ProcessNewPost()
      ├─ aiService.AnalyzeContent()
      │  └─ Call Ollama with few-shot prompt
      │  └─ Get analysis (category, mood, keywords)
      ├─ analysisRepo.Create()
      │  └─ Store analysis in DB
      ├─ characterRepo.IncrementPostCount()
      │  └─ +1 post, +points
      └─ characterUsecase.UpdateCharacterGrowth()
         └─ Check if threshold reached
         └─ Update stage if needed

5. Response
   └─ Return post data to frontend

6. Frontend Update
   └─ Character component fetches new state
   └─ Re-renders with updated stage/assets
```

### When User Views Post (Adult Stage)

```
1. PostCard Component
   └─ Receives post ID

2. Render Post Content
   └─ Display text, media, code

3. Load Character
   └─ Character.tsx useEffect
      ├─ Fetch character state
      ├─ If stage === 5 (Adult)
      │  └─ Fetch post analysis
      └─ If analysis exists
         └─ Map to face_id + accessory_id

4. API Calls
   ├─ GET /api/v1/character/state?user_id=default-user
   and
   └─ GET /api/v1/posts/:id/analysis
   and (if Adult stage)
   └─ GET /api/v1/posts/:id/character-assets

5. Render Adult Character
   └─ Face emoji (1-20 based on mood)
   └─ Accessory icon (0-20 based on category)
   └─ Keywords/metadata
```

---

## Data Models

### Database Schema

```sql
-- Users (minimal for now)
users {
    id: UUID
    created_at: TIMESTAMP
    updated_at: TIMESTAMP
}

-- Character Growth Tracking
character_states {
    id: UUID
    user_id: UUID (FK → users)
    current_stage: INT (1-5)
    total_posts: INT
    total_study_points: BIGINT
    base_type: VARCHAR (male|female|neutral|animal)
    last_updated: TIMESTAMP
    created_at: TIMESTAMP
}

-- Post Content Analysis
post_analysis {
    id: UUID
    post_id: UUID (FK → posts, UNIQUE)
    category: VARCHAR
    mood: VARCHAR
    keywords: TEXT[]
    analysis_data: JSONB
    created_at: TIMESTAMP
}
```

### Go Domain Models

```go
// Character growth constants
const (
    CharacterStageBaby = 1
    CharacterStageKindergarten = 2
    CharacterStageElementary = 3
    CharacterStageMiddle = 4
    CharacterStageAdult = 5
)

// Character state
CharacterState {
    ID: string
    UserID: string
    CurrentStage: int (1-5)
    TotalPosts: int
    TotalStudyPoints: int64
    BaseType: string
    LastUpdated: time.Time
    CreatedAt: time.Time
}

// Post analysis result
PostAnalysis {
    ID: string
    PostID: string
    Category: string (Programming|Language Learning|...|Other)
    Mood: string (serious|joyful|struggling|proud|curious|thoughtful|excited)
    Keywords: []string
    AnalysisData: string (JSON)
    CreatedAt: time.Time
}

// Visual assets for rendering
CharacterAssets {
    FaceID: int (1-20)
    AccessoryID: int (0-20)
    Mood: string
    Category: string
    Keywords: []string
}
```

### TypeScript Frontend Models

```typescript
interface CharacterState {
    id: string
    user_id: string
    current_stage: number
    total_posts: number
    total_study_points: number
    base_type: string
    last_updated: string
    created_at: string
}

interface PostAnalysis {
    id: string
    post_id: string
    category: string
    mood: string
    keywords: string[]
    analysis_data: string
    created_at: string
}

interface CharacterAssets {
    face_id: number
    accessory_id: number
    mood: string
    category: string
    keywords: string[]
}
```

---

## API Endpoint Reference

### Character State Endpoint
```
GET /api/v1/character/state?user_id={userId}

Query Parameters:
  - user_id (optional): User identifier, defaults to "default-user"

Response 200:
{
    "character_state": CharacterState,
    "stage_name": string     // Japanese stage name
}

Response 500:
{
    "error": "failed to get character state"
}
```

### Post Analysis Endpoint
```
GET /api/v1/posts/{id}/analysis

Path Parameters:
  - id: Post ID (UUID)

Response 200:
{
    "analysis": PostAnalysis
}

Response 404:
{
    "error": "post analysis not found"
}

Response 500:
{
    "error": "failed to fetch post analysis"
}
```

### Character Assets Endpoint
```
GET /api/v1/posts/{id}/character-assets

Path Parameters:
  - id: Post ID (UUID)

Response 200:
{
    "assets": CharacterAssets
}

Response 400:
{
    "error": "post_id is required"
}

Response 500:
{
    "error": "failed to get character assets"
}
```

---

## Code Organization

```
backend/
├── cmd/
│   └── api/
│       └── main.go                    # Entry point, service initialization
├── db/
│   └── migrations/
│       ├── 001_initial.sql            # Original schema
│       └── 002_character_growth_system.sql  # Phase 4 schema (NEW)
└── internal/
    ├── domain/
    │   ├── post.go                    # Original post models
    │   └── character.go               # NEW: Character models & constants
    ├── handler/
    │   ├── post_handler.go
    │   ├── character_handler.go       # NEW: Character endpoints
    │   └── router.go                  # Updated: Register routes
    ├── repository/
    │   ├── repository.go              # Updated: Character interfaces
    │   └── postgres/
    │       ├── post_repository.go
    │       ├── character_repository.go        # NEW: Character storage
    │       └── post_analysis_repository.go    # NEW: Analysis storage
    ├── service/
    │   ├── ai_service.go              # Updated: Few-shot + new AnalyzeContent()
    │   ├── ollama_client.go           # Unchanged
    │   └── ogp_service.go
    ├── usecase/
    │   ├── post_usecase.go
    │   └── character_usecase.go       # NEW: Character business logic
    └── worker/
        └── engagement_worker.go

frontend/
├── app/
│   ├── page.tsx                       # Updated: Added Character display
│   ├── layout.tsx
│   ├── globals.css
│   └── analytics/
├── components/
│   ├── Character.tsx                  # NEW: Main character component
│   ├── PostCard.tsx                   # Updated: Mini character display
│   ├── PostForm.tsx
│   └── ...
├── lib/
│   ├── api.ts                         # Updated: Character API functions
│   └── theme.tsx
└── public/
```

---

## Development Workflow

### Adding a New Content Category

1. **Backend (Domain)**
   ```go
   // backend/internal/domain/character.go
   const CategoryNewTopic ContentCategory = "NewTopic"
   ```

2. **Backend (Asset Mapping)**
   ```go
   // backend/internal/usecase/character_usecase.go
   func mapAnalysisToAssets(analysis *domain.PostAnalysis) {
       accessoryMap := map[string]int{
           "NewTopic": 18,  // Add your accessory ID
       }
   }
   ```

3. **AI Prompt (to recognize category)**
   ```go
   // backend/internal/service/ai_service.go
   // Update AnalyzeContent() few-shot examples
   ```

4. **Frontend (Assets)**
   ```typescript
   // frontend/components/Character.tsx
   const ACCESSORY_NAMES = {
       18: "NewAccessory",
   }
   const ACCESSORY_ICONS = {
       18: "🆕",
   }
   ```

5. **Test**
   - Create post about the new topic
   - Verify analysis includes correct category
   - Check character displays correct asset in Adult stage

### Modifying Stage Thresholds

1. Edit `backend/internal/usecase/character_usecase.go`
   ```go
   // UpdateCharacterGrowth()
   if state.TotalPosts >= 100 {  // Change from 50
       newStage = domain.CharacterStageAdult
   } else if state.TotalPosts >= 60 {  // Change from 30
       newStage = domain.CharacterStageMiddle
   }
   // ... etc
   ```

2. Update documentation
3. Consider data migration for existing users
4. Test stage progression

### Updating AI Prompts

1. Edit the method in `backend/internal/service/ai_service.go`
2. Update schema definition
3. Add/modify few-shot examples
4. Test with local Ollama:
   ```bash
   curl http://localhost:11434/api/generate -d '{
       "model": "llama3.2",
       "prompt": "Your test prompt here",
       "format": "json",
       "stream": false
   }'
   ```

---

## Error Handling Strategy

### Frontend
```typescript
// Character component gracefully handles:
- Loading state (skeleton)
- Network errors (fallback UI)
- Empty analysis (default assets)
- API failures (generic error message)
```

### Backend
```go
// Graceful degradation:
1. AI analysis fails → Use default assets
2. Database fails → Return error with context
3. User doesn't exist → Auto-create on first access
4. Post analysis missing → Return default face (1) + no accessory (0)
```

---

## Performance Considerations

### Optimizations Already Implemented

1. **Component Memoization**: Character component uses React hooks efficiently
2. **API Caching**: Frontend fetch uses `no-store` to ensure fresh data
3. **Lazy Loading**: Character analysis only fetched if postId provided and stage is Adult
4. **Few-Shot Prompting**: Improves model response time vs trial-and-error

### Future Optimizations

1. **Database Indexing**: Add indices on frequently queried columns
2. **Response Caching**: Cache character state for 30-60 seconds
3. **Batch Analysis**: Analyze multiple posts in one AI call
4. **Incremental Loading**: Show character skeleton while loading assets
5. **WebSocket Updates**: Real-time character stage updates

---

## Testing Strategy

### Unit Tests (Backend)
```go
// Test mapAnalysisToAssets
// Test UpdateCharacterGrowth stage logic
// Test Ollama prompt generation
// Test repository operations
```

### Integration Tests
```bash
# Test full flow: post → analysis → stage update → character render
# Test API endpoints
# Test database migrations
```

### Frontend Testing
```typescript
// Component rendering at different stages
// API call handling and fallbacks
// Asset mapping correctness
```

### E2E Tests
```bash
# Create post → verify analysis → check character progression
# Reach Adult stage → verify dynamic assets
# Test across different post categories
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Clear frontend build cache
- [ ] Verify Ollama models are downloaded
- [ ] Test all character endpoints
- [ ] Check AI response quality with few-shot examples
- [ ] Verify character rendering at all sizes
- [ ] Test stage progression (1 post, 5 posts, 15, 30, 50)
- [ ] Check Adult stage asset mapping
- [ ] Verify error handling (missing analysis, API failures)
- [ ] Load test with multiple concurrent posts
- [ ] Monitor Ollama memory usage
- [ ] Test on production database backup

---

## Monitoring & Metrics

### Key Metrics to Track

1. **AI Response Time**: How long does analysis take?
   - Average: Should be < 2 seconds
   - P95: Should be < 5 seconds

2. **Character Stage Distribution**: How many users in each stage?
   - Track progression over time

3. **Analysis Success Rate**: % of posts that get analyzed successfully

4. **Asset Diversity**: Which categories/moods are most common?

5. **Frontend Load Time**: Character component doesn't slow down page

### Debug Logging

```go
// Add to ai_service.go for timing
start := time.Now()
result, err := s.client.GenerateJSON(ctx, prompt)
duration := time.Since(start)
log.Printf("AI analysis took %v", duration)
```

---

## FAQ for Developers

**Q: Why emoji for character faces instead of images?**
A: Simple, fast, requires no asset files, works immediately, easy to update.

**Q: How does "few-shot prompting" work?**
A: By including 2-3 examples of input/output, we guide the AI model to produce better results without training.

**Q: What if Ollama is down?**
A: System returns default values (empty tags, generic tsukkomi, default character) and logs error.

**Q: Can I change stage thresholds for different users?**
A: Currently uses global thresholds. User-specific progression would require a difficulty setting per user.

**Q: How do I add a new mood/expression?**
A: Add face_id → emoji mapping in Character.tsx's FACE_EMOJIS, update few-shot examples in ai_service.go

**Q: Is the character data private per user?**
A: Currently single "default-user". With auth system, each user has isolated character_states.

---

For more information, see:
- [PHASE4_IMPLEMENTATION.md](./PHASE4_IMPLEMENTATION.md)
- [PHASE4_SETUP_GUIDE.md](./PHASE4_SETUP_GUIDE.md)
- Backend code: `backend/internal/`
- Frontend code: `frontend/`
