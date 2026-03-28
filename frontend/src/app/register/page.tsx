'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm, { LoginFormData, RegisterFormData } from '@/components/AuthForm';
import { useAuthContext } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, isAuthenticated } = useAuthContext();

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

  return <AuthForm mode="register" onSubmit={handleSubmit} isLoading={isLoading} />;
}
