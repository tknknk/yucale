'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: LoginFormData | RegisterFormData) => Promise<void>;
  isLoading?: boolean;
}

export default function AuthForm({ mode, onSubmit, isLoading = false }: AuthFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isLogin = mode === 'login';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const handleFormSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      if (isLogin) {
        await onSubmit({ email: data.email, password: data.password });
      } else {
        await onSubmit(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(isLogin ? 'メールアドレスまたはパスワードが正しくありません。' : '登録に失敗しました。もう一度お試しください。');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-soft-lg p-8 border border-gray-100/50">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isLogin ? 'ゆカレにログイン' : 'アカウントを作成'}
        </h1>

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl p-4 mb-6 text-red-700 text-sm shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              {...register('email', {
                required: 'メールアドレスは必須です',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'メールアドレスの形式が正しくありません',
                },
              })}
              className={errors.email ? 'border-red-500' : ''}
              placeholder="メールアドレスを入力"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-1">
              パスワード
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                {...register('password', {
                  required: 'パスワードは必須です',
                  minLength: {
                    value: 4,
                    message: 'パスワードは4文字以上で入力してください',
                  },
                })}
                className={`pr-10 ${errors.password ? 'border-red-500' : ''}`}
                placeholder={isLogin ? 'パスワードを入力' : 'パスワードを作成'}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-800 mb-1">
                パスワード（確認）
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  {...register('confirmPassword', {
                    required: 'パスワードを再入力してください',
                    validate: (value) =>
                      value === password || 'パスワードが一致しません',
                  })}
                  className={`pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="パスワードを再入力"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-800 mb-1">
                ユーザー名(名字)
              </label>
              <input
                type="text"
                id="username"
                {...register('username', {
                  required: 'ユーザー名は必須です',
                  minLength: {
                    value: 1,
                    message: 'ユーザー名は1文字以上で入力してください',
                  },
                  maxLength: {
                    value: 20,
                    message: 'ユーザー名は20文字以内で入力してください',
                  },
                  validate: (value: string) => {
                    // 記号のみを禁止（ASCII記号と一般的な記号）
                    const symbolPattern = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~。、・「」『』【】〈〉《》（）！？＠＃＄％＆＊＋＝～｀]/;
                    if (symbolPattern.test(value)) {
                      return 'ユーザー名に記号は使用できません';
                    }
                    return true;
                  },
                })}
                className={errors.username ? 'border-red-500' : ''}
                placeholder="ユーザー名を入力"
                disabled={isLoading}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                {isLogin ? 'ログイン中...' : 'アカウント作成中...'}
              </>
            ) : (
              isLogin ? 'ログイン' : '登録'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-800">
          {isLogin ? (
            <>
              アカウントをお持ちでない方は{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-800 font-medium">
                新規登録
              </Link>
            </>
          ) : (
            <>
              アカウントをお持ちの方は{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-800 font-medium">
                ログイン
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
