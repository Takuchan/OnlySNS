'use client';

import { useState, useEffect, useCallback } from 'react';
import { deletePost, getLatestTsukkomi, getPosts, Post, searchPosts, SearchParams } from '@/lib/api';
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
  const [tsukkomi, setTsukkomi] = useState('投稿するとAIつっこみがここに表示されるで。');

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
      setPosts(prev => (replace ? newPosts : [...prev, ...newPosts]));
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const fetchTsukkomi = useCallback(async () => {
    try {
      const data = await getLatestTsukkomi();
      setTsukkomi(data.message);
    } catch {
      setTsukkomi('つっこみ取得に失敗。少し時間をおいて再試行してみて。');
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, true, {});
    fetchTsukkomi();
  }, [fetchPosts, fetchTsukkomi]);

  useEffect(() => {
    if (isSearching) return;
    const interval = setInterval(async () => {
      try {
        const data = await getPosts(1, Math.max(limit, 40));
        const latest = data.posts ?? [];
        setPosts(prev => {
          const prevMap = new Map(prev.map(p => [p.id, p]));
          return latest.map(p => {
            const old = prevMap.get(p.id);
            if (!old) return p;
            return { ...p, likes: Math.max(old.likes, p.likes), shares: Math.max(old.shares, p.shares) };
          });
        });
        setTotal(data.total);
      } catch {
        // ignore polling errors
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isSearching, limit]);

  const handlePostCreated = (post: Post) => {
    setPosts(prev => [post, ...prev]);
    setTotal(prev => prev + 1);
    fetchTsukkomi();
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
      fetchTsukkomi();
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
    <div className="max-w-6xl mx-auto px-4 py-7">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>OnlySNS</h1>
          <nav className="flex items-center gap-2 ml-2">
            <Link
              href="/analytics"
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              📊 分析
            </Link>
            <Link
              href="/settings"
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
            >
              ⚙️ 設定
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2 rounded-full text-sm font-bold"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)', boxShadow: 'var(--button-shadow)' }}
          >
            エクスポート
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5">
        <main>
          <PostForm onPostCreated={handlePostCreated} />

          <div className="mt-4">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>

          {isSearching && (
            <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              {total} 件ヒット
              {searchParams.q && <span> : 「<strong style={{ color: 'var(--text-primary)' }}>{searchParams.q}</strong>」</span>}
              {(searchParams.from || searchParams.to) && (
                <span> {searchParams.from && `${searchParams.from}から`}{searchParams.to && `${searchParams.to}まで`}</span>
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
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>読み込み中...</div>
            )}

            {!loading && hasMore && (
              <button
                onClick={handleLoadMore}
                className="w-full py-3 rounded-full text-sm font-bold border"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
              >
                もっと見る ({posts.length} / {total})
              </button>
            )}

            {!loading && posts.length === 0 && (
              <div className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
                {isSearching ? '検索条件に一致する投稿はありません' : 'まだ投稿がありません。最初の投稿をどうぞ！'}
              </div>
            )}
          </div>
        </main>

        <aside className="lg:sticky lg:top-4 h-fit">
          <div className="rounded-[20px] p-4 border" style={{ background: 'var(--card-gradient)', borderColor: 'var(--border)', boxShadow: 'var(--soft-shadow)' }}>
            <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>AI学習相棒のつっこみ</h2>
            <p className="text-sm mt-2 leading-6" style={{ color: 'var(--text-secondary)' }}>{tsukkomi}</p>
            <button
              onClick={fetchTsukkomi}
              className="mt-3 text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}
            >
              つっこみを更新
            </button>
          </div>
        </aside>
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
