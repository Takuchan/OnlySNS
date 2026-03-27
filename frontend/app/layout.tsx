import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'OnlySNS',
  description: 'A simple social network for sharing your thoughts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
