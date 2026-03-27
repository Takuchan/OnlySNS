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

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
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

export function getExportURL(format: 'json' | 'csv', from?: string, to?: string): string {
  const params = new URLSearchParams({ format });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return `${API_BASE}/api/v1/export?${params.toString()}`;
}
