'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';

const formatRole = (role: string | undefined): string => {
  if (!role) return '';
  if (role === 'NO_ROLE') return 'no role';
  return role.toLowerCase();
};

// Navigation skeleton for loading state
function NavSkeleton() {
  return (
    <div className="flex items-center gap-2 sm:gap-4 animate-pulse">
      <div className="w-16 h-8 bg-white/20 rounded" />
      <div className="w-16 h-8 bg-white/20 rounded" />
      <div className="w-20 h-8 bg-white/20 rounded-xl" />
    </div>
  );
}

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout, isValidating } = useAuthContext();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="bg-primary-500 text-white shadow-soft-lg">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl sm:text-2xl font-bold hover:text-white/90 transition-all duration-200 drop-shadow-sm">
            <span className="sm:hidden">ゆカレ</span>
            <span className="hidden sm:inline">ゆカレ</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" className="hover:text-white/90 transition-all duration-200 flex items-center gap-1.5 p-2 sm:p-0 hover:scale-105" title="ホーム">
              <svg
                className="w-5 h-5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span className="hidden sm:inline">ホーム</span>
            </Link>

            {/* Show skeleton only when validating without cached user */}
            {isValidating && !user ? (
              <NavSkeleton />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/schedule"
                  className="hover:text-white/90 transition-all duration-200 flex items-center gap-1.5 p-2 sm:p-0 hover:scale-105"
                  title="予定"
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="hidden sm:inline">予定</span>
                </Link>
                <Link
                  href="/survey"
                  className="hover:text-white/90 transition-all duration-200 flex items-center gap-1.5 p-2 sm:p-0 hover:scale-105"
                  title="出欠調査"
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <span className="hidden sm:inline">出欠調査</span>
                </Link>
                <Link
                  href={user?.role === 'ADMIN' ? '/admin' : '/user'}
                  className="text-white/80 hover:text-white transition-all duration-200 flex items-center gap-1.5 p-2 sm:p-0 hover:scale-105"
                  title={`${user?.username} (${formatRole(user?.role)})`}
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="hidden sm:inline">{user?.username} ({formatRole(user?.role)})</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-2 sm:px-4 rounded-xl transition-all duration-200 flex items-center gap-1.5 border border-white/20 hover:scale-105 active:scale-95"
                  title="ログアウト"
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">ログアウト</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hover:text-white/90 transition-all duration-200 flex items-center gap-1.5 p-2 sm:p-0 hover:scale-105"
                  title="ログイン"
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  <span className="hidden sm:inline">ログイン</span>
                </Link>
                <Link
                  href="/register"
                  className="bg-white/15 hover:bg-white/25 backdrop-blur-sm px-3 py-2 sm:px-4 rounded-xl transition-all duration-200 flex items-center gap-1.5 border border-white/20 hover:scale-105 active:scale-95"
                  title="登録"
                >
                  <svg
                    className="w-5 h-5 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  <span className="hidden sm:inline">登録</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
