'use client';

import { useState } from 'react';
import { Post, likePost, unlikePost, aiCodeReview, aiSummarize, aiExtractEntities } from '@/lib/api';
import { t } from '@/lib/i18n';
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

// Detect tech-related words to show the "Extract Tags" button
const TECH_WORD_RE = /\b(javascript|typescript|python|go|rust|java|react|vue|node|docker|kubernetes|api|sql|git|aws|linux|css|html|ai|ml|llm|gpt|framework|library|database|cloud|devops|backend|frontend|fullstack)\b/i;

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

  // AI state
  const [reviewResult, setReviewResult] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [tagsResult, setTagsResult] = useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  const media = post.media ?? [];
  const codeSnippets = post.code_snippets ?? [];
  const comments = post.comments ?? [];

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  const showSummarize = post.content.length > 150;
  const showExtractTags = TECH_WORD_RE.test(post.content);
  const showAiToolbar = codeSnippets.length > 0 || showSummarize || showExtractTags;

  const handleLike = async () => {
    try {
      if (liked) {
        const newLikes = await unlikePost(post.id);
        setLikes(newLikes);
        setLiked(false);
        try {
          const stored = JSON.parse(localStorage.getItem('likedPosts') || '[]') as string[];
          localStorage.setItem('likedPosts', JSON.stringify(stored.filter(id => id !== post.id)));
        } catch {
          // localStorage unavailable, ignore
        }
      } else {
        const newLikes = await likePost(post.id);
        setLikes(newLikes);
        setLiked(true);
        setLikeAnim(true);
        setTimeout(() => setLikeAnim(false), 300);
        try {
          const stored = JSON.parse(localStorage.getItem('likedPosts') || '[]') as string[];
          if (!stored.includes(post.id)) {
            stored.push(post.id);
            localStorage.setItem('likedPosts', JSON.stringify(stored));
          }
        } catch {
          // localStorage unavailable, ignore
        }
      }
    } catch {
      // silently fail
    }
  };

  const handleAiReview = async (cs: { code: string; language: string }) => {
    if (reviewLoading) return;
    setReviewLoading(true);
    try {
      const res = await aiCodeReview(cs.code, cs.language);
      setReviewResult(res.response);
      setReviewOpen(true);
    } catch {
      setReviewResult('AI unavailable');
      setReviewOpen(true);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (summaryLoading) return;
    setSummaryLoading(true);
    try {
      const res = await aiSummarize(post.content);
      setSummaryResult(res.response);
      setSummaryOpen(true);
    } catch {
      setSummaryResult('AI unavailable');
      setSummaryOpen(true);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExtractTags = async () => {
    if (tagsLoading) return;
    setTagsLoading(true);
    try {
      const res = await aiExtractEntities(post.content);
      const tags = res.response
        .split(/[,、\n]+/)
        .map(t => t.trim())
        .filter(Boolean);
      setTagsResult(tags);
      setTagsOpen(true);
    } catch {
      setTagsResult(['AI unavailable']);
      setTagsOpen(true);
    } finally {
      setTagsLoading(false);
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
          title={t('deletePost')}
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
          {/* Per-snippet AI Review button */}
          <div className="px-3 py-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <button
              onClick={() => handleAiReview(cs)}
              disabled={reviewLoading}
              className="text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-50"
              style={{ color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
            >
              {reviewLoading ? t('aiReviewing') : t('aiReview')}
            </button>
          </div>
        </div>
      ))}

      {/* AI Review result */}
      {reviewResult && reviewOpen && (
        <div className="mt-2 rounded-lg p-3 slide-down" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>🤖 {t('aiReview')}</span>
            <button onClick={() => setReviewOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{reviewResult}</p>
        </div>
      )}

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

      {/* AI toolbar: Summarize / Extract Tags */}
      {showAiToolbar && (
        <div className="mt-3 flex flex-wrap gap-2">
          {showSummarize && (
            <button
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {summaryLoading ? t('aiSummarizing') : t('aiSummarize')}
            </button>
          )}
          {showExtractTags && (
            <button
              onClick={handleExtractTags}
              disabled={tagsLoading}
              className="text-xs px-2 py-1 rounded-md transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              {tagsLoading ? t('aiExtracting') : t('aiEntities')}
            </button>
          )}
        </div>
      )}

      {/* Summary result */}
      {summaryResult && summaryOpen && (
        <div className="mt-2 rounded-lg p-3 slide-down" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>🤖 {t('aiSummarize')}</span>
            <button onClick={() => setSummaryOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{summaryResult}</p>
        </div>
      )}

      {/* Tags result */}
      {tagsResult.length > 0 && tagsOpen && (
        <div className="mt-2 rounded-lg p-3 slide-down" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>🤖 {t('aiEntities')}</span>
            <button onClick={() => setTagsOpen(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="flex flex-wrap gap-1">
            {tagsResult.map((tag, i) => (
              <span key={i} className="tag-pill">{tag}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 transition-all ${likeAnim ? 'like-pop' : ''}`}
          style={{
            color: liked ? 'var(--like-color)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title={liked ? t('unlikePost') : t('likePost')}
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

      {/* AI comments */}
      {comments.filter(c => c.is_ai).length > 0 && (
        <div className="mt-3 space-y-2">
          {comments.filter(c => c.is_ai).map(c => (
            <div key={c.id} className="flex gap-2 rounded-lg p-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--accent)' }}>{t('aiComment')}</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
