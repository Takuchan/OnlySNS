'use client';

import { useMemo } from 'react';
import { DailyActivity } from '@/lib/api';

interface StreakHeatmapProps {
  activity: DailyActivity[];
  days?: number;
}

function getIntensityColor(count: number): string {
  if (count === 0) return 'var(--bg-secondary)';
  if (count === 1) return 'color-mix(in srgb, var(--accent) 40%, var(--bg-secondary))';
  if (count <= 3) return 'color-mix(in srgb, var(--accent) 65%, var(--bg-secondary))';
  if (count <= 6) return 'color-mix(in srgb, var(--accent) 85%, var(--bg-secondary))';
  return 'var(--accent)';
}

export default function StreakHeatmap({ activity, days = 365 }: StreakHeatmapProps) {
  const { cells, weeks, currentStreak, totalDays } = useMemo(() => {
    const activityMap = new Map<string, number>();
    for (const a of activity) {
      activityMap.set(a.date, a.count);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days + 1);
    // Move back to the start of the week (Sunday)
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const allCells: { date: string; count: number; isToday: boolean }[] = [];
    const cur = new Date(startDate);
    while (cur <= today) {
      const dateStr = cur.toISOString().slice(0, 10);
      allCells.push({
        date: dateStr,
        count: activityMap.get(dateStr) ?? 0,
        isToday: dateStr === today.toISOString().slice(0, 10),
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Split into weeks
    const weeksArr: typeof allCells[] = [];
    for (let i = 0; i < allCells.length; i += 7) {
      weeksArr.push(allCells.slice(i, i + 7));
    }

    // Calculate current streak
    let streak = 0;
    const todayStr = today.toISOString().slice(0, 10);
    const checkDate = new Date(today);
    // Start from today or yesterday (in case the user hasn't posted today yet)
    if (!activityMap.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const ds = checkDate.toISOString().slice(0, 10);
      if ((activityMap.get(ds) ?? 0) > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Count total days with posts
    const totalDaysWithPosts = activity.filter(a => a.count > 0).length;

    return { cells: allCells, weeks: weeksArr, currentStreak: streak, totalDays: totalDaysWithPosts };
  }, [activity, days]);

  const months = useMemo(() => {
    const seen = new Set<string>();
    const labels: { label: string; weekIndex: number }[] = [];
    let weekIndex = 0;
    let dayInWeek = 0;
    for (const cell of cells) {
      if (dayInWeek === 0) {
        const month = cell.date.slice(0, 7);
        if (!seen.has(month)) {
          seen.add(month);
          labels.push({ label: new Date(cell.date + 'T00:00:00').toLocaleString('default', { month: 'short' }), weekIndex });
        }
      }
      dayInWeek++;
      if (dayInWeek === 7) {
        dayInWeek = 0;
        weekIndex++;
      }
    }
    return labels;
  }, [cells]);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{currentStreak}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Day Streak 🔥</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalDays}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Active Days</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {activity.reduce((s, a) => s + a.count, 0)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Posts</div>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mt-6 mr-1">
            {dayLabels.map((d, i) => (
              <div key={d} className="h-3 flex items-center text-xs" style={{ color: 'var(--text-muted)', fontSize: '9px', lineHeight: '12px' }}>
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div>
            {/* Month labels */}
            <div className="flex gap-1 mb-1 h-4 relative" style={{ fontSize: '9px' }}>
              {months.map(m => (
                <div
                  key={m.label + m.weekIndex}
                  style={{
                    position: 'absolute',
                    left: `${m.weekIndex * 16}px`,
                    color: 'var(--text-muted)',
                    fontSize: '9px',
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map(cell => (
                    <div
                      key={cell.date}
                      className="heatmap-cell w-3 h-3"
                      style={{
                        backgroundColor: getIntensityColor(cell.count),
                        outline: cell.isToday ? '1px solid var(--accent)' : 'none',
                        outlineOffset: '1px',
                      }}
                      title={`${cell.date}: ${cell.count} post${cell.count !== 1 ? 's' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>Less</span>
        {[0, 1, 2, 4, 7].map(v => (
          <div
            key={v}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getIntensityColor(v) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
