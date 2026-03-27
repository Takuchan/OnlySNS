'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { createPost, Post } from '@/lib/api';

interface PostFormProps {
  onPostCreated: (post: Post) => void;
}

function countChars(text: string): number {
  // Remove URLs
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = countChars(content);
  const codeLines = code.split('\n').length;
  const charWarning = charCount > MAX_CHARS * 0.9;
  const charError = charCount > MAX_CHARS;
  const codeLinesWarning = codeLines > MAX_CODE_LINES;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    if (charError) {
      setError(`Content exceeds ${MAX_CHARS} character units`);
      return;
    }
    if (codeLinesWarning) {
      setError(`Code snippet exceeds ${MAX_CODE_LINES} lines`);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm"
      />

      <div className="flex items-center justify-between mt-1 mb-2">
        <span className={`text-xs ${charError ? 'text-red-400' : charWarning ? 'text-yellow-400' : 'text-gray-500'}`}>
          {charCount} / {MAX_CHARS}
        </span>
      </div>

      {showCode && (
        <div className="mt-2 border border-gray-700 rounded-lg overflow-hidden">
          <div className="flex items-center bg-gray-800 px-3 py-1 gap-2">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-transparent text-gray-300 text-xs outline-none"
            >
              <option value="">Language</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash</option>
              <option value="other">Other</option>
            </select>
            <span className={`ml-auto text-xs ${codeLinesWarning ? 'text-red-400' : 'text-gray-500'}`}>
              {codeLines} / {MAX_CODE_LINES} lines
            </span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Paste your code here..."
            rows={6}
            className="w-full bg-gray-900 text-green-400 font-mono text-xs p-3 resize-none outline-none"
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative group">
              {f.type.startsWith('image') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-16 w-16 object-cover rounded-lg"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400 text-center p-1">
                  {f.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-red-400 text-xs">{error}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-sm"
            title="Attach media"
          >
            📎
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
            className={`p-2 rounded-lg transition-colors text-sm ${showCode ? 'text-indigo-400 bg-indigo-900/30' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Add code snippet"
          >
            {'</>'}
          </button>
        </div>
        <button
          type="submit"
          disabled={submitting || charError || !content.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
