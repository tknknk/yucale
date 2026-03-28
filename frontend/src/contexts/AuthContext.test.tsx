import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from './AuthContext';
import { authApi } from '@/lib/auth';

// Mock the auth lib
jest.mock('@/lib/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock api module for SESSION_EXPIRED_EVENT
jest.mock('@/lib/api', () => ({
  SESSION_EXPIRED_EVENT: 'session-expired',
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component that uses the context
function TestComponent() {
  const { user, isLoading, isValidating, isAuthenticated, error, login, register, logout } = useAuthContext();

  const handleLogin = async () => {
    try {
      await login({ email: 'test@example.com', password: 'password' });
    } catch {
      // Error is handled by context
    }
  };

  const handleRegister = async () => {
    try {
      await register({ username: 'test', email: 'test@example.com', password: 'password' });
    } catch {
      // Error is handled by context
    }
  };

  return (
    <div>
      <div data-testid="isLoading">{isLoading.toString()}</div>
      <div data-testid="isValidating">{isValidating.toString()}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="username">{user?.username || 'null'}</div>
      <div data-testid="error">{error || 'null'}</div>
      <button onClick={handleLogin}>
        Login
      </button>
      <button onClick={handleRegister}>
        Register
      </button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should check auth on mount and set user when session is valid', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'VIEWER' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isValidating')).toHaveTextContent('false');
      });

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });

    it('should set user to null when session is invalid', async () => {
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isValidating')).toHaveTextContent('false');
      });

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('username')).toHaveTextContent('null');
    });
  });

  describe('login', () => {
    it('should login user with session-based auth', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'VIEWER' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      // First call fails (no session), second call after login succeeds
      mockAuthApi.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));
      mockAuthApi.login.mockResolvedValue({
        user: mockUser,
        accessToken: '',
        refreshToken: '',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isValidating')).toHaveTextContent('false');
      });

      const loginButton = screen.getByText('Login');
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(mockAuthApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('testuser');
    });

    it('should set error when login fails', async () => {
      mockAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const loginError = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValue(loginError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isValidating')).toHaveTextContent('false');
      });

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
        // Wait for the promise to settle
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      }, { timeout: 3000 });
    });
  });

  describe('register', () => {
    it('should register user with session-based auth', async () => {
      const mockUser = {
        id: 1,
        username: 'test',
        email: 'test@example.com',
        role: 'NO_ROLE' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockAuthApi.getCurrentUser.mockRejectedValueOnce(new Error('Unauthorized'));
      mockAuthApi.register.mockResolvedValue({
        user: mockUser,
        accessToken: '',
        refreshToken: '',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isValidating')).toHaveTextContent('false');
      });

      const registerButton = screen.getByText('Register');
      await act(async () => {
        registerButton.click();
      });

      await waitFor(() => {
        expect(mockAuthApi.register).toHaveBeenCalledWith({
          username: 'test',
          email: 'test@example.com',
          password: 'password',
        });
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('username')).toHaveTextContent('test');
    });
  });

  describe('logout', () => {
    it('should logout user and clear session', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'VIEWER' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthApi.logout.mockResolvedValue(undefined);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(mockAuthApi.logout).toHaveBeenCalled();
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('username')).toHaveTextContent('null');
    });

    it('should clear auth state even when logout API call fails', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'VIEWER' as const,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockAuthApi.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthApi.logout.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuthContext must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
