import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScheduleList from './ScheduleList';
import { Schedule } from '@/types/schedule';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock the auth lib
jest.mock('@/lib/auth', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn().mockResolvedValue(null),
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

const mockSchedules: Schedule[] = [
  {
    id: 1,
    title: 'Schedule 1',
    summary: 'Summary 1',
    description: 'Description 1',
    startTime: '2024-02-15T10:00:00',
    endTime: '2024-02-15T11:00:00',
    dtstart: '2024-02-15T10:00:00',
    dtend: '2024-02-15T11:00:00',
    allDay: false,
    userId: 1,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  },
  {
    id: 2,
    title: 'Schedule 2',
    summary: 'Summary 2',
    description: 'Description 2',
    startTime: '2024-02-16T14:00:00',
    endTime: '2024-02-16T15:00:00',
    dtstart: '2024-02-16T14:00:00',
    dtend: '2024-02-16T15:00:00',
    allDay: false,
    userId: 1,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
  },
];

// Helper function to render with AuthProvider
const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('ScheduleList', () => {
  describe('loading state', () => {
    it('should display loading spinner when loading with no schedules', () => {
      renderWithAuth(
        <ScheduleList
          schedules={[]}
          isLoading={true}
          error={null}
        />
      );

      // LoadingSpinner should be present
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not display loading spinner when schedules exist (load more state)', () => {
      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={true}
          error={null}
        />
      );

      expect(screen.getByText('Summary 1')).toBeInTheDocument();
      expect(screen.getByText('Summary 2')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when error exists', () => {
      renderWithAuth(
        <ScheduleList
          schedules={[]}
          isLoading={false}
          error="Failed to load schedules"
        />
      );

      expect(screen.getByText('予定の読み込みに失敗しました')).toBeInTheDocument();
      expect(screen.getByText('Failed to load schedules')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should display default empty message when no schedules', () => {
      renderWithAuth(
        <ScheduleList
          schedules={[]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('No schedules found')).toBeInTheDocument();
    });

    it('should display custom empty message when provided', () => {
      renderWithAuth(
        <ScheduleList
          schedules={[]}
          isLoading={false}
          error={null}
          emptyMessage="Custom empty message"
        />
      );

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });

    it('should display add button in empty state when showAddButton and canEdit', () => {
      const mockOnAddSchedule = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={[]}
          isLoading={false}
          error={null}
          showAddButton={true}
          canEdit={true}
          onAddSchedule={mockOnAddSchedule}
        />
      );

      expect(screen.getByRole('button', { name: /最初の予定を作成/ })).toBeInTheDocument();
    });
  });

  describe('schedules rendering', () => {
    it('should render all schedules', () => {
      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('Summary 1')).toBeInTheDocument();
      expect(screen.getByText('Summary 2')).toBeInTheDocument();
    });

    it('should pass correct props to ScheduleCard', () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          showActions={true}
          canEdit={true}
        />
      );

      // Verify schedules are rendered
      expect(screen.getByText('Summary 1')).toBeInTheDocument();
      expect(screen.getByText('Summary 2')).toBeInTheDocument();
    });
  });

  describe('add button', () => {
    it('should display add button when showAddButton and canEdit are true', () => {
      const mockOnAddSchedule = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          showAddButton={true}
          canEdit={true}
          onAddSchedule={mockOnAddSchedule}
        />
      );

      expect(screen.getByRole('button', { name: /予定を追加/ })).toBeInTheDocument();
    });

    it('should not display add button when canEdit is false', () => {
      const mockOnAddSchedule = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          showAddButton={true}
          canEdit={false}
          onAddSchedule={mockOnAddSchedule}
        />
      );

      expect(screen.queryByRole('button', { name: /予定を追加/ })).not.toBeInTheDocument();
    });

    it('should call onAddSchedule when add button is clicked', () => {
      const mockOnAddSchedule = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          showAddButton={true}
          canEdit={true}
          onAddSchedule={mockOnAddSchedule}
        />
      );

      const addButton = screen.getByRole('button', { name: /予定を追加/ });
      fireEvent.click(addButton);

      expect(mockOnAddSchedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('load more', () => {
    it('should display load more button when hasMore is true', () => {
      const mockOnLoadMore = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByRole('button', { name: /さらに読み込む/ })).toBeInTheDocument();
    });

    it('should not display load more button when hasMore is false', () => {
      const mockOnLoadMore = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMore={false}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.queryByRole('button', { name: /さらに読み込む/ })).not.toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', () => {
      const mockOnLoadMore = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      const loadMoreButton = screen.getByRole('button', { name: /さらに読み込む/ });
      fireEvent.click(loadMoreButton);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should disable load more button when loading', () => {
      const mockOnLoadMore = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={true}
          error={null}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      const loadMoreButton = screen.getByRole('button', { name: /読み込み中/ });
      expect(loadMoreButton).toBeDisabled();
    });
  });

  describe('load all past schedules', () => {
    it('should display "過去の予定をすべて表示する" button when hasMorePast is true', () => {
      const mockOnLoadMorePast = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMorePast={true}
          hiddenPastCount={6}
          onLoadMorePast={mockOnLoadMorePast}
        />
      );

      expect(screen.getByRole('button', { name: /過去の予定をすべて表示する \(6件\)/i })).toBeInTheDocument();
    });

    it('should not display load past button when hasMorePast is false', () => {
      const mockOnLoadMorePast = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMorePast={false}
          hiddenPastCount={0}
          onLoadMorePast={mockOnLoadMorePast}
        />
      );

      expect(screen.queryByRole('button', { name: /過去の予定をすべて表示する/i })).not.toBeInTheDocument();
    });

    it('should call onLoadMorePast when button is clicked', () => {
      const mockOnLoadMorePast = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMorePast={true}
          hiddenPastCount={12}
          onLoadMorePast={mockOnLoadMorePast}
        />
      );

      const loadPastButton = screen.getByRole('button', { name: /過去の予定をすべて表示する \(12件\)/i });
      fireEvent.click(loadPastButton);

      expect(mockOnLoadMorePast).toHaveBeenCalledTimes(1);
    });

    it('should disable load past button when loading', () => {
      const mockOnLoadMorePast = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={true}
          error={null}
          hasMorePast={true}
          hiddenPastCount={6}
          onLoadMorePast={mockOnLoadMorePast}
        />
      );

      // When loading, the button text changes to "読み込み中..."
      const loadingButtons = screen.getAllByRole('button', { name: /読み込み中/ });
      expect(loadingButtons.length).toBeGreaterThanOrEqual(1);
      expect(loadingButtons[0]).toBeDisabled();
    });

    it('should show correct hidden count in button text', () => {
      const mockOnLoadMorePast = jest.fn();

      renderWithAuth(
        <ScheduleList
          schedules={mockSchedules}
          isLoading={false}
          error={null}
          hasMorePast={true}
          hiddenPastCount={18}
          onLoadMorePast={mockOnLoadMorePast}
        />
      );

      expect(screen.getByText(/\(18件\)/)).toBeInTheDocument();
    });
  });
});
