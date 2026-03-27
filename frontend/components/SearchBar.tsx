'use client';

import { useState } from 'react';
import { SearchParams } from '@/lib/api';

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ q: q.trim() || undefined, from: from || undefined, to: to || undefined, page: 1 });
  };

  const handleClear = () => {
    setQ('');
    setFrom('');
    setTo('');
    onSearch({});
  };

  const hasFilters = q || from || to;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-2"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span style={{ color: 'var(--text-muted)' }}>🔍</span>
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="投稿を検索..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{
            color: showFilters ? 'var(--accent)' : 'var(--text-muted)',
            backgroundColor: showFilters ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent',
          }}
          title="Date filters"
        >
          📅 日付
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs px-2 py-1 rounded-md transition-colors"
            style={{ color: 'var(--text-muted)' }}
            title="検索をクリア"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="text-xs px-3 py-1 rounded-md font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {loading ? '...' : '検索'}
        </button>
      </div>

      {showFilters && (
        <div
          className="mt-2 p-3 rounded-xl flex flex-wrap gap-4"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex-1 min-w-32">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>開始日</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1 outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>終了日</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full text-xs rounded-lg px-2 py-1 outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
        </div>
      )}
    </form>
  );
}
