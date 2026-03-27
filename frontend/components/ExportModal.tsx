'use client';

import { useState } from 'react';
import { getExportURL } from '@/lib/api';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [allTime, setAllTime] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const handleDownload = () => {
    const url = getExportURL(format, allTime ? undefined : from || undefined, allTime ? undefined : to || undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-xl p-6 w-full max-w-md" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Export Posts</h2>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Format</label>
            <div className="flex gap-3">
              {(['json', 'csv'] as const).map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                  />
                  <span className="text-sm uppercase" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allTime}
                onChange={e => setAllTime(e.target.checked)}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>All time</span>
            </label>
          </div>

          {!allTime && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
