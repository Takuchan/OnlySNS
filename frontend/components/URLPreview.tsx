'use client';

import { useState, useEffect } from 'react';
import { fetchOGP, OGPData } from '@/lib/api';

interface URLPreviewProps {
  url: string;
}

export default function URLPreview({ url }: URLPreviewProps) {
  const [data, setData] = useState<OGPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    const controller = new AbortController();
    fetchOGP(url)
      .then(d => {
        if (!controller.signal.aborted) {
          setData(d);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [url]);

  if (!url) return null;
  if (loading) {
    return (
      <div className="mt-2 p-3 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="h-3 w-3/4 rounded" style={{ backgroundColor: 'var(--border)' }} />
        <div className="h-2 w-1/2 rounded mt-1" style={{ backgroundColor: 'var(--border)' }} />
      </div>
    );
  }
  if (error || !data || (!data.title && !data.description)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex gap-3 rounded-xl overflow-hidden transition-opacity hover:opacity-90 no-underline block"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      {data.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.image}
          alt={data.title || ''}
          className="w-20 h-20 object-cover flex-shrink-0"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-3 min-w-0">
        {data.title && (
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {data.description}
          </p>
        )}
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
          {url}
        </p>
      </div>
    </a>
  );
}
