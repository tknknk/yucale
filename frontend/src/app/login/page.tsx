'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthForm, { LoginFormData } from '@/components/AuthForm';
import { useAuthContext } from '@/contexts/AuthContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated } = useAuthContext();
  const isExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (data: LoginFormData) => {
    await login({ email: data.email, password: data.password });
    router.push('/');
  };

  // Show nothing while checking auth or if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div>
      {isExpired && (
        <div className="max-w-md mx-auto mt-8 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm text-center">
            セッションの有効期限が切れました。再度ログインしてください。
          </p>
        </div>
      )}
      <AuthForm mode="login" onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
