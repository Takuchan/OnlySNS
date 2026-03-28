# Phase 4 Deployment & Setup Guide

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Go 1.21+ (for backend development - optional if using Docker)

### Step 1: Start Docker Services

```bash
cd /home/tk/OnlySNS

# Start all services (PostgreSQL, Ollama, Backend, Frontend)
docker-compose up -d

# Check service status
docker-compose ps
```

**Services:**
- **PostgreSQL** → Port 5432
- **Ollama** → Port 11434 (pulls llama3.2 and nomic-embed-text on first run)
- **Backend (Go)** → Port 8080
- **Frontend (Next.js)** → Port 3000

### Step 2: Verify Backend is Running

```bash
# Wait 10-15 seconds for all services to start
# Check backend health
curl http://localhost:8080/api/v1/posts

# Should return JSON response (empty posts array is fine)
```

### Step 3: Access the Application

Open browser and navigate to: **http://localhost:3000**

---

## First Run - Testing Character Growth

### 1. Create Your First Post

Go to http://localhost:3000 → Enter text → Submit

Example post content:
```
Goでマイクロサービスアーキテクチャを勉強中。REST APIの設計が難しいな。
```

### 2. Check Character Progression

On the right sidebar, you should see:
- Character display with stage indicator
- Progress bar showing progress to next stage
- Stage name (赤ちゃん)

### 3. Create More Posts to Progress

| Posts | Stage | Character |
|-------|-------|-----------|
| 1-4 | 赤ちゃん (Baby) | 👶 |
| 5-14 | 幼稚園 (Kindergarten) | 🧒 |
| 15-29 | 小学生 (Elementary) | 🧑‍🎓 |
| 30-49 | 中学生 (Middle) | 👨‍🎓 |
| 50+ | 大人 (Adult) | 🧑‍💼 |

### 4. Reach Adult Stage (50 posts)

Once you create 50 posts, character reaches Adult stage and:
- Face expression changes based on post mood
- Accessory appears based on post category
- Shows keywords from analysis

---

## API Endpoints Reference

### Character Endpoints

#### Get Character State
```bash
GET http://localhost:8080/api/v1/character/state?user_id=default-user

Response:
{
  "character_state": {
    "id": "uuid",
    "user_id": "default-user",
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

#### Get Post Analysis
```bash
GET http://localhost:8080/api/v1/posts/{post_id}/analysis

Response:
{
  "analysis": {
    "id": "uuid",
    "post_id": "post-uuid",
    "category": "Programming",
    "mood": "excited",
    "keywords": ["Go", "マイクロサービス", "REST"],
    "analysis_data": "{\"category\":\"Programming\",...}",
    "created_at": "2026-03-28T10:25:00Z"
  }
}
```

#### Get Character Assets (for Adult stage)
```bash
GET http://localhost:8080/api/v1/posts/{post_id}/character-assets

Response:
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

## Frontend Integration Points

### 1. Main Dashboard (Home Page)
- Character display in right sidebar under "Your Learning Journey"
- Shows current stage and progress bar
- Size: medium (w-32 h-32)

### 2. Post Card
- Mini character (w-24 h-24) appears to the right of engagement metrics
- For non-logged-in posts: shows static stage character
- For posts in Adult stage: shows dynamic mood + category assets

### 3. How to Use Character Component

```tsx
import Character from '@/components/Character';

// Get current user's character
<Character sizeClass="medium" />

// Get character state for specific user
<Character userId="user-123" sizeClass="large" />

// For post-specific display (Adult stage only)
<Character postId={postId} sizeClass="small" />
```

**Size Options:**
- `small` - 96px (w-24 h-24)
- `medium` - 128px (w-32 h-32)
- `large` - 192px (w-48 h-48)

---

## Backend Development

### Modifying AI Prompts

Edit: [backend/internal/service/ai_service.go](../backend/internal/service/ai_service.go)

Key methods to update:
- `GenerateTags()` - Tag generation
- `Tsukkomi()` - Friendly feedback
- `GenerateQuiz()` - Quiz creation
- `AnalyzeContent()` - Post categorization/mood

### Modifying Character Growth Logic

Edit: [backend/internal/usecase/character_usecase.go](../backend/internal/usecase/character_usecase.go)

Key methods:
- `UpdateCharacterGrowth()` - Stage progression thresholds
- `mapAnalysisToAssets()` - Face/accessory mapping

### Updating Database Schema

Edit: [backend/db/migrations/002_character_growth_system.sql](../backend/db/migrations/002_character_growth_system.sql)

---

## Frontend Development

### Modifying Character Appearance

