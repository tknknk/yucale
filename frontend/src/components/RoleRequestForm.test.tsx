import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleRequestForm from './RoleRequestForm';
import { useAuthContext } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Mock the api module
jest.mock('@/lib/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;

describe('RoleRequestForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'NO_ROLE',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
      refreshUser: jest.fn(),
    });
  });

  describe('rendering', () => {
    it('should render the form title', () => {
      render(<RoleRequestForm />);

      expect(screen.getByText('昇格をリクエスト')).toBeInTheDocument();
    });

    it('should render the form description', () => {
      render(<RoleRequestForm />);

      expect(screen.getByText(/権限の昇格をリクエストします/)).toBeInTheDocument();
    });

    it('should render role select field', () => {
      render(<RoleRequestForm />);

      expect(screen.getByLabelText(/リクエストするロール/)).toBeInTheDocument();
    });

    it('should render message textarea', () => {
      render(<RoleRequestForm />);

      expect(screen.getByLabelText(/リクエストメッセージ/)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<RoleRequestForm />);

      expect(screen.getByRole('button', { name: /ロールをリクエスト/ })).toBeInTheDocument();
    });

    it('should have VIEWER as default role option', () => {
      render(<RoleRequestForm />);

      const roleSelect = screen.getByLabelText(/リクエストするロール/);
      expect(roleSelect).toHaveValue('VIEWER');
    });

    it('should have two role options', () => {
      render(<RoleRequestForm />);

      expect(screen.getByRole('option', { name: /Viewer/ })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Editor/ })).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('should allow submission without message (optional)', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalled();
      });
    });
  });

  describe('submission', () => {
    it('should call api.post with selected role and message', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<RoleRequestForm onSuccess={mockOnSuccess} />);

      // Select EDITOR role
      const roleSelect = screen.getByLabelText(/リクエストするロール/);
      fireEvent.change(roleSelect, { target: { value: 'EDITOR' } });

      // Enter message
      const messageInput = screen.getByLabelText(/リクエストメッセージ/);
      await userEvent.type(messageInput, 'I need editor access');

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledTimes(1);
      });

      expect(mockApi.post).toHaveBeenCalledWith('/auth/request-role', {
        requestedRole: 'EDITOR',
        message: 'I need editor access',
      });
    });

    it('should call onSuccess callback on successful submission', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<RoleRequestForm onSuccess={mockOnSuccess} />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should display success message on successful submission', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/リクエストが正常に送信されました/)).toBeInTheDocument();
      });
    });

    it('should display submit button as "リクエスト送信済み" after success', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /リクエスト送信済み/ })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message on submission failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Request failed'));

      render(<RoleRequestForm onError={mockOnError} />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Request failed')).toBeInTheDocument();
      });
    });

    it('should call onError callback on submission failure', async () => {
      mockApi.post.mockRejectedValue(new Error('Request failed'));

      render(<RoleRequestForm onError={mockOnError} />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Request failed');
      });
    });

    it('should display generic error message for non-Error exceptions', async () => {
      mockApi.post.mockRejectedValue('Unknown error');

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('ロールリクエストの送信に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('should disable form inputs while submitting', async () => {
      // Make api.post hang to test loading state
      mockApi.post.mockImplementation(() => new Promise(() => {}));

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/リクエストするロール/)).toBeDisabled();
        expect(screen.getByLabelText(/リクエストメッセージ/)).toBeDisabled();
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    it('should show loading text on submit button while submitting', async () => {
      mockApi.post.mockImplementation(() => new Promise(() => {}));

      render(<RoleRequestForm />);

      const submitButton = screen.getByRole('button', { name: /ロールをリクエスト/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/リクエスト送信中/)).toBeInTheDocument();
      });
    });
  });
});
