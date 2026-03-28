import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend InternalAxiosRequestConfig to include retry flag
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _csrfRetry?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Get user-friendly error message from API error
 * バックエンドからのエラーメッセージを優先的に使用し、
 * ない場合はステータスコードに応じたデフォルトメッセージを返す
 */
export const getApiErrorMessage = (error: unknown, defaultMessage?: string): string => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    // バックエンドからのメッセージがある場合はそれを使用
    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage;
    }

    // ステータスコードに応じたデフォルトメッセージ
    switch (status) {
      case 400:
        return '入力内容に問題があります。ご確認ください。';
      case 401:
        return '認証が必要です。ログインしてください。';
      case 403:
        return 'この操作を行う権限がありません。';
      case 404:
        return 'リソースが見つかりません。';
      case 409:
        return '競合が発生しました。既に同じデータが存在する可能性があります。';
      case 429:
        return 'リクエストが多すぎます。しばらくしてから再度お試しください。';
      case 500:
        return 'サーバーエラーが発生しました。しばらくしてから再度お試しください。';
      default:
        return defaultMessage || '予期しないエラーが発生しました。';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage || '予期しないエラーが発生しました。';
};

// Custom event for session expiration
export const SESSION_EXPIRED_EVENT = 'session-expired';

// URLs that should not trigger session expiration redirect
const AUTH_URLS = ['/auth/login', '/auth/register', '/auth/me', '/auth/csrf'];

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Include credentials for session cookies
});

// Request interceptor - reads XSRF-TOKEN cookie and sends it as X-XSRF-TOKEN header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof document !== 'undefined') {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      if (csrfToken && config.headers) {
        config.headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined;
    const requestUrl = config?.url || '';

    // Handle 403 errors - possible CSRF token missing
    // Retry once after fetching a fresh CSRF token
    if (error.response?.status === 403 && config && !config._csrfRetry) {
      // Only retry for state-changing methods (POST, PUT, DELETE, PATCH)
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        config._csrfRetry = true;
        try {
          // Fetch fresh CSRF token
          await api.get('/auth/csrf');
          // Retry the original request
          return api.request(config);
        } catch {
          // CSRF fetch failed, proceed with original error
        }
      }
    }

    // Handle 401 errors - session expired
    if (error.response?.status === 401) {
      // Don't trigger session expiration for auth-related endpoints
      const isAuthUrl = AUTH_URLS.some(url => requestUrl.includes(url));

      if (!isAuthUrl && typeof window !== 'undefined') {
        // Dispatch session expired event
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