Edit: [frontend/components/Character.tsx](../frontend/components/Character.tsx)

Key sections:
- `STAGE_COLORS` - Stage background colors
- `STAGE_NAMES` - Japanese stage names
- `FACE_EMOJIS` - Face expressions (1-20)
- `ACCESSORY_NAMES` - Accessory display names
- `ACCESSORY_ICONS` - Accessory emojis

### Adding New Categories (for Adult stage)

1. Add to backend `domain/character.go`:
```go
CategoryNewTopic ContentCategory = "New Topic"
```

2. Add mapping in `character_usecase.go`:
```go
"New Topic": 18, // accessory ID
```

3. Add icon in frontend `Character.tsx`:
```typescript
18: '🆕', // New icon
```

---

## Troubleshooting

### Issue: Character shows "failed to load" or error

**Solution:** Check if backend is running
```bash
docker-compose logs backend
# Look for any error messages in logs
```

### Issue: Posts aren't progressing character stage

**Solution:** Verify database migration ran
```bash
psql postgres://onlysns:onlysns_secret@localhost:5432/onlysns -c "
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name='character_states';"

# Should return: character_states
```

### Issue: AI Analysis returns errors

**Solution:** Check Ollama is running with correct models
```bash
curl http://localhost:11434/api/tags
# Should show llama3.2:latest and nomic-embed-text
```

### Issue: Frontend doesn't show character component

**Solution:**
1. Check browser console for errors (F12)
2. Verify Next.js is running: `docker-compose logs frontend`
3. Clear Next.js cache: `rm -rf .next` in frontend directory

---

## Monitoring & Debugging

### View Backend Logs
```bash
docker-compose logs -f backend
```

### View Frontend Logs
```bash
docker-compose logs -f frontend
```

### View Database
```bash
# Connect to PostgreSQL
psql postgres://onlysns:onlysns_secret@localhost:5432/onlysns

# List tables
\dt

# Check post analysis
SELECT * FROM post_analysis;

# Check character states
SELECT * FROM character_states;
```

### Call Backend API via CLI

```bash
# Get all posts
curl http://localhost:8080/api/v1/posts

# Create a post
curl -X POST http://localhost:8080/api/v1/posts \
  -F "content=Test post about Go programming"

# Get character state
curl "http://localhost:8080/api/v1/character/state?user_id=default-user"
```

---

## Performance Tips

### Reduce AI Response Time

1. **Lower temperature** in AI service:
```go
// Current: 0.7 for Tsukkomi, 0.2 for deterministic tasks
// Lower = faster, more consistent
// Higher = slower, more creative
```

2. **Shorter max tokens** in prompts - helps Ollama respond faster

3. **Pre-warm Ollama models**:
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2",
  "prompt": "hello",
  "stream": false
}'
```

### Reduce Frontend Load Times

1. **Character component caching**:
   - Already uses React hooks to avoid refetching
   - Browser caches API responses with `cache: 'no-store'`

2. **Lazy load character on scroll** (for future optimization)

---

## Database Maintenance

### Backup Character Data
```bash
pg_dump postgres://onlysns:onlysns_secret@localhost:5432/onlysns \
  --table=character_states \
  --table=post_analysis \
  > character_backup.sql
```

### Reset Character System (Development Only)
```bash
psql postgres://onlysns:onlysns_secret@localhost:5432/onlysns -c "
DROP TABLE IF EXISTS post_analysis CASCADE;
DROP TABLE IF EXISTS character_states CASCADE;
DROP TABLE IF EXISTS users CASCADE;
"

# Then restart backend to re-run migrations
docker-compose restart backend
```

---

## Next Steps / Future Enhancements

### Implement User Authentication
- Replace "default-user" with actual user IDs from auth system
- Isolate character data per user

### Add More Content Categories
- Expand beyond current 9 categories
- Allow user-defined categories

### Enhance Character Visuals
- Replace emojis with SVG/PNG assets (20 faces × 20 accessories = 400 possible combinations)
- Add animation when stage upgrades
- Show achievement badges

### Advanced AI Features
- Track learning velocity (posts/week)
- Personality system that adapts to user's pattern
- Predictive stage upgrade notifications

### Social Features
- Share character progression
- Compare character growth with friends
- Unlock special character designs

---

## Support & Documentation

For more details, see:
- [PHASE4_IMPLEMENTATION.md](../PHASE4_IMPLEMENTATION.md) - Full technical documentation
- Backend code: [backend/internal/](../backend/internal/)
- Frontend code: [frontend/](../frontend/)
- Database migrations: [backend/db/migrations/](../backend/db/migrations/)
