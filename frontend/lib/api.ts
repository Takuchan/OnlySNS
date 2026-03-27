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

export interface OGPData {
  title: string;
  description: string;
  image: string;
  url: string;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  content: string;
  char_count: number;
  created_at: string;
  updated_at: string;
  likes: number;
  shares: number;
  target_likes: number;
  target_shares: number;
  media: Media[];
  code_snippets: CodeSnippet[];
  comments: Comment[];
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

export async function unlikePost(id: string): Promise<number> {
  const res = await fetch(`${API_BASE}/api/v1/posts/${id}/like`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to unlike post');
  const data = await res.json();
  return data.likes as number;
}

export async function fetchOGP(url: string): Promise<OGPData> {
  const params = new URLSearchParams({ url });
  const res = await fetch(`${API_BASE}/api/v1/ogp?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch OGP');
  return res.json();
}

export async function analyzeText(text: string): Promise<{ words: Array<{ word: string; count: number }> }> {
  const res = await fetch(`${API_BASE}/api/v1/analyze/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to analyze text');
  return res.json();
}

export async function aiCodeReview(code: string, language: string): Promise<{ response: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/code-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language }),
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}

export async function aiSummarize(content: string): Promise<{ response: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}

export async function aiExtractEntities(content: string): Promise<{ response: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/extract-entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}

export async function aiNextStep(topics: string[]): Promise<{ response: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/next-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics }),
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}

export async function aiCaption(imageFile: File): Promise<{ response: string }> {
  const formData = new FormData();
  formData.append('image', imageFile);
  const res = await fetch(`${API_BASE}/api/v1/ai/caption`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('AI unavailable');
  return res.json();
}
