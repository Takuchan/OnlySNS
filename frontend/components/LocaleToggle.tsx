'use client';

import { useState, useEffect } from 'react';
import { getLocale, setLocale, Locale } from '@/lib/i18n';

export default function LocaleToggle() {
  const [locale, setLocaleState] = useState<Locale>('ja');

  useEffect(() => {
    setLocaleState(getLocale());
    const handler = () => setLocaleState(getLocale());
    window.addEventListener('localechange', handler);
    return () => window.removeEventListener('localechange', handler);
  }, []);

  const toggle = () => {
    const next: Locale = locale === 'ja' ? 'en' : 'ja';
    setLocale(next);
    setLocaleState(next);
  };

  return (
    <button onClick={toggle} className="locale-toggle" title="Switch language / 言語切替">
      {locale === 'ja' ? '🇯🇵 JA' : '🇬🇧 EN'}
    </button>
  );
}
