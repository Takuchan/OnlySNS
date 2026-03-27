'use client';

export type Locale = 'ja' | 'en';

export const translations = {
  en: {
    // PostForm
    placeholder: "What's on your mind?",
    post: 'Post',
    posting: 'Posting...',
    attachMedia: 'Attach media',
    addCode: 'Add code snippet',
    language: 'Language',
    codePlaceholder: 'Paste your code here...',
    contentRequired: 'Content is required',
    contentTooLong: (max: number) => `Content exceeds ${max} character units`,
    codeTooLong: (max: number) => `Code snippet exceeds ${max} lines`,
    aiCaption: 'AI Caption',
    aiCaptioning: 'Generating caption...',
    urlPreviewLoading: 'Loading preview...',

    // PostCard
    alreadyLiked: 'Already liked',
    likePost: 'Like this post',
    unlikePost: 'Unlike this post',
    deletePost: 'Delete post',
    aiReview: 'AI Review',
    aiReviewing: 'Reviewing...',
    aiSummarize: 'Summarize',
    aiSummarizing: 'Summarizing...',
    aiEntities: 'Extract Tags',
    aiExtracting: 'Extracting...',
    aiComment: '🤖 AI',

    // General
    noResults: 'No posts yet. Share something!',
    loadMore: 'Load more',
    loading: 'Loading...',
  },
  ja: {
    // PostForm
    placeholder: '今何してる？',
    post: '投稿する',
    posting: '投稿中...',
    attachMedia: 'メディアを添付',
    addCode: 'コードを追加',
    language: '言語',
    codePlaceholder: 'ここにコードを貼り付け...',
    contentRequired: '内容を入力してください',
    contentTooLong: (max: number) => `${max}文字を超えています`,
    codeTooLong: (max: number) => `コードが${max}行を超えています`,
    aiCaption: 'AI説明',
    aiCaptioning: 'キャプション生成中...',
    urlPreviewLoading: 'プレビュー読み込み中...',

    // PostCard
    alreadyLiked: 'いいね済み',
    likePost: 'いいね',
    unlikePost: 'いいねを取り消す',
    deletePost: '削除',
    aiReview: 'AIレビュー',
    aiReviewing: 'レビュー中...',
    aiSummarize: 'まとめる',
    aiSummarizing: 'まとめ中...',
    aiEntities: 'タグ抽出',
    aiExtracting: '抽出中...',
    aiComment: '🤖 AI',

    // General
    noResults: 'まだ投稿がありません。何か共有しましょう！',
    loadMore: 'もっと読む',
    loading: '読み込み中...',
  },
};

export type TranslationKey = keyof typeof translations.en;

let currentLocale: Locale = 'ja';

export function getLocale(): Locale {
  if (typeof window === 'undefined') return currentLocale;
  const stored = localStorage.getItem('locale') as Locale | null;
  if (stored && (stored === 'ja' || stored === 'en')) {
    currentLocale = stored;
  }
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
    window.dispatchEvent(new Event('localechange'));
  }
}

export function t(key: TranslationKey, arg?: number): string {
  const locale = getLocale();
  const val = translations[locale][key];
  if (typeof val === 'function') {
    return (val as (n: number) => string)(arg ?? 0);
  }
  return val as string;
}
