'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { createPost, fetchOGP, OGPPreview, Post } from '@/lib/api';
import LinkPreviewCard from '@/components/LinkPreviewCard';

interface PostFormProps {
  onPostCreated: (post: Post) => void;
}

function countChars(text: string): number {
  const stripped = text.replace(/https?:\/\/\S+/g, '');
  let count = 0;
  for (const char of stripped) {
    const cp = char.codePointAt(0) ?? 0;
    if (isDoubleWidth(cp)) {
      count += 2;
    } else if (cp >= 0x20) {
      count += 1;
    }
  }
  return count;
}

function isDoubleWidth(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1f9ff) ||
    (cp >= 0x20000 && cp <= 0x2a6df)
  );
}

function firstURL(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

const MAX_CHARS = 560;
const MAX_CODE_LINES = 20;

export default function PostForm({ onPostCreated }: PostFormProps) {
  const [content, setContent] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<OGPPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [detectedURL, setDetectedURL] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = countChars(content);
  const codeLines = code === '' ? 0 : code.split('\n').length;
  const charWarning = charCount > MAX_CHARS * 0.9;
  const charError = charCount > MAX_CHARS;
  const codeLinesError = codeLines > MAX_CODE_LINES;

  useEffect(() => {
    const url = firstURL(content);
    if (!url) {
      setDetectedURL('');
      setPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return;
    }
    if (url === detectedURL) {
      return;
    }

    const timer = setTimeout(async () => {
      setDetectedURL(url);
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const data = await fetchOGP(url);
        setPreview(data);
      } catch {
        setPreview(null);
        setPreviewError('リンクのプレビューを取得できませんでした');
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [content, detectedURL]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('本文を入力してください');
      return;
    }
    if (charError) {
      setError(`文字数が上限 (${MAX_CHARS}) を超えています`);
      return;
    }
    if (codeLinesError) {
      setError(`コードは最大 ${MAX_CODE_LINES} 行までです`);
      return;
    }

    setError('');
    setSubmitting(true);

    const formData = new FormData();
    formData.append('content', content);
    if (code.trim()) {
      formData.append('code', code);
      formData.append('language', language);
    }
    files.forEach(f => formData.append('media[]', f));

    try {
      const post = await createPost(formData);
      onPostCreated(post);
      setContent('');
      setCode('');
      setLanguage('');
      setFiles([]);
      setShowCode(false);
      setPreview(null);
      setPreviewError('');
      setDetectedURL('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[24px] p-5 border"
      style={{
        background: 'var(--card-gradient)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--soft-shadow)',
      }}
    >
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="今日の勉強メモ、ゆるっと書こう！"
        rows={4}
        className="w-full bg-transparent resize-none outline-none text-sm"
        style={{ color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
      />

      <div className="flex items-center justify-between mt-1 mb-2">
        <span className="text-xs" style={{ color: charError ? 'var(--danger)' : charWarning ? 'var(--warning)' : 'var(--text-muted)' }}>
          {charCount} / {MAX_CHARS}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          URLは文字数にカウントしません
        </span>
      </div>

      {previewLoading && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          リンク情報を取得中...
        </p>
      )}
      {preview && (
        <div className="mb-2">
          <LinkPreviewCard preview={preview} />
        </div>
      )}
      {previewError && !previewLoading && (
        <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>
          {previewError}
        </p>
      )}

      {showCode && (
        <div className="mt-2 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center px-3 py-2 gap-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-transparent text-xs outline-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              <option value="">言語を選択</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash</option>
              <option value="other">その他</option>
            </select>
            <span className="ml-auto text-xs" style={{ color: codeLinesError ? 'var(--danger)' : 'var(--text-muted)' }}>
              {codeLines} / {MAX_CODE_LINES} 行
            </span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="コードを貼り付け"
            rows={6}
            className="w-full font-mono text-xs p-3 resize-none outline-none"
            style={{ backgroundColor: 'var(--code-bg)', color: 'var(--code-text)' }}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative group">
              {f.type.startsWith('image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-16 w-16 object-cover rounded-xl"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl flex items-center justify-center text-xs text-center p-1" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {f.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                style={{ backgroundColor: 'var(--danger)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-full text-sm border"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
            title="メディアを添付"
          >
            📎 画像/動画
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="px-3 py-2 rounded-full text-sm border"
            style={{
              color: showCode ? 'var(--accent)' : 'var(--text-secondary)',
              borderColor: 'var(--border)',
              backgroundColor: showCode ? 'color-mix(in srgb, var(--accent) 18%, var(--bg-secondary))' : 'var(--bg-secondary)',
            }}
            title="コードを追加"
          >
            {'</>'} コード
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting || charError || !content.trim()}
          className="px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded-full"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', boxShadow: 'var(--button-shadow)' }}
        >
          {submitting ? '投稿中...' : '投稿する'}
        </button>
      </div>
    </form>
  );
}
