import api from './api';
import {
  schedulesApi,
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getUpcomingSchedules,
} from './schedules';
import { Schedule, CreateScheduleRequest, UpdateScheduleRequest } from '@/types/schedule';
import { ApiResponse } from '@/types/api';

// Mock the api module
jest.mock('./api');

const mockApi = api as jest.Mocked<typeof api>;

describe('schedulesApi', () => {
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

  const mockBackendPaginatedResponse = {
    content: [mockSchedule],
    currentPage: 0,
    totalItems: 1,
    totalPages: 1,
    size: 10,
    hasNext: false,
    hasPrevious: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all schedules without filters', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      const result = await schedulesApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules?');
      expect(result.data).toEqual([mockSchedule]);
      expect(result.total).toBe(1);
    });

    it('should pass filters to API', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await schedulesApi.getAll({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        userId: 5,
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-01-01')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2024-01-31')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('userId=5')
      );
    });

    it('should convert pagination from 1-based to 0-based', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await schedulesApi.getAll(undefined, { page: 2, limit: 20 });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('size=20')
      );
    });

    it('should map backend response to frontend format', async () => {
      const backendResponse = {
        content: [mockSchedule, { ...mockSchedule, id: 2 }],
        currentPage: 1,
        totalItems: 25,
        totalPages: 3,
        size: 10,
        hasNext: true,
        hasPrevious: true,
      };

      mockApi.get.mockResolvedValue({
        data: { success: true, data: backendResponse },
      });

      const result = await schedulesApi.getAll();

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2); // currentPage 1 + 1 = 2 (1-based)
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  describe('getPublic', () => {
    it('should fetch public schedules', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      const result = await schedulesApi.getPublic();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules?');
      expect(result.data).toEqual([mockSchedule]);
    });

    it('should pass date filters', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await schedulesApi.getPublic({
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-02-01')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2024-02-28')
      );
    });

    it('should handle pagination parameters', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await schedulesApi.getPublic(undefined, { page: 3, limit: 15 });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('size=15')
      );
    });
  });

  describe('getById', () => {
    it('should fetch single schedule by id', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockSchedule },
      });

      const result = await schedulesApi.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/1');
      expect(result).toEqual(mockSchedule);
    });

    it('should handle different ids', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, id: 42 } },
      });

      const result = await schedulesApi.getById(42);

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/42');
      expect(result.id).toBe(42);
    });
  });

  describe('getMySchedules', () => {
    it('should fetch user schedules', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      const result = await schedulesApi.getMySchedules();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules?');
      expect(result.data).toEqual([mockSchedule]);
    });

    it('should pass filters and pagination', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await schedulesApi.getMySchedules(
        { startDate: '2024-03-01' },
        { page: 1, limit: 5 }
      );

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2024-03-01')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=0')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('size=5')
      );
    });
  });

  describe('create', () => {
    it('should create new schedule', async () => {
      const createRequest: CreateScheduleRequest = {
        title: 'New Schedule',
        summary: 'New Summary',
        startTime: '2024-01-02T10:00:00',
        endTime: '2024-01-02T11:00:00',
      };

      mockApi.post.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, ...createRequest } },
      });

      const result = await schedulesApi.create(createRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/schedules', createRequest);
      expect(result.title).toBe('New Schedule');
    });

    it('should include optional fields', async () => {
      const createRequest: CreateScheduleRequest = {
        title: 'Full Schedule',
        summary: 'Full Summary',
        description: 'Detailed description',
        startTime: '2024-01-02T10:00:00',
        endTime: '2024-01-02T11:00:00',
        location: 'Conference Room',
        allDay: true,
      };

      mockApi.post.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, ...createRequest } },
      });

      await schedulesApi.create(createRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/schedules', createRequest);
    });
  });

  describe('update', () => {
    it('should update schedule', async () => {
      const updateRequest: UpdateScheduleRequest = {
        title: 'Updated Title',
      };

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, title: 'Updated Title' } },
      });

      const result = await schedulesApi.update(1, updateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/schedules/1', updateRequest);
      expect(result.title).toBe('Updated Title');
    });

    it('should update multiple fields', async () => {
      const updateRequest: UpdateScheduleRequest = {
        title: 'New Title',
        summary: 'New Summary',
        location: 'New Location',
      };

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, ...updateRequest } },
      });

      const result = await schedulesApi.update(5, updateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/schedules/5', updateRequest);
      expect(result.location).toBe('New Location');
    });
  });

  describe('delete', () => {
    it('should delete schedule', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await schedulesApi.delete(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/schedules/1');
    });

    it('should handle different ids', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await schedulesApi.delete(99);

      expect(mockApi.delete).toHaveBeenCalledWith('/schedules/99');
    });
  });

  describe('getUpcoming', () => {
    it('should fetch upcoming schedules with default limit', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [mockSchedule] },
      });

      const result = await schedulesApi.getUpcoming();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/upcoming?limit=5');
      expect(result).toEqual([mockSchedule]);
    });

    it('should fetch upcoming schedules with custom limit', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [mockSchedule] },
      });

      const result = await schedulesApi.getUpcoming(10);

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/upcoming?limit=10');
      expect(result).toEqual([mockSchedule]);
    });
  });

  describe('getRecent', () => {
    it('should fetch and categorize schedules by past and future', async () => {
      const now = new Date();
      const pastSchedule = {
        ...mockSchedule,
        id: 1,
        dtstart: new Date(now.getTime() - 86400000).toISOString(),
      };
      const futureSchedule = {
        ...mockSchedule,
        id: 2,
        dtstart: new Date(now.getTime() + 86400000).toISOString(),
      };

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            content: [pastSchedule, futureSchedule],
            currentPage: 0,
            totalItems: 2,
            totalPages: 1,
            size: 50,
            hasNext: false,
            hasPrevious: false,
          },
        },
      });

      const result = await schedulesApi.getRecent();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules?page=0&size=50');
      expect(result.past).toBeDefined();
      expect(result.future).toBeDefined();
    });

    it('should use custom past and future counts', async () => {
      const now = new Date();
      const schedules = [
        { ...mockSchedule, id: 1, dtstart: new Date(now.getTime() - 300000).toISOString() },
        { ...mockSchedule, id: 2, dtstart: new Date(now.getTime() - 200000).toISOString() },
        { ...mockSchedule, id: 3, dtstart: new Date(now.getTime() - 100000).toISOString() },
        { ...mockSchedule, id: 4, dtstart: new Date(now.getTime() + 100000).toISOString() },
        { ...mockSchedule, id: 5, dtstart: new Date(now.getTime() + 200000).toISOString() },
        { ...mockSchedule, id: 6, dtstart: new Date(now.getTime() + 300000).toISOString() },
      ];

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            content: schedules,
            currentPage: 0,
            totalItems: 6,
            totalPages: 1,
            size: 50,
            hasNext: false,
            hasPrevious: false,
          },
        },
      });

      const result = await schedulesApi.getRecent(2, 3);

      expect(result.past.length).toBeLessThanOrEqual(2);
      expect(result.future.length).toBeLessThanOrEqual(3);
    });

    it('should sort schedules by start time', async () => {
      const now = new Date();
      const schedules = [
        { ...mockSchedule, id: 3, dtstart: new Date(now.getTime() + 300000).toISOString(), dtend: new Date(now.getTime() + 400000).toISOString() },
        { ...mockSchedule, id: 1, dtstart: new Date(now.getTime() + 100000).toISOString(), dtend: new Date(now.getTime() + 200000).toISOString() },
        { ...mockSchedule, id: 2, dtstart: new Date(now.getTime() + 200000).toISOString(), dtend: new Date(now.getTime() + 300000).toISOString() },
      ];

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: {
            content: schedules,
            currentPage: 0,
            totalItems: 3,
            totalPages: 1,
            size: 50,
            hasNext: false,
            hasPrevious: false,
          },
        },
      });

      const result = await schedulesApi.getRecent(0, 3);

      expect(result.future[0].id).toBe(1);
      expect(result.future[1].id).toBe(2);
      expect(result.future[2].id).toBe(3);
    });
  });
});

