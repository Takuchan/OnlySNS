'use client';

import { Post } from '@/lib/api';
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
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PostCard({ post, onDelete }: PostCardProps) {
  const media = post.media ?? [];
  const codeSnippets = post.code_snippets ?? [];

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-100 whitespace-pre-wrap break-words flex-1">
          {linkifyContent(post.content)}
        </p>
        <button
          onClick={() => onDelete(post.id)}
          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 text-sm"
          title="Delete post"
        >
          🗑️
        </button>
      </div>

      {codeSnippets.map(cs => (
        <div key={cs.id} className="mt-3 rounded-lg overflow-hidden border border-gray-700">
          {cs.language && (
            <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400">{cs.language}</div>
          )}
          <pre className="bg-gray-950 p-3 overflow-x-auto text-xs text-green-400 font-mono">
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

      <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <span>❤️</span>
          <span>{post.likes.toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>🔄</span>
          <span>{post.shares.toLocaleString()}</span>
        </span>
        <span className="ml-auto text-xs text-gray-600">{timeAgo}</span>
      </div>
    </div>
  );
}
