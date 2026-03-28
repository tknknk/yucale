import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthRequestList from './AuthRequestList';
import { getPendingRequests, getAllRequests, approveRequest, rejectRequest, AuthRequest } from '@/lib/admin';

// Mock the admin module
jest.mock('@/lib/admin', () => ({
  getPendingRequests: jest.fn(),
  getAllRequests: jest.fn(),
  approveRequest: jest.fn(),
  rejectRequest: jest.fn(),
}));

const mockGetPendingRequests = getPendingRequests as jest.MockedFunction<typeof getPendingRequests>;
const mockGetAllRequests = getAllRequests as jest.MockedFunction<typeof getAllRequests>;
const mockApproveRequest = approveRequest as jest.MockedFunction<typeof approveRequest>;
const mockRejectRequest = rejectRequest as jest.MockedFunction<typeof rejectRequest>;

const mockPendingRequests: AuthRequest[] = [
  {
    id: 1,
    userId: 1,
    username: 'user1',
    requestedRole: 'EDITOR',
    requestMessage: 'Request 1 message',
    status: 'PENDING',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
  },
  {
    id: 2,
    userId: 2,
    username: 'user2',
    requestedRole: 'VIEWER',
    requestMessage: 'Request 2 message',
    status: 'PENDING',
    createdAt: '2024-02-14T10:00:00Z',
    updatedAt: '2024-02-14T10:00:00Z',
  },
];

const mockProcessedRequests: AuthRequest[] = [
  {
    id: 3,
    userId: 3,
    username: 'user3',
    requestedRole: 'EDITOR',
    requestMessage: 'Approved request',
    status: 'APPROVED',
    createdAt: '2024-02-13T10:00:00Z',
    updatedAt: '2024-02-13T12:00:00Z',
  },
  {
    id: 4,
    userId: 4,
    username: 'user4',
    requestedRole: 'VIEWER',
    requestMessage: 'Rejected request',
    status: 'REJECTED',
    createdAt: '2024-02-12T10:00:00Z',
    updatedAt: '2024-02-12T12:00:00Z',
  },
];

describe('AuthRequestList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should display loading spinner while fetching requests', async () => {
      mockGetPendingRequests.mockImplementation(() => new Promise(() => {}));

      render(<AuthRequestList />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when fetch fails', async () => {
      mockGetPendingRequests.mockRejectedValue(new Error('Failed to fetch'));

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });
    });

    it('should display retry button on error', async () => {
      mockGetPendingRequests.mockRejectedValue(new Error('Failed to fetch'));

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
      });
    });

    it('should refetch when retry button is clicked', async () => {
      mockGetPendingRequests.mockRejectedValueOnce(new Error('Failed to fetch'));
      mockGetPendingRequests.mockResolvedValueOnce(mockPendingRequests);

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /再試行/ });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      expect(mockGetPendingRequests).toHaveBeenCalledTimes(2);
    });
  });

  describe('empty state', () => {
    it('should display empty message when no requests', async () => {
      mockGetPendingRequests.mockResolvedValue([]);

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('保留中のリクエストはありません')).toBeInTheDocument();
        expect(screen.getByText('すべてのロールリクエストは処理済みです。')).toBeInTheDocument();
      });
    });
  });

  describe('displaying requests', () => {
    it('should fetch pending requests by default', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(mockGetPendingRequests).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
    });

    it('should fetch all requests when showAll is true', async () => {
      mockGetAllRequests.mockResolvedValue([...mockPendingRequests, ...mockProcessedRequests]);

      render(<AuthRequestList showAll={true} />);

      await waitFor(() => {
        expect(mockGetAllRequests).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('user2')).toBeInTheDocument();
      expect(screen.getByText('user3')).toBeInTheDocument();
      expect(screen.getByText('user4')).toBeInTheDocument();
    });

    it('should display pending requests section title with count', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('保留中のリクエスト (2)')).toBeInTheDocument();
      });
    });

    it('should display processed requests section when showAll is true', async () => {
      mockGetAllRequests.mockResolvedValue([...mockPendingRequests, ...mockProcessedRequests]);

      render(<AuthRequestList showAll={true} />);

      await waitFor(() => {
        expect(screen.getByText('保留中のリクエスト (2)')).toBeInTheDocument();
        expect(screen.getByText('処理済みのリクエスト (2)')).toBeInTheDocument();
      });
    });

    it('should not display processed requests section when showAll is false', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);

      render(<AuthRequestList showAll={false} />);

      await waitFor(() => {
        expect(screen.getByText('保留中のリクエスト (2)')).toBeInTheDocument();
      });

      expect(screen.queryByText(/処理済みのリクエスト/)).not.toBeInTheDocument();
    });
  });

  describe('approve action', () => {
    it('should call approveRequest and update list when approve is clicked', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);
      mockApproveRequest.mockResolvedValue({
        ...mockPendingRequests[0],
        status: 'APPROVED',
      });

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /承認/ });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(mockApproveRequest).toHaveBeenCalledWith(1);
      });
    });

    it('should show error message when approve fails', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);
      mockApproveRequest.mockRejectedValue(new Error('Approval failed'));

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /承認/ });
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Approval failed')).toBeInTheDocument();
      });
    });
  });

  describe('reject action', () => {
    it('should call rejectRequest when reject is confirmed', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);
      mockRejectRequest.mockResolvedValue({
        ...mockPendingRequests[0],
        status: 'REJECTED',
      });

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      // Click reject button to open modal
      const rejectButtons = screen.getAllByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButtons[0]);

      // Confirm rejection in modal
      const modalRejectButton = screen.getAllByRole('button', { name: /^拒否$/ })[1];
      fireEvent.click(modalRejectButton);

      await waitFor(() => {
        expect(mockRejectRequest).toHaveBeenCalledWith(1, undefined);
      });
    });

    it('should show error message when reject fails', async () => {
      mockGetPendingRequests.mockResolvedValue(mockPendingRequests);
      mockRejectRequest.mockRejectedValue(new Error('Rejection failed'));

      render(<AuthRequestList />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      // Click reject button to open modal
      const rejectButtons = screen.getAllByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButtons[0]);

      // Confirm rejection in modal
      const modalRejectButton = screen.getAllByRole('button', { name: /^拒否$/ })[1];
      fireEvent.click(modalRejectButton);

      await waitFor(() => {
        expect(screen.getByText('Rejection failed')).toBeInTheDocument();
      });
    });
  });
});
