import type { Metadata } from 'next';
import { Zen_Maru_Gothic } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientProviders from '@/components/ClientProviders';
import ErrorBoundary from '@/components/ErrorBoundary';

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

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
      <body className={`${zenMaruGothic.className} flex flex-col min-h-screen`}>
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
