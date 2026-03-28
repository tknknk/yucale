import api, { getApiErrorMessage } from './api';
import { LoginRequest, RegisterRequest, AuthResponse, RefreshTokenResponse } from '@/types/auth';
import { User } from '@/types/user';
import { AxiosError } from 'axios';

// User-friendly error messages for authentication
const getAuthErrorMessage = (error: unknown, isLogin: boolean): string => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    // バックエンドからのメッセージがある場合はそれを使用
    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage;
    }

    // ステータスコードに応じたデフォルトメッセージ
    if (isLogin) {
      switch (status) {
        case 401:
          return 'メールアドレスまたはパスワードが正しくありません。';
        case 429:
          return 'ログイン試行回数が多すぎます。しばらくしてから再度お試しください。';
        case 500:
          return 'サーバーエラーが発生しました。しばらくしてから再度お試しください。';
        default:
          return 'ログインに失敗しました。入力内容をご確認ください。';
      }
    } else {
      switch (status) {
        case 400:
          return '入力内容に問題があります。ご確認ください。';
        case 409:
          return 'このメールアドレスまたはユーザー名は既に使用されています。';
        case 429:
          return '登録試行回数が多すぎます。しばらくしてから再度お試しください。';
        case 500:
          return 'サーバーエラーが発生しました。しばらくしてから再度お試しください。';
        default:
          return '登録に失敗しました。入力内容をご確認ください。';
      }
    }
  }
  return isLogin ? 'ログインに失敗しました。' : '登録に失敗しました。';
};

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export const authApi = {
  // Initialize CSRF token by calling the csrf endpoint
  initCsrf: async (): Promise<void> => {
    try {
      await api.get('/auth/csrf');
    } catch {
      // Ignore errors - CSRF token will be set via cookie
    }
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      // Spring Security form login expects form-urlencoded data
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);
      await api.post<ApiResponse<string>>('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      // Session-based auth: fetch user info and initialize CSRF token
      const user = await authApi.getCurrentUser();
      await authApi.initCsrf();
      return { accessToken: '', refreshToken: '', user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, true));
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      await api.post<ApiResponse<User>>('/auth/register', data);
      // Fetch user info and initialize CSRF token after registration
      const user = await authApi.getCurrentUser();
      await authApi.initCsrf();
      return { accessToken: '', refreshToken: '', user };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, false));
    }
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; message: string; data: User }>('/auth/me');
    return response.data.data;
  },
};

export const updateUsername = async (username: string): Promise<User> => {
  try {
    const response = await api.put<ApiResponse<User>>('/auth/username', { username });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'ユーザー名の更新に失敗しました');
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'ユーザー名の更新に失敗しました'));
  }
};
