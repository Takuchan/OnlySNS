'use client';

import { useState, useEffect } from 'react';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Link from 'next/link';

const FEED_LIMIT_KEY = 'feedLimit';

export function getFeedLimit(): number {
  if (typeof window === 'undefined') return 20;
  const stored = localStorage.getItem(FEED_LIMIT_KEY);
  const v = stored ? parseInt(stored, 10) : 20;
  return Number.isNaN(v) ? 20 : Math.min(100, Math.max(5, v));
}

export default function SettingsPage() {
  const [feedLimit, setFeedLimit] = useState(20);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFeedLimit(getFeedLimit());
  }, []);

  const handleSave = () => {
    localStorage.setItem(FEED_LIMIT_KEY, String(feedLimit));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const presets = [10, 20, 50, 100];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        </div>
        <ThemeSwitcher />
      </header>

      <div className="space-y-6">
        {/* Theme section */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>🎨 Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Theme</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Choose between Light, Dark, or Waga Homare (我が誉) mode
              </p>
            </div>
            <ThemeSwitcher />
          </div>
        </div>

        {/* Feed settings */}
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>📰 Feed</h2>
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Posts per page</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              How many posts to load at once in the main feed (5–100)
            </p>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => setFeedLimit(p)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: feedLimit === p ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: feedLimit === p ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={100}
                value={feedLimit}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setFeedLimit(Math.min(100, Math.max(5, v)));
                }}
                className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>posts per page</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
