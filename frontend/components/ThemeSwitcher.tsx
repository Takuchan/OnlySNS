'use client';

import { useTheme, Theme } from '@/lib/theme';

const themes: { value: Theme; label: string; icon: string; title: string }[] = [
  { value: 'light', label: 'ライト', icon: '☀️', title: 'ライトモード' },
  { value: 'dark', label: 'ダーク', icon: '🌙', title: 'ダークモード' },
  { value: 'homare', label: 'わがほまれ', icon: '✨', title: 'わがほまれモード' },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {themes.map(t => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          title={t.title}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
          style={{
            backgroundColor: theme === t.value ? 'var(--accent)' : 'transparent',
            color: theme === t.value ? 'var(--accent-text)' : 'var(--text-secondary)',
          }}
        >
          <span>{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
