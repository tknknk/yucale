import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from './Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the modules
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('Header', () => {
  const mockPush = jest.fn();
  const mockLogout = jest.fn();

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

  describe('when validating without cached user', () => {
    it('should display skeleton navigation', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isValidating: true,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: mockLogout,
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<Header />);

      // Should show skeleton, not login/register links
      expect(screen.queryByRole('link', { name: /ログイン/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /登録/ })).not.toBeInTheDocument();
    });
  });

  describe('when not authenticated', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: mockLogout,
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should display login and register links', () => {
      render(<Header />);

      expect(screen.getByRole('link', { name: /ログイン/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /登録/ })).toBeInTheDocument();
    });

    it('should display the app title as a link', () => {
      render(<Header />);

      const titleLink = screen.getByRole('link', { name: /ゆカレ/i });
      expect(titleLink).toBeInTheDocument();
      expect(titleLink).toHaveAttribute('href', '/');
    });

    it('should not display logout button', () => {
      render(<Header />);

      expect(screen.queryByRole('button', { name: /ログアウト/ })).not.toBeInTheDocument();
    });

    it('should not display admin link', () => {
      render(<Header />);

      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    });

    it('should have home link', () => {
      render(<Header />);

      const homeLink = screen.getByRole('link', { name: /ホーム/ });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('when authenticated as regular user', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'VIEWER' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: mockLogout,
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should display username with role as a link to user page', () => {
      render(<Header />);

      const userLink = screen.getByRole('link', { name: /testuser \(viewer\)/i });
      expect(userLink).toBeInTheDocument();
      expect(userLink).toHaveAttribute('href', '/user');
    });

    it('should display logout button', () => {
      render(<Header />);

      expect(screen.getByRole('button', { name: /ログアウト/ })).toBeInTheDocument();
    });

    it('should not display login and register links', () => {
      render(<Header />);

      expect(screen.queryByRole('link', { name: /^ログイン$/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^登録$/ })).not.toBeInTheDocument();
    });

    it('should display schedule link for authenticated users', () => {
      render(<Header />);

      const scheduleLink = screen.getByRole('link', { name: /予定/ });
      expect(scheduleLink).toBeInTheDocument();
      expect(scheduleLink).toHaveAttribute('href', '/schedule');
    });

    it('should not display admin link for non-admin users', () => {
      render(<Header />);

      expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
    });

    it('should call logout and redirect on logout button click', async () => {
      mockLogout.mockResolvedValue(undefined);

      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /ログアウト/ });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('when authenticated as admin', () => {
    const mockAdminUser = {
      id: 1,
      username: 'adminuser',
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: mockAdminUser,
        isAuthenticated: true,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: mockLogout,
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });
    });

    it('should display username with role as a link to admin page for admin users', () => {
      render(<Header />);

      const userLink = screen.getByRole('link', { name: /adminuser \(admin\)/i });
      expect(userLink).toBeInTheDocument();
      expect(userLink).toHaveAttribute('href', '/admin');
    });
  });

});
