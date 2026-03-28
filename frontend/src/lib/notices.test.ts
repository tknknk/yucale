import api from './api';
import { noticesApi } from './notices';
import { Notice, CreateNoticeRequest, UpdateNoticeRequest } from '@/types/notice';

// Mock the api module
jest.mock('./api');

const mockApi = api as jest.Mocked<typeof api>;

describe('noticesApi', () => {
  const mockNotice: Notice = {
    id: 1,
    title: 'Test Notice',
    content: 'Test notice content',
    createdByUserId: 1,
    createdByUsername: 'testuser',
    createdAt: '2024-01-01T10:00:00',
    updatedAt: '2024-01-01T10:00:00',
  };

  const mockBackendPaginatedResponse = {
    content: [mockNotice],
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

  describe('getLatest', () => {
    it('should fetch latest 3 notices', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [mockNotice] },
      });

      const result = await noticesApi.getLatest();

      expect(mockApi.get).toHaveBeenCalledWith('/notices/latest');
      expect(result).toEqual([mockNotice]);
    });

    it('should return empty array when no notices', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const result = await noticesApi.getLatest();

      expect(result).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should fetch all notices with default pagination', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      const result = await noticesApi.getAll();

      expect(mockApi.get).toHaveBeenCalledWith('/notices?page=0&size=10');
      expect(result.data).toEqual([mockNotice]);
      expect(result.total).toBe(1);
    });

    it('should convert pagination from 1-based to 0-based', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockBackendPaginatedResponse },
      });

      await noticesApi.getAll(2, 20);

      expect(mockApi.get).toHaveBeenCalledWith('/notices?page=1&size=20');
    });

    it('should map backend response to frontend format', async () => {
      const backendResponse = {
        content: [mockNotice, { ...mockNotice, id: 2 }],
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

      const result = await noticesApi.getAll();

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(2); // currentPage 1 + 1 = 2 (1-based)
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  describe('getById', () => {
    it('should fetch single notice by id', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: mockNotice },
      });

      const result = await noticesApi.getById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/notices/1');
      expect(result).toEqual(mockNotice);
    });

    it('should handle different ids', async () => {
      mockApi.get.mockResolvedValue({
        data: { success: true, data: { ...mockNotice, id: 42 } },
      });

      const result = await noticesApi.getById(42);

      expect(mockApi.get).toHaveBeenCalledWith('/notices/42');
      expect(result.id).toBe(42);
    });
  });

  describe('create', () => {
    it('should create new notice', async () => {
      const createRequest: CreateNoticeRequest = {
        title: 'New Notice',
        content: 'New notice content',
      };

      mockApi.post.mockResolvedValue({
        data: { success: true, data: { ...mockNotice, ...createRequest } },
      });

      const result = await noticesApi.create(createRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/notices', createRequest);
      expect(result.title).toBe('New Notice');
    });
  });

  describe('update', () => {
    it('should update notice', async () => {
      const updateRequest: UpdateNoticeRequest = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { ...mockNotice, ...updateRequest } },
      });

      const result = await noticesApi.update(1, updateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/notices/1', updateRequest);
      expect(result.title).toBe('Updated Title');
    });

    it('should update with different id', async () => {
      const updateRequest: UpdateNoticeRequest = {
        title: 'New Title',
        content: 'New content',
      };

      mockApi.put.mockResolvedValue({
        data: { success: true, data: { ...mockNotice, id: 5, ...updateRequest } },
      });

      const result = await noticesApi.update(5, updateRequest);

      expect(mockApi.put).toHaveBeenCalledWith('/notices/5', updateRequest);
      expect(result.id).toBe(5);
    });
  });

  describe('delete', () => {
    it('should delete notice', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await noticesApi.delete(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/notices/1');
    });

    it('should handle different ids', async () => {
      mockApi.delete.mockResolvedValue({ data: { success: true } });

      await noticesApi.delete(99);

      expect(mockApi.delete).toHaveBeenCalledWith('/notices/99');
    });
  });
});
