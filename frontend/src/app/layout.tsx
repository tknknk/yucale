import type { Metadata } from 'next';
// フォントは @fontsource で node_modules に同梱されたものをローカル読み込みする。
// next/font/google はビルド時に fonts.gstatic.com へ取得しに行くため、ネットワーク
// 非到達なビルド環境（Docker など）で失敗する。これを避けるための self-host 方式。
import '@fontsource/zen-maru-gothic/300.css';
import '@fontsource/zen-maru-gothic/400.css';
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientProviders from '@/components/ClientProviders';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'ゆカレ',
  description: 'A shared calendar application for managing schedules',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="flex flex-col min-h-screen">
        <ClientProviders>
          <Header />
          <main className="flex-1 container mx-auto px-6 sm:px-8 py-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
