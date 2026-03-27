'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPosts, deletePost, Post } from '@/lib/api';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';
import ExportModal from '@/components/ExportModal';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const limit = 20;

  const fetchPosts = useCallback(async (p: number, replace: boolean) => {
    setLoading(true);
    try {
      const data = await getPosts(p, limit);
      const newPosts = data.posts ?? [];
      setPosts(prev => replace ? newPosts : [...prev, ...newPosts]);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, true);
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
    fetchPosts(nextPage, false);
  };

  const hasMore = posts.length < total;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">OnlySNS</h1>
        <button
          onClick={() => setShowExport(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Export
        </button>
      </header>

      <PostForm onPostCreated={handlePostCreated} />

      <div className="mt-8 space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))}

        {loading && (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        )}

        {!loading && hasMore && (
          <button
            onClick={handleLoadMore}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Load more
          </button>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            No posts yet. Be the first to post!
          </div>
        )}
      </div>

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
