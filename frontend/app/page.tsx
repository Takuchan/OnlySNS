'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPosts, searchPosts, deletePost, Post, SearchParams } from '@/lib/api';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';
import ExportModal from '@/components/ExportModal';
import SearchBar from '@/components/SearchBar';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import Link from 'next/link';

function getFeedLimit(): number {
  if (typeof window === 'undefined') return 20;
  const stored = localStorage.getItem('feedLimit');
  const v = stored ? parseInt(stored, 10) : 20;
  return Number.isNaN(v) ? 20 : Math.min(100, Math.max(5, v));
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [isSearching, setIsSearching] = useState(false);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    setLimit(getFeedLimit());
  }, []);

  const fetchPosts = useCallback(async (p: number, replace: boolean, params: SearchParams = {}) => {
    setLoading(true);
    try {
      const isSearch = !!(params.q || params.from || params.to);
      const data = isSearch
        ? await searchPosts({ ...params, page: p, limit })
        : await getPosts(p, limit);
      const newPosts = data.posts ?? [];
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPosts(1, true, {});
  }, [fetchPosts]);

  const handlePostCreated = (post: Post) => {
    setPosts(prev => [post, ...prev]);
    setTotal(prev => prev + 1);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, false, searchParams);
  };

  const handleSearch = (params: SearchParams) => {
    const isSearch = !!(params.q || params.from || params.to);
    setSearchParams(params);
    setIsSearching(isSearch);
    setPage(1);
    fetchPosts(1, true, params);
  };

  const hasMore = posts.length < total;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>OnlySNS</h1>
          <nav className="flex items-center gap-2 ml-2">
            <Link
              href="/analytics"
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
            >
              📊 Stats
            </Link>
            <Link
              href="/settings"
              className="text-xs px-2 py-1 rounded-md transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
            >
              ⚙️ Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
          >
            Export
          </button>
        </div>
      </header>

      <PostForm onPostCreated={handlePostCreated} />

      <div className="mt-4">
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {isSearching && (
        <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Found {total} result{total !== 1 ? 's' : ''}
          {searchParams.q && <span> for &ldquo;<strong style={{ color: 'var(--text-primary)' }}>{searchParams.q}</strong>&rdquo;</span>}
          {(searchParams.from || searchParams.to) && (
            <span> {searchParams.from && `from ${searchParams.from}`}{searchParams.to && ` to ${searchParams.to}`}</span>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {posts.map(post => (
          <div key={post.id} className="page-enter">
            <PostCard post={post} onDelete={handleDelete} />
          </div>
        ))}

        {loading && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
        )}

        {!loading && hasMore && (
          <button
            onClick={handleLoadMore}
            className="w-full py-3 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Load more ({posts.length} / {total})
          </button>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
            {isSearching ? 'No posts match your search.' : 'No posts yet. Be the first to post!'}
          </div>
        )}
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
