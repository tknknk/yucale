'use client';

import Link from 'next/link';
import { useAuthContext } from '@/contexts/AuthContext';

export default function AboutCTA() {
  const { isAuthenticated } = useAuthContext();

  // Only show for non-authenticated users
  if (isAuthenticated) {
    return null;
  }

  return (
    <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <p className="text-gray-800 mb-4">ゆカレを始めましょう</p>
      <div className="flex justify-center gap-3">
        <Link
          href="/register"
          className="inline-block px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          登録
        </Link>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-white text-primary-600 border border-primary-600 rounded-md hover:bg-primary-50 transition-colors"
        >
          ログイン
        </Link>
      </div>
    </section>
  );
}
