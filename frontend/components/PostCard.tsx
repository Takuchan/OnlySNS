'use client';

import { useEffect, useState } from 'react';
import { Post, generateQuiz, getRelatedPosts, likePost, Quiz, repostPost, simplifyPost } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => void;
}

function linkifyContent(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
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
  const [reposts, setReposts] = useState(post.shares);
  const [liked, setLiked] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = JSON.parse(localStorage.getItem('likedPosts') || '[]') as string[];
      return stored.includes(post.id);
    } catch {
      return false;
    }
  });
  const [reposted, setReposted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = JSON.parse(localStorage.getItem('repostedPosts') || '[]') as string[];
      return stored.includes(post.id);
    } catch {
      return false;
    }
  });
  const [likeAnim, setLikeAnim] = useState(false);
  const [repostAnim, setRepostAnim] = useState(false);
  const [simplified, setSimplified] = useState('');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [aiLoading, setAiLoading] = useState<'simplify' | 'quiz' | 'related' | ''>('');

  useEffect(() => {
    if (post.likes > likes) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 360);
    }
    setLikes(post.likes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.likes]);

  useEffect(() => {
    if (post.shares > reposts) {
      setRepostAnim(true);
      setTimeout(() => setRepostAnim(false), 360);
    }
    setReposts(post.shares);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.shares]);

  const media = post.media ?? [];
  const codeSnippets = post.code_snippets ?? [];
  const tags = post.tags ?? [];
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ja });

  const saveLocal = (key: string) => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '[]') as string[];
      if (!stored.includes(post.id)) {
        stored.push(post.id);
        localStorage.setItem(key, JSON.stringify(stored));
      }
    } catch {
      // ignore localStorage failures
    }
  };

  const handleLike = async () => {
    if (liked) return;
    try {
      const newLikes = await likePost(post.id);
      setLikes(newLikes);
      setLiked(true);
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 360);
      saveLocal('likedPosts');
    } catch {
      // noop
    }
  };

  const handleRepost = async () => {
    if (reposted) return;
    try {
      const next = await repostPost(post.id);
      setReposts(next);
      setReposted(true);
      setRepostAnim(true);
      setTimeout(() => setRepostAnim(false), 360);
      saveLocal('repostedPosts');
    } catch {
      // noop
    }
  };

  const handleSimplify = async () => {
    setAiLoading('simplify');
    try {
      const text = await simplifyPost(post.id);
      setSimplified(text);
    } finally {
      setAiLoading('');
    }
  };

  const handleQuiz = async () => {
    setAiLoading('quiz');
    try {
      const q = await generateQuiz(post.id);
      setQuiz(q);
    } finally {
      setAiLoading('');
    }
  };

  const handleRelated = async () => {
    setAiLoading('related');
    try {
      const posts = await getRelatedPosts(post.id, 3);
      setRelated(posts);
    } finally {
      setAiLoading('');
    }
  };

  return (
    <div
      className="rounded-[22px] p-4 transition-all hover:-translate-y-0.5 border"
      style={{ background: 'var(--card-gradient)', borderColor: 'var(--border)', boxShadow: 'var(--soft-shadow)' }}
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
          title="投稿を削除"
        >
          🗑️
        </button>
      </div>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: 'var(--chip-bg)', color: 'var(--chip-text)' }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {codeSnippets.map(cs => (
        <div key={cs.id} className="mt-3 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
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
                  className="w-full rounded-xl max-h-96 object-cover"
                />
              );
            }
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={m.id}
                src={src}
                alt="media"
                className="w-full rounded-xl max-h-96 object-cover"
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1 transition-all ${likeAnim ? 'engage-pop' : ''}`}
          style={{
            color: liked ? 'var(--like-color)' : 'var(--text-muted)',
            cursor: liked ? 'default' : 'pointer',
          }}
          disabled={liked}
          title={liked ? 'いいね済み' : 'いいね'}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          <span>{likes.toLocaleString('ja-JP')}</span>
        </button>

        <button
          onClick={handleRepost}
          className={`flex items-center gap-1 transition-all ${repostAnim ? 'engage-pop' : ''}`}
          style={{
            color: reposted ? 'var(--repost-color)' : 'var(--text-muted)',
            cursor: reposted ? 'default' : 'pointer',
          }}
          disabled={reposted}
          title={reposted ? 'リポスト済み' : 'リポスト'}
        >
          <span>🔁</span>
          <span>{reposts.toLocaleString('ja-JP')}</span>
        </button>

        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{timeAgo}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleSimplify}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {aiLoading === 'simplify' ? 'やさしく説明中...' : 'やさしく説明(ELI5)'}
        </button>
        <button
          onClick={handleQuiz}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {aiLoading === 'quiz' ? 'クイズ生成中...' : '4択クイズを作る'}
        </button>
        <button
          onClick={handleRelated}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          {aiLoading === 'related' ? '関連を探索中...' : '関連投稿を探す'}
        </button>
      </div>

      {simplified && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>AIのやさしい説明</p>
          <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{simplified}</p>
        </div>
      )}

      {quiz && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>セルフチェッククイズ</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{quiz.question}</p>
          <ol className="mt-2 space-y-1">
            {quiz.choices.map((choice, idx) => (
              <li key={`${choice}-${idx}`} className="text-xs" style={{ color: idx === quiz.answer_index ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {idx + 1}. {choice}
              </li>
            ))}
          </ol>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{quiz.explanation}</p>
        </div>
      )}

      {related.length > 0 && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>関連投稿</p>
          <div className="mt-1 space-y-2">
            {related.map(r => (
              <div key={r.id} className="text-xs" style={{ color: 'var(--text-primary)' }}>
                ・{r.content.length > 56 ? `${r.content.slice(0, 56)}...` : r.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