describe('Helper Functions', () => {
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
    userId: 1,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-01-01T00:00:00',
  };

  const mockBackendResponse = {
    content: [mockSchedule],
    currentPage: 0,
    totalItems: 1,
    totalPages: 1,
    size: 10,
    hasNext: false,
    hasPrevious: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSchedules', () => {
    it('should call schedulesApi.getPublic with defaults', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendResponse },
      });

      const result = await getSchedules();

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=0')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('size=10')
      );
      expect(result.data).toEqual([mockSchedule]);
    });

    it('should pass custom page and size', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendResponse },
      });

      await getSchedules(3, 25);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('size=25')
      );
    });
  });

  describe('getSchedule', () => {
    it('should call schedulesApi.getById', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockSchedule },
      });

      const result = await getSchedule(1);

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/1');
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('createSchedule helper', () => {
    it('should call schedulesApi.create', async () => {
      const createRequest: CreateScheduleRequest = {
        title: 'New',
        summary: 'Summary',
        startTime: '2024-01-01T10:00:00',
        endTime: '2024-01-01T11:00:00',
      };

      mockApi.post.mockResolvedValue({
        data: { success: true, data: mockSchedule },
      });

      const result = await createSchedule(createRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/schedules', createRequest);
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('updateSchedule helper', () => {
    it('should call schedulesApi.update', async () => {
      const updateRequest: UpdateScheduleRequest = { title: 'Updated' };

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { ...mockSchedule, title: 'Updated' } },
      });

      const result = await updateSchedule(1, updateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/schedules/1', updateRequest);
      expect(result.title).toBe('Updated');
    });
  });

  describe('deleteSchedule helper', () => {
    it('should call schedulesApi.delete', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await deleteSchedule(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/schedules/1');
    });
  });

  describe('getUpcomingSchedules', () => {
    it('should call schedulesApi.getUpcoming with default limit', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [mockSchedule] },
      });

      const result = await getUpcomingSchedules();

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/upcoming?limit=5');
      expect(result).toEqual([mockSchedule]);
    });

    it('should call schedulesApi.getUpcoming with custom limit', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [mockSchedule] },
      });

      await getUpcomingSchedules(15);

      expect(mockApi.get).toHaveBeenCalledWith('/schedules/upcoming?limit=15');
    });
  });
});
