'use client';

import { useState } from 'react';
import { Post, likePost } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => void;
}

function linkifyContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="hover:underline break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PostCard({ post, onDelete }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = JSON.parse(localStorage.getItem('likedPosts') || '[]') as string[];
      return stored.includes(post.id);
    } catch {
      return false;
    }
  });
  const [likeAnim, setLikeAnim] = useState(false);

  const media = post.media ?? [];
  const codeSnippets = post.code_snippets ?? [];

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const handleLike = async () => {
    if (liked) return;
    try {
      const newLikes = await likePost(post.id);
      setLikes(newLikes);
      setLiked(true);
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 300);
      // Persist liked state across page refreshes
      try {
        const stored = JSON.parse(localStorage.getItem('likedPosts') || '[]') as string[];
        if (!stored.includes(post.id)) {
          stored.push(post.id);
          localStorage.setItem('likedPosts', JSON.stringify(stored));
        }
      } catch {
        // localStorage unavailable, ignore
      }
    } catch {
      // silently fail
    }
  };

  return (
    <div
      className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm whitespace-pre-wrap break-words flex-1" style={{ color: 'var(--text-primary)' }}>
          {linkifyContent(post.content)}
        </p>
        <button
          onClick={() => onDelete(post.id)}
          className="transition-colors flex-shrink-0 text-sm"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          title="Delete post"
        >
          🗑️
        </button>
      </div>

      {codeSnippets.map(cs => (
        <div key={cs.id} className="mt-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {cs.language && (
            <div className="px-3 py-1 text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{cs.language}</div>
          )}
          <pre className="p-3 overflow-x-auto text-xs font-mono" style={{ backgroundColor: 'var(--code-bg)', color: 'var(--code-text)' }}>
            <code>{cs.code}</code>
          </pre>
        </div>
      ))}

      {media.length > 0 && (
        <div className={`mt-3 grid gap-2 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {media.map(m => {
            const src = m.url.startsWith('http') ? m.url : `${API_BASE}${m.url}`;
            if (m.media_type === 'video') {
              return (
                <video
                  key={m.id}
                  src={src}
                  controls
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={src}
                alt="media"
                className="w-full rounded-lg max-h-96 object-cover"
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 transition-all ${likeAnim ? 'like-pop' : ''}`}
          style={{
            color: liked ? 'var(--like-color)' : 'var(--text-muted)',
            cursor: liked ? 'default' : 'pointer',
          }}
          disabled={liked}
          title={liked ? 'Already liked' : 'Like this post'}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likes.toLocaleString()}</span>
        </button>
        <span className="flex items-center gap-1">
          <span>🔄</span>
          <span>{post.shares.toLocaleString()}</span>
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo}</span>
      </div>
    </div>
  );
}
