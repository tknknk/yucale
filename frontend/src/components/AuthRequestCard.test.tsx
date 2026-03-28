import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthRequestCard from './AuthRequestCard';
import { AuthRequest } from '@/lib/admin';

const mockPendingRequest: AuthRequest = {
  id: 1,
  userId: 1,
  username: 'testuser',
  requestedRole: 'EDITOR',
  requestMessage: 'I need editor access to manage schedules',
  status: 'PENDING',
  createdAt: '2024-02-15T10:00:00Z',
  updatedAt: '2024-02-15T10:00:00Z',
};

const mockApprovedRequest: AuthRequest = {
  ...mockPendingRequest,
  id: 2,
  status: 'APPROVED',
};

const mockRejectedRequest: AuthRequest = {
  ...mockPendingRequest,
  id: 3,
  status: 'REJECTED',
};

describe('AuthRequestCard', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should display username', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should display requested role badge', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('編集者')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });

    it('should display request message', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('I need editor access to manage schedules')).toBeInTheDocument();
    });

    it('should display formatted date', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Date format: yyyy/MM/dd HH:mm
      expect(screen.getByText(/2024\/02\/15/)).toBeInTheDocument();
    });

    it('should not display message section when requestMessage is null', () => {
      const requestWithoutMessage: AuthRequest = {
        ...mockPendingRequest,
        requestMessage: null,
      };

      render(
        <AuthRequestCard
          request={requestWithoutMessage}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText(/I need editor access/)).not.toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should display approve and reject buttons for pending requests', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByRole('button', { name: /承認/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /拒否/ })).toBeInTheDocument();
    });

    it('should not display action buttons for approved requests', () => {
      render(
        <AuthRequestCard
          request={mockApprovedRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByRole('button', { name: /承認/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /拒否/ })).not.toBeInTheDocument();
    });

    it('should not display action buttons for rejected requests', () => {
      render(
        <AuthRequestCard
          request={mockRejectedRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByRole('button', { name: /承認/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /拒否/ })).not.toBeInTheDocument();
    });
  });

  describe('approve action', () => {
    it('should call onApprove with request id when approve button is clicked', async () => {
      mockOnApprove.mockResolvedValue(undefined);

      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /承認/ });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1);
        expect(mockOnApprove).toHaveBeenCalledWith(mockPendingRequest.id);
      });
    });

    it('should show processing state while approving', async () => {
      mockOnApprove.mockImplementation(() => new Promise(() => {}));

      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /承認/ });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText(/処理中/)).toBeInTheDocument();
      });
    });

    it('should disable buttons while processing approve', async () => {
      mockOnApprove.mockImplementation(() => new Promise(() => {}));

      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /承認/ });
      fireEvent.click(approveButton);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('reject action', () => {
    it('should open reject modal when reject button is clicked', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const rejectButton = screen.getByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButton);

      expect(screen.getByRole('heading', { name: /リクエストを拒否/ })).toBeInTheDocument();
      expect(screen.getByText(/のリクエストを拒否してもよろしいですか？/)).toBeInTheDocument();
    });

    it('should call onReject when reject button in modal is clicked', async () => {
      mockOnReject.mockResolvedValue(undefined);

      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Open modal
      const rejectButton = screen.getByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButton);

      // Click reject in modal
      const modalRejectButton = screen.getAllByRole('button', { name: /^拒否$/ })[1];
      fireEvent.click(modalRejectButton);

      await waitFor(() => {
        expect(mockOnReject).toHaveBeenCalledTimes(1);
        expect(mockOnReject).toHaveBeenCalledWith(mockPendingRequest.id);
      });
    });

    it('should close modal when cancel button is clicked', () => {
      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Open modal
      const rejectButton = screen.getByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButton);

      expect(screen.getByRole('heading', { name: /リクエストを拒否/ })).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('heading', { name: /リクエストを拒否/ })).not.toBeInTheDocument();
    });

    it('should close modal after successful rejection', async () => {
      mockOnReject.mockResolvedValue(undefined);

      render(
        <AuthRequestCard
          request={mockPendingRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Open modal
      const rejectButton = screen.getByRole('button', { name: /^拒否$/ });
      fireEvent.click(rejectButton);

      // Click reject in modal
      const modalRejectButton = screen.getAllByRole('button', { name: /^拒否$/ })[1];
      fireEvent.click(modalRejectButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /リクエストを拒否/ })).not.toBeInTheDocument();
      });
    });
  });

  describe('role badges', () => {
    it('should display correct badge for VIEWER role', () => {
      const viewerRequest: AuthRequest = {
        ...mockPendingRequest,
        requestedRole: 'VIEWER',
      };

      render(
        <AuthRequestCard
          request={viewerRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('閲覧者')).toBeInTheDocument();
    });

    it('should display correct badge for ADMIN role', () => {
      const adminRequest: AuthRequest = {
        ...mockPendingRequest,
        requestedRole: 'ADMIN',
      };

      render(
        <AuthRequestCard
          request={adminRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('管理者')).toBeInTheDocument();
    });

    it('should display correct badge for NO_ROLE', () => {
      const noRoleRequest: AuthRequest = {
        ...mockPendingRequest,
        requestedRole: 'NO_ROLE',
      };

      render(
        <AuthRequestCard
          request={noRoleRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('ロールなし')).toBeInTheDocument();
    });
  });

  describe('status badges', () => {
    it('should display APPROVED status badge', () => {
      render(
        <AuthRequestCard
          request={mockApprovedRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });

    it('should display REJECTED status badge', () => {
      render(
        <AuthRequestCard
          request={mockRejectedRequest}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });
});
