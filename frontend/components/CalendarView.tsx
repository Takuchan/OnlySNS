'use client';

import { useState, useMemo } from 'react';
import { Post } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

interface CalendarViewProps {
  posts: Post[];
}

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = [
  '1月','2月','3月','4月','5月','6月',
  '7月','8月','9月','10月','11月','12月'
];

export default function CalendarView({ posts }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Build a map of date string -> posts
  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const d = new Date(post.created_at).toISOString().slice(0, 10);
      const arr = map.get(d) ?? [];
      arr.push(post);
      map.set(d, arr);
    }
    return map;
  }, [posts]);

  // Build calendar grid
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (string | null)[] = [];
    for (let i = 0; i < firstDay; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push(dateStr);
    }
    return result;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = today.toISOString().slice(0, 10);
  const selectedPosts = selectedDate ? (postsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          ←
        </button>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const count = postsByDate.get(dateStr)?.length ?? 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const day = parseInt(dateStr.slice(8));

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all text-xs font-medium"
              style={{
                backgroundColor: isSelected
                  ? 'var(--accent)'
                  : count > 0
                  ? 'color-mix(in srgb, var(--accent) 25%, var(--bg-secondary))'
                  : 'var(--bg-secondary)',
                color: isSelected ? 'var(--accent-text)' : isToday ? 'var(--accent)' : 'var(--text-primary)',
                outline: isToday ? '2px solid var(--accent)' : 'none',
                outlineOffset: '2px',
                fontWeight: isToday ? '700' : '500',
              }}
            >
              <span>{day}</span>
              {count > 0 && !isSelected && (
                <span style={{ fontSize: '8px', color: isSelected ? 'var(--accent-text)' : 'var(--accent)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day posts */}
      {selectedDate && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            📅 {selectedDate} - {selectedPosts.length}件
          </h4>
          {selectedPosts.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>この日の投稿はありません。</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedPosts.map(post => (
                <div
                  key={post.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <p className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-primary)' }}>
                    {post.content.length > 200 ? post.content.slice(0, 200) + '…' : post.content}
                  </p>
                  <span className="text-xs mt-1 block" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
