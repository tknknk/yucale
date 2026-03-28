import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HomePage from './page';
import { useAuthContext } from '@/contexts/AuthContext';
import { schedulesApi } from '@/lib/schedules';
import * as useSchedulesSWR from '@/hooks/useSchedulesSWR';
import * as useNoticesSWR from '@/hooks/useNoticesSWR';

// Mock the modules
jest.mock('@/contexts/AuthContext');
jest.mock('@/lib/schedules', () => ({
  schedulesApi: {
    getUpcoming: jest.fn(),
    getRecent: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock('@/hooks/useSchedulesSWR');
jest.mock('@/hooks/useNoticesSWR');

const mockUseRecentSchedules = jest.spyOn(useSchedulesSWR, 'useRecentSchedules');
const mockUseLatestNotices = jest.spyOn(useNoticesSWR, 'useLatestNotices');

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockSchedulesApi = schedulesApi as jest.Mocked<typeof schedulesApi>;

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthContext.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
      refreshUser: jest.fn(),
    });

    // Mock SWR hooks
    mockUseRecentSchedules.mockReturnValue({
      past: [],
      future: [],
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });

    mockUseLatestNotices.mockReturnValue({
      notices: [],
      isLoading: false,
      error: undefined,
      mutate: jest.fn(),
    });
  });

  describe('rendering for unauthenticated users', () => {
    it('should render welcome message for unauthenticated users', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('ゆカレへようこそ')).toBeInTheDocument();
      });
    });

    it('should render login prompt for unauthenticated users', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('すべての予定を表示するにはログインしてください。')).toBeInTheDocument();
      });
    });

    it('should show Recent Schedules section for unauthenticated users', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });
    });
  });

  describe('rendering for authenticated users with valid role', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'VIEWER',
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

    it('should render recent schedules section', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });
    });

    it('should display empty message when no schedules', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/予定がありません/)).toBeInTheDocument();
      });
    });

    it('should render NoticeBoard section for VIEWER role', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('お知らせ')).toBeInTheDocument();
      });
    });

    it('should use SWR hooks for fetching notices', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(mockUseLatestNotices).toHaveBeenCalled();
      });
    });
  });

  describe('NoticeBoard visibility', () => {
    it('should display NoticeBoard for EDITOR role', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'editor',
          email: 'editor@example.com',
          role: 'EDITOR',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('お知らせ')).toBeInTheDocument();
      });
    });

    it('should display NoticeBoard for ADMIN role', async () => {
      mockUseAuthContext.mockReturnValue({
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
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('お知らせ')).toBeInTheDocument();
      });
    });

    it('should NOT display NoticeBoard for unauthenticated users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('ゆカレへようこそ')).toBeInTheDocument();
      });

      expect(screen.queryByText('お知らせ')).not.toBeInTheDocument();
    });

    it('should NOT display NoticeBoard for NO_ROLE users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'norole',
          email: 'norole@example.com',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('ゆカレへようこそ')).toBeInTheDocument();
      });

      expect(screen.queryByText('お知らせ')).not.toBeInTheDocument();
    });

    it('should display notices when available for VIEWER+ users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'VIEWER',
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

      mockUseLatestNotices.mockReturnValue({
        notices: [
          {
            id: 1,
            title: 'Important Notice',
            content: 'This is an important notice',
            createdByUserId: 1,
            createdByUsername: 'admin',
            createdAt: '2024-02-15T10:00:00',
            updatedAt: '2024-02-15T10:00:00',
          },
        ],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Important Notice')).toBeInTheDocument();
      });
    });

    it('should show create notice button for EDITOR role', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'editor',
          email: 'editor@example.com',
          role: 'EDITOR',
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

      render(<HomePage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /お知らせを作成/ });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('should NOT show create notice button for VIEWER role', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'VIEWER',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('お知らせ')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /お知らせを作成/ })).not.toBeInTheDocument();
    });
  });

  describe('recent schedules', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'VIEWER',
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

    it('should use SWR hooks for fetching recent schedules', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(mockUseRecentSchedules).toHaveBeenCalledWith(1, 2);
      });
    });

    it('should display recent schedules when available', async () => {
      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [
          {
            id: 1,
            title: 'Recent Event',
            summary: 'Recent Summary',
            description: '',
            startTime: '2024-02-20T10:00:00',
            endTime: '2024-02-20T11:00:00',
            dtstart: '2024-02-20T10:00:00',
            dtend: '2024-02-20T11:00:00',
            allDay: false,
            userId: 1,
            createdAt: '2024-02-01',
            updatedAt: '2024-02-01',
          },
        ],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Recent Summary')).toBeInTheDocument();
      });
    });

    it('should display no schedules message when empty', async () => {
      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('予定がありません')).toBeInTheDocument();
      });
    });

    it('should display "see all schedules" button when schedules exist', async () => {
      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [
          {
            id: 1,
            title: 'Recent Event',
            summary: 'Recent Summary',
            description: '',
            startTime: '2024-02-20T10:00:00',
            endTime: '2024-02-20T11:00:00',
            dtstart: '2024-02-20T10:00:00',
            dtend: '2024-02-20T11:00:00',
            allDay: false,
            userId: 1,
            createdAt: '2024-02-01',
            updatedAt: '2024-02-01',
          },
        ],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /すべての予定を見る/ });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/schedule');
      });
    });

    it('should not display "see all schedules" button when no schedules', async () => {
      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('予定がありません')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /すべての予定を見る/ })).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated user', () => {
    it('should show login prompt and recent schedules', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('ゆカレへようこそ')).toBeInTheDocument();
        expect(screen.getByText('すべての予定を表示するにはログインしてください。')).toBeInTheDocument();
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });
    });
  });

  describe('NO_ROLE user', () => {
    it('should show role request prompt and recent schedules', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'newuser',
          email: 'newuser@example.com',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('ゆカレへようこそ')).toBeInTheDocument();
        expect(screen.getByText(/すべての予定を表示するにはロールをリクエストしてください/)).toBeInTheDocument();
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });
    });
  });

  describe('subscribe button', () => {
    it('should display subscribe button for authenticated users with valid role', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'viewer',
          email: 'viewer@example.com',
          role: 'VIEWER',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /カレンダーを購読/ })).toBeInTheDocument();
      });
    });

    it('should NOT display subscribe button for unauthenticated users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /カレンダーを購読/ })).not.toBeInTheDocument();
    });

    it('should NOT display subscribe button for NO_ROLE users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'norole',
          email: 'norole@example.com',
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

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('直近の予定')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /カレンダーを購読/ })).not.toBeInTheDocument();
    });
  });

  describe('see all schedules button visibility', () => {
    it('should NOT display "see all schedules" button for unauthenticated users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        checkAuth: jest.fn(),
        refreshUser: jest.fn(),
      });

      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [
          {
            id: 1,
            title: 'Event',
            summary: 'Summary',
            description: '',
            startTime: '2024-02-20T10:00:00',
            endTime: '2024-02-20T11:00:00',
            dtstart: '2024-02-20T10:00:00',
            dtend: '2024-02-20T11:00:00',
            allDay: false,
            userId: 1,
            createdAt: '2024-02-01',
            updatedAt: '2024-02-01',
          },
        ],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /すべての予定を見る/ })).not.toBeInTheDocument();
    });

    it('should NOT display "see all schedules" button for NO_ROLE users', async () => {
      mockUseAuthContext.mockReturnValue({
        user: {
          id: 1,
          username: 'norole',
          email: 'norole@example.com',
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

      mockUseRecentSchedules.mockReturnValue({
        past: [],
        future: [
          {
            id: 1,
            title: 'Event',
            summary: 'Summary',
            description: '',
            startTime: '2024-02-20T10:00:00',
            endTime: '2024-02-20T11:00:00',
            dtstart: '2024-02-20T10:00:00',
            dtend: '2024-02-20T11:00:00',
            allDay: false,
            userId: 1,
            createdAt: '2024-02-01',
            updatedAt: '2024-02-01',
          },
        ],
        isLoading: false,
        error: undefined,
        mutate: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Summary')).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /すべての予定を見る/ })).not.toBeInTheDocument();
    });
  });
});
