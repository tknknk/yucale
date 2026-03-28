import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminPage from './page';
import { useAuth } from '@/hooks/useAuth';

// Mock the modules
jest.mock('@/hooks/useAuth');
jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => ({
    refreshUser: jest.fn(),
  }),
}));
jest.mock('@/components/AuthRequestList', () => ({
  __esModule: true,
  default: function MockAuthRequestList({ showAll }: { showAll?: boolean }) {
    return <div data-testid="auth-request-list" data-show-all={showAll}>Mock AuthRequestList</div>;
  },
}));

jest.mock('@/components/UserList', () => ({
  __esModule: true,
  default: function MockUserList() {
    return <div data-testid="user-list">Mock UserList</div>;
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('loading state', () => {
    it('should display loading spinner when loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isValidating: true,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<AdminPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('access control', () => {
    it('should redirect to home when not authenticated', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<AdminPage />);

      await waitFor(() => {
        expect(mockLocation.href).toBe('/');
      });
    });

    it('should redirect to home when user is not admin', async () => {
      mockUseAuth.mockReturnValue({
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
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<AdminPage />);

      await waitFor(() => {
        expect(mockLocation.href).toBe('/');
      });
    });

    it('should display access denied message for non-admin users', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'EDITOR',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        isAuthenticated: true,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<AdminPage />);

      expect(screen.getByText('アクセス拒否')).toBeInTheDocument();
      expect(screen.getByText(/このページを表示する権限がありません/)).toBeInTheDocument();
    });
  });

  describe('admin access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        isAuthenticated: true,
        isLoading: false,
        isValidating: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
      });
    });

    it('should display admin dashboard for admin users', () => {
      render(<AdminPage />);

      expect(screen.getByText('管理者ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText(/ロールリクエストとユーザーを管理/)).toBeInTheDocument();
    });

    describe('tabs', () => {
      it('should display all tabs', () => {
        render(<AdminPage />);

        expect(screen.getByRole('button', { name: /ロールリクエスト/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /ユーザー/ })).toBeInTheDocument();
      });

      it('should show requests tab by default', () => {
        render(<AdminPage />);

        expect(screen.getByTestId('auth-request-list')).toBeInTheDocument();
      });

      it('should switch to users tab when clicked', async () => {
        render(<AdminPage />);

        const usersTab = screen.getByRole('button', { name: /ユーザー/ });
        fireEvent.click(usersTab);

        expect(screen.getByText('ユーザー管理')).toBeInTheDocument();
        await waitFor(() => {
          expect(screen.getByTestId('user-list')).toBeInTheDocument();
        });
      });

      it('should switch back to requests tab when clicked', async () => {
        render(<AdminPage />);

        // Go to users tab
        const usersTab = screen.getByRole('button', { name: /ユーザー/ });
        fireEvent.click(usersTab);

        expect(screen.getByText('ユーザー管理')).toBeInTheDocument();

        // Go back to requests tab
        const requestsTab = screen.getByRole('button', { name: /ロールリクエスト/ });
        fireEvent.click(requestsTab);

        await waitFor(() => {
          expect(screen.getByTestId('auth-request-list')).toBeInTheDocument();
        });
      });
    });

    describe('show all requests toggle', () => {
      it('should display show all checkbox', () => {
        render(<AdminPage />);

        expect(screen.getByLabelText(/すべてのリクエストを表示/)).toBeInTheDocument();
      });

      it('should toggle showAll when checkbox is clicked', () => {
        render(<AdminPage />);

        const checkbox = screen.getByLabelText(/すべてのリクエストを表示/);
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);

        expect(checkbox).toBeChecked();
        expect(screen.getByTestId('auth-request-list')).toHaveAttribute('data-show-all', 'true');
      });

      it('should pass showAll=false to AuthRequestList by default', () => {
        render(<AdminPage />);

        expect(screen.getByTestId('auth-request-list')).toHaveAttribute('data-show-all', 'false');
      });
    });
  });
});
