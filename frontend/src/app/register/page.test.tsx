import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from './page';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the modules
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('RegisterPage', () => {
  const mockPush = jest.fn();
  const mockRegister = jest.fn();
  const user = userEvent.setup({ delay: null });

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
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should render register form', () => {
      render(<RegisterPage />);

      expect(screen.getByText('アカウントを作成')).toBeInTheDocument();
      expect(screen.getByLabelText(/ユーザー名/)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
      expect(screen.getByLabelText(/^パスワード$/)).toBeInTheDocument();
      expect(screen.getByLabelText(/パスワード（確認）/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^登録$/ })).toBeInTheDocument();
    });

    it('should call register and redirect on successful form submission', async () => {
      mockRegister.mockResolvedValue(undefined);

      render(<RegisterPage />);

      const usernameInput = screen.getByLabelText(/ユーザー名/);
      await user.type(usernameInput, 'testuser');

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^パスワード$/);
      await user.type(passwordInput, 'Password1');

      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
      await user.type(confirmPasswordInput, 'Password1');

      const submitButton = screen.getByRole('button', { name: /^登録$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password1',
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should display error when registration fails', async () => {
      mockRegister.mockRejectedValue(new Error('Email already exists'));

      render(<RegisterPage />);

      const usernameInput = screen.getByLabelText(/ユーザー名/);
      await user.type(usernameInput, 'testuser');

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await user.type(emailInput, 'existing@example.com');

      const passwordInput = screen.getByLabelText(/^パスワード$/);
      await user.type(passwordInput, 'Password1');

      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
      await user.type(confirmPasswordInput, 'Password1');

      const submitButton = screen.getByRole('button', { name: /^登録$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('should show link to login page', () => {
      render(<RegisterPage />);

      const loginLink = screen.getByRole('link', { name: /ログイン/ });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should validate that passwords match', async () => {
      render(<RegisterPage />);

      const usernameInput = screen.getByLabelText(/ユーザー名/);
      await user.type(usernameInput, 'testuser');

      const emailInput = screen.getByLabelText(/メールアドレス/);
      await user.type(emailInput, 'test@example.com');

      const passwordInput = screen.getByLabelText(/^パスワード$/);
      await user.type(passwordInput, 'Password1');

      const confirmPasswordInput = screen.getByLabelText(/パスワード（確認）/);
      await user.type(confirmPasswordInput, 'Password2');

      const submitButton = screen.getByRole('button', { name: /^登録$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/パスワードが一致しません/)).toBeInTheDocument();
      });

      expect(mockRegister).not.toHaveBeenCalled();
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
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should redirect to home page', async () => {
      render(<RegisterPage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('should not render register form', () => {
      render(<RegisterPage />);

      expect(screen.queryByText('アカウントを作成')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator during registration', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<RegisterPage />);

      expect(screen.getByText(/アカウント作成中/)).toBeInTheDocument();
    });

    it('should disable form inputs during loading', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<RegisterPage />);

      expect(screen.getByLabelText(/ユーザー名/)).toBeDisabled();
      expect(screen.getByLabelText(/メールアドレス/)).toBeDisabled();
      expect(screen.getByLabelText(/^パスワード$/)).toBeDisabled();
      expect(screen.getByLabelText(/パスワード（確認）/)).toBeDisabled();
    });
  });
});
