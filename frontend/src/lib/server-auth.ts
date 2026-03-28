import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Check authentication status on the server side
 * Uses session cookie to verify with backend
 */
export async function getServerAuth(): Promise<{ isAuthenticated: boolean; user: User | null }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('JSESSIONID');

    if (!sessionCookie) {
      return { isAuthenticated: false, user: null };
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Cookie: `JSESSIONID=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { isAuthenticated: false, user: null };
    }

    const data: ApiResponse<User> = await response.json();

    if (data.success && data.data) {
      return { isAuthenticated: true, user: data.data };
    }

    return { isAuthenticated: false, user: null };
  } catch {
    return { isAuthenticated: false, user: null };
  }
}
