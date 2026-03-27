'use client';

import { useMemo } from 'react';
import { Post } from '@/lib/api';

interface WordFrequencyProps {
  posts: Post[];
}

// Japanese stop words + English stop words
const STOP_WORDS = new Set([
  'the','a','an','is','it','in','on','at','to','for','of','and','or','but','with',
  'this','that','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','not','no','i','you','he','she','we',
  'they','my','your','his','her','our','their','what','which','who','how','when','where',
  'why','so','if','as','by','from','up','out','about','into','than','then','there',
  'http','https','www',
  'の','に','は','を','が','で','と','も','から','まで','より','へ','て','ない','する','した',
  'です','ます','ある','いる','これ','それ','あの','この','その',
]);

function extractWords(posts: Post[]): [string, number][] {
  const freq = new Map<string, number>();
  for (const post of posts) {
    // Remove URLs
    const text = post.content.replace(/https?:\/\/\S+/g, '');
    // Split on spaces, punctuation, Japanese word boundaries
    const words = text
      .toLowerCase()
      .split(/[\s.,!?;:()\[\]{}"'「」。、！？…\-\/\\|#@]+/)
      .filter(w => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);
}

export default function WordFrequency({ posts }: WordFrequencyProps) {
  const words = useMemo(() => extractWords(posts), [posts]);

  if (words.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Post more to see your top words!
      </div>
    );
  }

  const maxCount = words[0][1];

  return (
    <div className="space-y-2">
      {words.slice(0, 15).map(([word, count]) => {
        const pct = Math.round((count / maxCount) * 100);
        return (
          <div key={word} className="flex items-center gap-3">
            <span
              className="text-sm font-medium w-28 truncate"
              style={{ color: 'var(--text-primary)' }}
              title={word}
            >
              {word}
            </span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', height: '8px' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
              />
            </div>
            <span className="text-xs w-6 text-right" style={{ color: 'var(--text-muted)' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}
