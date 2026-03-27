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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Export Posts</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Format</label>
            <div className="flex gap-3">
              {(['json', 'csv'] as const).map(f => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="text-indigo-600"
                  />
                  <span className="text-sm text-gray-300 uppercase">{f}</span>
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
                className="text-indigo-600"
              />
              <span className="text-sm text-gray-300">All time</span>
            </label>
          </div>

          {!allTime && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
