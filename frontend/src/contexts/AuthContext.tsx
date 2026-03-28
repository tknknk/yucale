'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types/user';
import { LoginRequest, RegisterRequest } from '@/types/auth';
import { authApi } from '@/lib/auth';
import { SESSION_EXPIRED_EVENT } from '@/lib/api';

// Storage key for cached user
const USER_CACHE_KEY = 'auth_user_cache';

// Helper functions for user cache
const getCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(USER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Invalid cache, ignore
  }
  return null;
};

const setCachedUser = (user: User | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Storage error, ignore
  }
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isValidating: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Public paths that don't require authentication
const PUBLIC_PATHS = ['/', '/login', '/register'];

// Check if a path is public (doesn't require authentication)
const isPublicPath = (path: string): boolean => {
  if (PUBLIC_PATHS.includes(path)) return true;
  // /survey/[urlId] paths are public for responding (but not /survey/create or /survey/edit/*)
  if (path.startsWith('/survey/') && !path.startsWith('/survey/create') && !path.startsWith('/survey/edit/')) {
    return true;
  }
  return false;
};

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize with cached user for instant display
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const hasValidated = useRef(false);

  // Update cache whenever user changes
  useEffect(() => {
    setCachedUser(user);
  }, [user]);

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Session-based auth: always try to fetch user info
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      // Not authenticated or session expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Background validation on mount
  const validateSession = useCallback(async () => {
    if (hasValidated.current) return;
    hasValidated.current = true;

    try {
      setIsValidating(true);
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch {
      // Session invalid - clear cached user
      setUser(null);
      // Redirect if on protected page
      if (!isPublicPath(pathname)) {
        router.push('/login?expired=true');
      }
    } finally {
      setIsValidating(false);
    }
  }, [pathname, router]);

  // Refresh user data (can be called manually when needed)
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      // Session expired, clear user
      setUser(null);
    }
  }, []);

  // Handle session expiration
  const handleSessionExpired = useCallback(() => {
    setUser(null);

    // Only redirect if on a protected page
    if (!isPublicPath(pathname)) {
      router.push('/login?expired=true');
    }
  }, [pathname, router]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Listen for session expired events
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [handleSessionExpired]);

  const login = async (data: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.login(data);
      setUser(response.user);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.register(data);
      setUser(response.user);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch (err) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isValidating,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
