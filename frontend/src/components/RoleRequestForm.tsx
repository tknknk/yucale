'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';

type RequestableRole = 'VIEWER' | 'EDITOR' | 'ADMIN';

const ROLE_HIERARCHY: Record<string, number> = {
  'NO_ROLE': 0,
  'VIEWER': 1,
  'EDITOR': 2,
  'ADMIN': 3,
};

interface RoleRequestFormData {
  role: RequestableRole;
  message: string;
}

interface RoleRequestFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function RoleRequestForm({ onSuccess, onError }: RoleRequestFormProps) {
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Filter roles to only show roles higher than user's current role
  // ADMIN can only be requested by EDITOR
  const availableRoles = useMemo(() => {
    const currentRole = user?.role ?? 'NO_ROLE';
    const currentRoleLevel = ROLE_HIERARCHY[currentRole] ?? 0;

    // Base roles available to everyone
    const allRoles: { value: RequestableRole; label: string }[] = [
      { value: 'VIEWER', label: 'Viewer - 予定の閲覧' },
      { value: 'EDITOR', label: 'Editor - 予定の作成と編集' },
    ];

    // Only EDITOR can request ADMIN
    if (currentRole === 'EDITOR') {
      allRoles.push({ value: 'ADMIN', label: 'Admin - 全管理機能' });
    }

    return allRoles.filter(role => ROLE_HIERARCHY[role.value] > currentRoleLevel);
  }, [user?.role]);

  // Determine the default role based on user's current role
  const defaultRole = useMemo((): RequestableRole => {
    const currentRole = user?.role ?? 'NO_ROLE';
    switch (currentRole) {
      case 'VIEWER':
        return 'EDITOR';
      case 'EDITOR':
        return 'ADMIN';
      default:
        return 'VIEWER';
    }
  }, [user?.role]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleRequestFormData>({
    defaultValues: {
      role: defaultRole,
      message: '',
    },
  });

  // Reset form when defaultRole changes
  useEffect(() => {
    reset({ role: defaultRole, message: '' });
  }, [defaultRole, reset]);

  const onSubmit = async (data: RoleRequestFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      await api.post('/auth/request-role', { requestedRole: data.role, message: data.message });

      setSuccess(true);
      reset();
      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'ロールリクエストの送信に失敗しました';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">昇格をリクエスト</h2>
      <p className="text-gray-800 mb-6">
        追加機能にアクセスするために権限の昇格をリクエストします。リクエストは管理者によって審査されます。
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6 text-green-700 text-sm">
          リクエストが正常に送信されました。管理者の対応をお待ちください。<br/>リクエスト承認後は自動でログアウトされるため、再度ログインしてください。
        </div>
      )}

      {availableRoles.length === 0 && !success && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-blue-700 text-sm">
          リクエスト可能な上位ロールはありません。
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-800 mb-1">
            リクエストするロール
          </label>
          <select
            id="role"
            {...register('role', {
              required: 'ロールを選択してください',
            })}
            className={`text-gray-700 ${errors.role ? 'border-red-500' : ''}`}
            disabled={isLoading || availableRoles.length === 0}
          >
            {availableRoles.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-800 mb-1">
            リクエストメッセージ
          </label>
          <textarea
            id="message"
            {...register('message')}
            rows={4}
            className={errors.message ? 'border-red-500' : ''}
            placeholder="このロールが必要な理由を入力してください（任意）"
            disabled={isLoading}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || success || availableRoles.length === 0}
          className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              リクエスト送信中...
            </>
          ) : success ? (
            'リクエスト送信済み'
          ) : (
            'ロールをリクエスト'
          )}
        </button>
      </form>
    </div>
  );
}
