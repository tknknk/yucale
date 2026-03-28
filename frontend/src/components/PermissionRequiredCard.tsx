'use client';

import Link from 'next/link';

interface PermissionRequiredCardProps {
  title: string;
  message: string;
  isAuthenticated: boolean;
  isNoRole?: boolean;
}

/**
 * 権限が必要なコンテンツへのアクセス時に表示するカード
 * トップページの「ゆカレへようこそ」カードと同じスタイルを使用
 */
export default function PermissionRequiredCard({
  title,
  message,
  isAuthenticated,
  isNoRole = false,
}: PermissionRequiredCardProps) {
  return (
    <div className="animate-fade-in">
      <section className="mb-8">
        <div className="bg-white border border-primary-100/50 rounded-2xl p-8 text-center shadow-soft">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {title}
          </h2>
          <p className="text-gray-800 mb-6">
            {message}
          </p>
          {!isAuthenticated && (
            <div className="flex justify-center gap-4">
              <Link
                href="/login"
                className="inline-block px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className="inline-block px-6 py-2.5 bg-white text-primary-600 border border-primary-200 rounded-xl hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
              >
                登録
              </Link>
            </div>
          )}
          {isAuthenticated && isNoRole && (
            <Link
              href="/user"
              className="inline-block px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 font-medium"
            >
              ロールをリクエスト
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
