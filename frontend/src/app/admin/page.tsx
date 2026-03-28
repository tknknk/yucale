'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { updateUsername } from '@/lib/auth';

const AuthRequestList = dynamic(
  () => import('@/components/AuthRequestList'),
  { loading: () => <LoadingSpinner size="md" />, ssr: false }
);

const UserList = dynamic(
  () => import('@/components/UserList'),
  { loading: () => <LoadingSpinner size="md" />, ssr: false }
);

type TabType = 'requests' | 'users';

interface UsernameFormData {
  username: string;
}

export default function AdminPage() {
  const { user, isAuthenticated, isValidating } = useAuth();
  const { refreshUser } = useAuthContext();
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UsernameFormData>({
    defaultValues: {
      username: user?.username || '',
    },
  });

  const onSubmitUsername = async (data: UsernameFormData) => {
    if (data.username === user?.username) {
      setUpdateError('新しいユーザー名が現在のユーザー名と同じです');
      return;
    }

    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      await updateUsername(data.username);
      await refreshUser();

      setUpdateSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'ユーザー名の更新に失敗しました';
      setUpdateError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!isValidating && (!isAuthenticated || user?.role !== 'ADMIN')) {
      window.location.href = '/';
    }
  }, [isValidating, isAuthenticated, user]);

  useEffect(() => {
    if (user?.username) {
      reset({ username: user.username });
    }
  }, [user?.username, reset]);

  // Show loading only when validating without cached user
  if (isValidating && !user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">アクセス拒否</h2>
        <p className="text-gray-800">このページを表示する権限がありません。</p>
      </div>
    );
  }

  const tabs = [
    { id: 'requests' as const, label: 'ロールリクエスト', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'users' as const, label: 'ユーザー', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">管理者ダッシュボード</h2>
        <p className="text-gray-800">ロールリクエストとユーザーを管理</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-800 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'requests' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">ロールリクエスト</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllRequests}
                  onChange={(e) => setShowAllRequests(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-800">すべてのリクエストを表示</span>
              </label>
            </div>
            <AuthRequestList showAll={showAllRequests} />
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {/* Username Change Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">ユーザー名を変更</h3>
              <p className="text-gray-800 mb-4">
                ユーザー名を更新します。
              </p>

              {updateError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 text-red-700 text-sm">
                  {updateError}
                </div>
              )}

              {updateSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 text-green-700 text-sm">
                  ユーザー名を更新しました。
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmitUsername)} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-800 mb-1">
                    ユーザー名(名字)
                  </label>
                  <input
                    type="text"
                    id="username"
                    {...register('username', {
                      required: 'ユーザー名は必須です',
                      minLength: { value: 1, message: 'ユーザー名は1文字以上で入力してください' },
                      maxLength: { value: 50, message: 'ユーザー名は50文字以内で入力してください' },
                    })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={isUpdating}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      更新中...
                    </>
                  ) : (
                    'ユーザー名を更新'
                  )}
                </button>
              </form>
            </div>

            {/* User Management Section */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800">ユーザー管理</h3>
            </div>
            <UserList />
          </div>
        )}
      </div>
    </div>
  );
}
