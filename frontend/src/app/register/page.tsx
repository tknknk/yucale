'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthForm, { LoginFormData, RegisterFormData } from '@/components/AuthForm';
import { useAuthContext } from '@/contexts/AuthContext';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, isLoading, isAuthenticated } = useAuthContext();

  // 非ログインで出欠調査に回答した人が、同じユーザー名で登録できるよう初期値を入れておく
  const defaultUsername = searchParams.get('username') ?? '';

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (data: LoginFormData | RegisterFormData) => {
    const registerData = data as RegisterFormData;
    const { confirmPassword, ...payload } = registerData;
    await registerUser(payload);
    // Redirect to login page on successful registration
    router.push('/login');
  };

  // Show nothing while checking auth or if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthForm
      mode="register"
      onSubmit={handleSubmit}
      isLoading={isLoading}
      defaultUsername={defaultUsername}
    />
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">読み込み中...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
