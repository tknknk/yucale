import { renderHook, act, waitFor } from '@testing-library/react';
import { useSchedules } from './useSchedules';
import { schedulesApi } from '@/lib/schedules';
import { Schedule } from '@/types/schedule';
import { PaginatedResponse } from '@/types/api';

// Mock the schedules API
jest.mock('@/lib/schedules');

const mockSchedulesApi = schedulesApi as jest.Mocked<typeof schedulesApi>;

// Default split response for initial fetch
const mockSplitResponse = {
  pastSchedules: [],
  futureSchedules: [],
  totalPast: 0,
  totalFuture: 0,
  hasMorePast: false,
  hiddenPastCount: 0,
};

describe('useSchedules', () => {
  const mockSchedule: Schedule = {
    id: 1,
    title: 'Test Schedule',
    summary: 'Test Summary',
    description: 'Test Description',
    startTime: '2024-01-01T10:00:00',
    endTime: '2024-01-01T11:00:00',
    dtstart: '2024-01-01T10:00:00',
    dtend: '2024-01-01T11:00:00',
    allDay: false,
    location: 'Test Location',
    userId: 1,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-01-01T00:00:00',
  };

  const mockPaginatedResponse: PaginatedResponse<Schedule> = {
    data: [mockSchedule],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockEmptyResponse: PaginatedResponse<Schedule> = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSchedulesApi.getPublic.mockResolvedValue(mockPaginatedResponse);
    mockSchedulesApi.getAll.mockResolvedValue(mockPaginatedResponse);
    mockSchedulesApi.getMySchedules.mockResolvedValue(mockPaginatedResponse);
    mockSchedulesApi.getSplit.mockResolvedValue(mockSplitResponse);
  });

  describe('Initial State', () => {
    it('should have initial loading state', () => {
      const { result } = renderHook(() => useSchedules());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.schedules).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should have default pagination values', () => {
      const { result } = renderHook(() => useSchedules());

      expect(result.current.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should have hasMore as false initially', () => {
      const { result } = renderHook(() => useSchedules());

      expect(result.current.hasMore).toBe(false);
    });

    it('should use initial pagination params if provided', () => {
      const { result } = renderHook(() =>
        useSchedules(undefined, { page: 2, limit: 20 })
      );

      expect(result.current.pagination.page).toBe(2);
      expect(result.current.pagination.limit).toBe(20);
    });
  });

  describe('Initial fetch with getSplit', () => {
    it('should fetch split schedules on mount', async () => {
      mockSchedulesApi.getSplit.mockResolvedValue({
        pastSchedules: [],
        futureSchedules: [mockSchedule],
        totalPast: 0,
        totalFuture: 1,
        hasMorePast: false,
        hiddenPastCount: 0,
      });

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSchedulesApi.getSplit).toHaveBeenCalled();
      expect(result.current.schedules).toEqual([mockSchedule]);
    });

    it('should handle errors gracefully', async () => {
      mockSchedulesApi.getSplit.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.schedules).toEqual([]);
    });

    it('should handle non-Error rejection', async () => {
      mockSchedulesApi.getSplit.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch schedules');
    });
  });

  describe('fetchPublicSchedules', () => {
    it('should fetch public schedules when called explicitly', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchPublicSchedules();
      });

      expect(mockSchedulesApi.getPublic).toHaveBeenCalled();
    });

    it('should update pagination after fetch', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchPublicSchedules();
      });

      expect(result.current.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should pass filters to API', async () => {
      const filters = { startDate: '2024-01-01', endDate: '2024-01-31' };
      const { result } = renderHook(() => useSchedules(filters));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchPublicSchedules(filters);
      });

      expect(mockSchedulesApi.getPublic).toHaveBeenCalledWith(
        filters,
        undefined
      );
    });
  });

  describe('fetchSchedules', () => {
    it('should fetch all schedules', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchSchedules();
      });

      expect(mockSchedulesApi.getAll).toHaveBeenCalled();
    });

    it('should handle errors in fetchSchedules', async () => {
      mockSchedulesApi.getAll.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchSchedules();
      });

      expect(result.current.error).toBe('Fetch failed');
    });
  });

  describe('fetchMySchedules', () => {
    it('should fetch my schedules', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchMySchedules();
      });

      expect(mockSchedulesApi.getMySchedules).toHaveBeenCalled();
    });

    it('should handle errors in fetchMySchedules', async () => {
      mockSchedulesApi.getMySchedules.mockRejectedValue(
        new Error('Auth required')
      );

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchMySchedules();
      });

      expect(result.current.error).toBe('Auth required');
    });
  });

  describe('createSchedule', () => {
    it('should create schedule and refetch', async () => {
      const newSchedule = { ...mockSchedule, id: 2 };
      mockSchedulesApi.create.mockResolvedValue(newSchedule);

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let createdSchedule: Schedule | undefined;
      await act(async () => {
        createdSchedule = await result.current.createSchedule({
          title: 'New Schedule',
          summary: 'New Summary',
          startTime: '2024-01-02T10:00:00',
          endTime: '2024-01-02T11:00:00',
        });
      });

      expect(createdSchedule).toEqual(newSchedule);
      expect(mockSchedulesApi.create).toHaveBeenCalled();
      // Refetch is called after create (using getSplit since that's the initial fetch type)
      expect(mockSchedulesApi.getSplit).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule and refetch', async () => {
      const updatedSchedule = { ...mockSchedule, title: 'Updated Title' };
      mockSchedulesApi.update.mockResolvedValue(updatedSchedule);

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let returnedSchedule: Schedule | undefined;
      await act(async () => {
        returnedSchedule = await result.current.updateSchedule(1, {
          title: 'Updated Title',
        });
      });

      expect(returnedSchedule).toEqual(updatedSchedule);
      expect(mockSchedulesApi.update).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
      });
    });
  });

  describe('deleteSchedule', () => {
    it('should delete schedule and refetch', async () => {
      mockSchedulesApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSchedule(1);
      });

      expect(mockSchedulesApi.delete).toHaveBeenCalledWith(1);
      // Refetch is called after delete (using getSplit since that's the initial fetch type)
      expect(mockSchedulesApi.getSplit).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pagination', () => {
    it('should calculate hasMore correctly when using fetchPublicSchedules', async () => {
      const multiPageResponse: PaginatedResponse<Schedule> = {
        data: [mockSchedule],
        total: 30,
        page: 1,
        limit: 10,
        totalPages: 3,
      };
      mockSchedulesApi.getPublic.mockResolvedValue(multiPageResponse);

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to public fetch type
      await act(async () => {
        await result.current.fetchPublicSchedules();
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should return false for hasMore on last page', async () => {
      const lastPageResponse: PaginatedResponse<Schedule> = {
        data: [mockSchedule],
        total: 30,
        page: 3,
        limit: 10,
        totalPages: 3,
      };
      mockSchedulesApi.getPublic.mockResolvedValue(lastPageResponse);

      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Switch to public fetch type
      await act(async () => {
        await result.current.fetchPublicSchedules(undefined, { page: 3, limit: 10 });
      });

      expect(result.current.hasMore).toBe(false);
    });

    describe('loadMore', () => {
      it('should load more schedules and append when using public fetch', async () => {
        const firstPageResponse: PaginatedResponse<Schedule> = {
          data: [mockSchedule],
          total: 20,
          page: 1,
          limit: 10,
          totalPages: 2,
        };
        const secondSchedule = { ...mockSchedule, id: 2 };
        const secondPageResponse: PaginatedResponse<Schedule> = {
          data: [secondSchedule],
          total: 20,
          page: 2,
          limit: 10,
          totalPages: 2,
        };

        mockSchedulesApi.getPublic
          .mockResolvedValueOnce(firstPageResponse)
          .mockResolvedValueOnce(secondPageResponse);

        const { result } = renderHook(() => useSchedules());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Switch to public fetch type first
        await act(async () => {
          await result.current.fetchPublicSchedules();
        });

        expect(result.current.schedules).toHaveLength(1);

        await act(async () => {
          await result.current.loadMore();
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.schedules).toHaveLength(2);
        expect(result.current.schedules[1]).toEqual(secondSchedule);
      });

      it('should not load more when hasMore is false', async () => {
        mockSchedulesApi.getPublic.mockResolvedValue(mockPaginatedResponse);

        const { result } = renderHook(() => useSchedules());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Switch to public fetch type
        await act(async () => {
          await result.current.fetchPublicSchedules();
        });

        const callCount = mockSchedulesApi.getPublic.mock.calls.length;

        await act(async () => {
          await result.current.loadMore();
        });

        // Should not call API again (no more pages)
        expect(mockSchedulesApi.getPublic.mock.calls.length).toBe(callCount);
      });

      it('should not load more in split mode', async () => {
        const { result } = renderHook(() => useSchedules());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        const splitCallCount = mockSchedulesApi.getSplit.mock.calls.length;

        await act(async () => {
          await result.current.loadMore();
        });

        // Should not call API again in split mode
        expect(mockSchedulesApi.getSplit.mock.calls.length).toBe(splitCallCount);
      });
    });

    describe('setPage', () => {
      it('should change page and refetch when using public fetch', async () => {
        const { result } = renderHook(() => useSchedules());

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Switch to public fetch type first
        await act(async () => {
          await result.current.fetchPublicSchedules();
        });

        await act(async () => {
          result.current.setPage(2);
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(mockSchedulesApi.getPublic).toHaveBeenLastCalledWith(
          undefined,
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('refetch', () => {
    it('should refetch using current fetchType (split by default)', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSchedulesApi.getSplit.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockSchedulesApi.getSplit.mock.calls.length).toBe(
        initialCallCount + 1
      );
    });

    it('should refetch using fetchType all after fetchSchedules', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchSchedules();
      });

      const allCallCount = mockSchedulesApi.getAll.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockSchedulesApi.getAll.mock.calls.length).toBe(allCallCount + 1);
    });

    it('should refetch using fetchType my after fetchMySchedules', async () => {
      const { result } = renderHook(() => useSchedules());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchMySchedules();
      });

      const myCallCount = mockSchedulesApi.getMySchedules.mock.calls.length;

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockSchedulesApi.getMySchedules.mock.calls.length).toBe(
        myCallCount + 1
      );
    });
  });
});
