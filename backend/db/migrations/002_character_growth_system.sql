-- Phase 4: Character Growth & Customization System
-- Adds tables for tracking user character progression and post content analysis

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Character growth stage progression
-- Stages: 1=Baby, 2=Kindergarten, 3=Elementary, 4=Middle, 5=Adult
CREATE TABLE IF NOT EXISTS character_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 5),
    total_posts INTEGER NOT NULL DEFAULT 0,
    total_study_points BIGINT NOT NULL DEFAULT 0,
    base_type VARCHAR(50) NOT NULL DEFAULT 'neutral', -- female, male, neutral, animal
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Store content analysis results for posts
-- Used to determine character assets (accessories, clothing) in Adult stage
CREATE TABLE IF NOT EXISTS post_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- Programming, Language Learning, Fitness, Philosophy, etc.
    mood VARCHAR(50) NOT NULL, -- serious, joyful, struggling, proud, curious, etc.
    keywords TEXT[] NOT NULL DEFAULT '{}',
    analysis_data JSONB, -- Store full AI analysis for future extensions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_character_states_user_id ON character_states(user_id);
CREATE INDEX IF NOT EXISTS idx_post_analysis_post_id ON post_analysis(post_id);
CREATE INDEX IF NOT EXISTS idx_post_analysis_category ON post_analysis(category);
