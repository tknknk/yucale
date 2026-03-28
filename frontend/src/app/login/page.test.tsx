import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the modules
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('LoginPage', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should render login form', () => {
      render(<LoginPage />);

      expect(screen.getByText('ゆカレにログイン')).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^パスワード$/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^ログイン$/ })).toBeInTheDocument();
    });

    it('should call login and redirect on successful form submission', async () => {
      mockLogin.mockResolvedValue(undefined);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await userEvent.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^パスワード$/);
      await userEvent.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should display error when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await userEvent.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^パスワード$/);
      await userEvent.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /^ログイン$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should show link to register page', () => {
      render(<LoginPage />);

      const registerLink = screen.getByRole('link', { name: /新規登録/ });
      expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  describe('when already authenticated', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'VIEWER',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should redirect to home page', async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should not render login form', () => {
      render(<LoginPage />);

      expect(screen.queryByText('ゆカレにログイン')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator during login', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<LoginPage />);

      expect(screen.getByText(/ログイン中/)).toBeInTheDocument();
    });

    it('should disable form inputs during loading', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<LoginPage />);

      expect(screen.getByLabelText(/メールアドレス/)).toBeDisabled();
      expect(screen.getByLabelText(/^パスワード$/)).toBeDisabled();
    });
  });
});
