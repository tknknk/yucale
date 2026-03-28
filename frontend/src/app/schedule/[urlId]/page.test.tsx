import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ScheduleDetailPage from './page';
import { schedulesApi } from '@/lib/schedules';
import { useAuthContext } from '@/contexts/AuthContext';

// Mock the dependencies
jest.mock('next/navigation', () => ({
  useParams: () => ({ urlId: 'abc12' }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuthContext: jest.fn(),
}));

jest.mock('@/lib/schedules', () => ({
  schedulesApi: {
    getByUrlId: jest.fn(),
  },
}));

jest.mock('@/components/LoadingSpinner', () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

const mockSchedule = {
  id: 1,
  urlId: 'abc12',
  title: 'Test Schedule',
  summary: 'Test Summary',
  description: 'This is a test description',
  startTime: '2024-02-15T10:00:00',
  endTime: '2024-02-15T11:00:00',
  dtstart: '2024-02-15T10:00:00',
  dtend: '2024-02-15T11:00:00',
  allDay: false,
  location: 'Test Location',
  song: 'Test Song',
  recording: 'https://example.com/recording',
  attendees: 'Alice, Bob',
  userId: 1,
  createdAt: '2024-02-01T00:00:00',
  updatedAt: '2024-02-01T00:00:00',
  updatedBy: 'testuser',
};

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockGetByUrlId = schedulesApi.getByUrlId as jest.MockedFunction<typeof schedulesApi.getByUrlId>;

describe('ScheduleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading state', () => {
    it('should show loading spinner while loading', () => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockImplementation(() => new Promise(() => {}));

      render(<ScheduleDetailPage />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Guest user (not authenticated)', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(mockSchedule);
    });

    it('should display title and date/time', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      // Date should be displayed
      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });

    it('should NOT display detailed information (location, description, etc.)', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      // Details should NOT be visible
      expect(screen.queryByText('Test Location')).not.toBeInTheDocument();
      expect(screen.queryByText('This is a test description')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Song')).not.toBeInTheDocument();
      expect(screen.queryByText('Alice, Bob')).not.toBeInTheDocument();
    });

    it('should show login prompt', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText('詳細を表示するにはログインしてください。')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'ログイン' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '登録' })).toBeInTheDocument();
    });

    it('should NOT show "すべての予定を見る" button', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /すべての予定を見る/ })).not.toBeInTheDocument();
    });
  });

  describe('NO_ROLE user (authenticated but no role)', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'NO_ROLE' },
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(mockSchedule);
    });

    it('should display title and date/time', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });
    });

    it('should NOT display detailed information', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.queryByText('Test Location')).not.toBeInTheDocument();
      expect(screen.queryByText('This is a test description')).not.toBeInTheDocument();
    });

    it('should show role request prompt', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText('ロールをリクエストすると詳細を表示できます。')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'ロールをリクエスト' })).toBeInTheDocument();
    });
  });

  describe('VIEWER user', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, username: 'viewer', email: 'viewer@example.com', role: 'VIEWER' },
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(mockSchedule);
    });

    it('should display title and date/time', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });

    it('should display all detailed information', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
      expect(screen.getByText('Test Song')).toBeInTheDocument();
      expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
    });

    it('should show "すべての予定を見る" button', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      const allSchedulesLink = screen.getByRole('link', { name: /すべての予定を見る/ });
      expect(allSchedulesLink).toBeInTheDocument();
      expect(allSchedulesLink).toHaveAttribute('href', '/schedule');
    });

    it('should NOT show login prompt', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.queryByText('詳細を表示するにはログインしてください。')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'ログイン' })).not.toBeInTheDocument();
    });

    it('should display update info', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText(/最終更新/)).toBeInTheDocument();
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });
  });

  describe('EDITOR user', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, username: 'editor', email: 'editor@example.com', role: 'EDITOR' },
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(mockSchedule);
    });

    it('should display all details like VIEWER', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByText('This is a test description')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /すべての予定を見る/ })).toBeInTheDocument();
    });
  });

  describe('ADMIN user', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN' },
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(mockSchedule);
    });

    it('should display all details', async () => {
      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /すべての予定を見る/ })).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display error message when schedule not found', async () => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockRejectedValue(new Error('Schedule not found'));

      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('予定の取得に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('All-day event formatting', () => {
    it('should display date without time for all-day events', async () => {
      const allDaySchedule = {
        ...mockSchedule,
        allDay: true,
        dtstart: '2024-02-15T00:00:00',
        dtend: '2024-02-15T00:00:00',
      };

      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: jest.fn(),
        logout: jest.fn(),
        fetchUser: jest.fn(),
      });
      mockGetByUrlId.mockResolvedValue(allDaySchedule);

      render(<ScheduleDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Summary')).toBeInTheDocument();
      });

      // Should display date in Japanese format
      expect(screen.getByText(/2月15日/)).toBeInTheDocument();
    });
  });
});
