'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPosts, getActivity, Post, DailyActivity } from '@/lib/api';
import StreakHeatmap from '@/components/StreakHeatmap';
import WordFrequency from '@/components/WordFrequency';
import CalendarView from '@/components/CalendarView';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Link from 'next/link';

type Tab = 'heatmap' | 'words' | 'calendar';

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('heatmap');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all posts for word analysis and calendar (up to 500)
      const [postsData, activityData] = await Promise.all([
        getPosts(1, 500),
        getActivity(365),
      ]);
      setPosts(postsData.posts ?? []);
      setActivity(activityData.activity ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: { value: Tab; label: string; icon: string }[] = [
    { value: 'heatmap', label: 'Streak', icon: '🔥' },
    { value: 'words', label: 'Words', icon: '📊' },
    { value: 'calendar', label: 'Calendar', icon: '📅' },
  ];

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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        </div>
        <ThemeSwitcher />
      </header>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === t.value ? 'var(--accent)' : 'transparent',
              color: tab === t.value ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading analytics…
        </div>
      ) : (
        <div className="rounded-xl p-6 page-enter" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {tab === 'heatmap' && (
            <div>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                📅 Daily Posting Streak
              </h2>
              <StreakHeatmap activity={activity} days={365} />
            </div>
          )}
          {tab === 'words' && (
            <div>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                📊 Top Words in Your Posts
              </h2>
              <WordFrequency posts={posts} />
            </div>
          )}
          {tab === 'calendar' && (
            <div>
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                📅 Posting Calendar
              </h2>
              <CalendarView posts={posts} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
