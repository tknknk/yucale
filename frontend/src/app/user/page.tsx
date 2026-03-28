'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthContext } from '@/contexts/AuthContext';
import RoleRequestForm from '@/components/RoleRequestForm';
import LoadingSpinner from '@/components/LoadingSpinner';
import { updateUsername } from '@/lib/auth';

interface UsernameFormData {
  username: string;
}

export default function UserPage() {
  const router = useRouter();
  const { isAuthenticated, isValidating, user, refreshUser } = useAuthContext();
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

  useEffect(() => {
    if (!isValidating && !isAuthenticated) {
      router.push('/login');
    }
    if (!isValidating && user?.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [isValidating, isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.username) {
      reset({ username: user.username });
    }
  }, [user?.username, reset]);

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

  // Show loading only when validating without cached user
  if (isValidating && !user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ユーザー設定</h2>

      {/* Username Change Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">ユーザー名を変更</h2>
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

      {/* Role Request Section */}
      <RoleRequestForm />
    </div>
  );
}
