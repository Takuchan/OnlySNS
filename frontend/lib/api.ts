const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Media {
  id: string;
  post_id: string;
  url: string;
  media_type: 'image' | 'video' | 'gif';
  created_at: string;
}

export interface CodeSnippet {
  id: string;
  post_id: string;
  code: string;
  language: string;
  line_count: number;
  created_at: string;
}

export interface Post {
  id: string;
  content: string;
  tags: string[];
  char_count: number;
  created_at: string;
  updated_at: string;
  likes: number;
  shares: number;
  target_likes: number;
  target_shares: number;
  media: Media[];
  code_snippets: CodeSnippet[];
}

export interface OGPPreview {
  title: string;
  description: string;
  image: string;
  url: string;
}

export interface Quiz {
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

export interface DailyActivity {
  date: string;   // YYYY-MM-DD
  count: number;
}

export interface ActivityResponse {
  activity: DailyActivity[];
}

export async function getPosts(page = 1, limit = 20): Promise<PostsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/posts?page=${page}&limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function createPost(formData: FormData): Promise<Post> {
  const res = await fetch(`${API_BASE}/api/v1/posts`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create post');
  }
  return res.json();
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete post');
}

export async function likePost(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${id}/like`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to like post');
  const data = await res.json();
  return data.likes as number;
}

export async function repostPost(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${id}/repost`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to repost');
  const data = await res.json();
  return data.reposts as number;
}

export async function fetchOGP(url: string): Promise<OGPPreview> {
  const params = new URLSearchParams({ url });
  const res = await fetch(`${API_BASE}/api/v1/ogp?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch preview');
  }
  return res.json();
}

export async function getLatestTsukkomi(): Promise<{ message: string; post_id?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/tsukkomi/latest`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'つっこみの取得に失敗しました');
  }
  return res.json();
}

export async function simplifyPost(id: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/ai/posts/${id}/simplify`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'やさしい説明の生成に失敗しました');
  }
  const data = await res.json();
  return data.simplified as string;
}

export async function generateQuiz(id: string): Promise<Quiz> {
  const res = await fetch(`${API_BASE}/api/v1/ai/posts/${id}/quiz`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '4択クイズの生成に失敗しました');
  }
  return res.json();
}

export async function getRelatedPosts(id: string, limit = 3): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/api/v1/ai/posts/${id}/related?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch related posts');
  const data = await res.json();
  return (data.posts || []) as Post[];
}

export interface SearchParams {
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function searchPosts(params: SearchParams): Promise<PostsResponse> {
  const p = new URLSearchParams();
  if (params.q) p.set('q', params.q);
  if (params.from) p.set('from', params.from);
  if (params.to) p.set('to', params.to);
  if (params.page) p.set('page', String(params.page));
  if (params.limit) p.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/api/v1/search?${p.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to search posts');
  return res.json();
}

export async function getActivity(days = 365): Promise<ActivityResponse> {
  const res = await fetch(`${API_BASE}/api/v1/activity?days=${days}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json();
}

export function getExportURL(format: 'json' | 'csv', from?: string, to?: string): string {
  const params = new URLSearchParams({ format });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `${API_BASE}/api/v1/export?${params.toString()}`;
}

// Character Growth & Customization Types
export interface CharacterState {
  id: string;
  user_id: string;
  current_stage: number; // 1-5
  total_posts: number;
  total_study_points: number;
  base_type: string; // 'male', 'female', 'neutral', 'animal'
  last_updated: string;
  created_at: string;
}

export interface PostAnalysis {
  id: string;
  post_id: string;
  category: string; // Programming, Language Learning, Fitness, Philosophy, Art, Science, Design, Mathematics, Other
  mood: string; // serious, joyful, struggling, proud, curious, thoughtful, excited
  keywords: string[];
  analysis_data: string;
  created_at: string;
}

export interface CharacterAssets {
  face_id: number; // 1-20
  accessory_id: number; // 0-20 (0 = no accessory)
  mood: string;
  category: string;
  keywords: string[];
}

// Character API Functions
export async function getCharacterState(userId?: string): Promise<{ character_state: CharacterState; stage_name: string }> {
  const params = new URLSearchParams();
  if (userId) params.set('user_id', userId);
  const res = await fetch(`${API_BASE}/api/v1/character/state?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch character state');
  return res.json();
}

export async function getPostAnalysis(postId: string): Promise<{ analysis: PostAnalysis }> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${postId}/analysis`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch post analysis');
  return res.json();
}

export async function getCharacterAssets(postId: string): Promise<{ assets: CharacterAssets }> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${postId}/character-assets`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch character assets');
  return res.json();
}
