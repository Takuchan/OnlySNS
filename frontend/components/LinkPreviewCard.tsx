'use client';

import { OGPPreview } from '@/lib/api';

interface LinkPreviewCardProps {
  preview: OGPPreview;
}

export default function LinkPreviewCard({ preview }: LinkPreviewCardProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-2xl overflow-hidden border hover:-translate-y-0.5 transition-all"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card-gradient)',
        boxShadow: 'var(--soft-shadow)',
      }}
    >
      {preview.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.image} alt={preview.title || 'link preview'} className="w-full h-40 object-cover" />
      )}
      <div className="p-3">
        <p className="text-sm font-bold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
          {preview.title || 'リンクプレビュー'}
        </p>
        {preview.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {preview.description}
          </p>
        )}
        <p className="text-[11px] mt-2 truncate" style={{ color: 'var(--text-muted)' }}>
          {preview.url}
        </p>
      </div>
    </a>
  );
}
