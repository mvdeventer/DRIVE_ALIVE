/**
 * Jest Unit Tests for Database Interface API Service
 * Tests all API methods for CRUD operations
 */

import axios from 'axios';
import {
  getDatabaseUsers,
  getDatabaseInstructors,
  getDatabaseStudents,
  getDatabaseBookings,
  getUserDetail,
  updateUser,
  deleteUser,
  bulkUpdateRecords,
} from '../database-interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AsyncStorage (React Native storage)
const mockStorage = {
  getItem: jest.fn(() => Promise.resolve('mock-token')),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
};

jest.mock('@react-native-async-storage/async-storage', () => mockStorage);

describe('Database Interface API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDatabaseUsers', () => {
    it('should fetch users with pagination', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', role: 'STUDENT' },
            { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', role: 'INSTRUCTOR' },
          ],
          meta: { total: 2, page: 1, page_size: 20, total_pages: 1 },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getDatabaseUsers({ page: 1, page_size: 20 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/database-interface/users'),
        expect.objectContaining({
          params: { page: 1, page_size: 20 },
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should handle search parameter', async () => {
      const mockResponse = {
        data: { data: [], meta: { total: 0, page: 1, page_size: 20, total_pages: 0 } },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getDatabaseUsers({ page: 1, page_size: 20, search: 'john' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ search: 'john' }),
        })
      );
    });

    it('should handle role filter', async () => {
      const mockResponse = {
        data: { data: [], meta: { total: 0, page: 1, page_size: 20, total_pages: 0 } },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getDatabaseUsers({ page: 1, page_size: 20, role: 'INSTRUCTOR' });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({ role: 'INSTRUCTOR' }),
        })
      );
    });
  });

  describe('getUserDetail', () => {
    it('should fetch user detail with ETag', async () => {
      const mockResponse = {
        data: { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        headers: { etag: '"abc123"' },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getUserDetail(1);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/database-interface/users/1'),
        expect.any(Object)
      );
      expect(result.data.id).toBe(1);
      expect(result.etag).toBe('"abc123"');
    });

    it('should handle 404 error', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { detail: 'User not found' } },
      });

      await expect(getUserDetail(999)).rejects.toThrow();
    });
  });

  describe('updateUser', () => {
    it('should update user with ETag header', async () => {
      const updateData = { first_name: 'John', last_name: 'Updated' };
      const mockResponse = {
        data: { id: 1, ...updateData, email: 'john@example.com' },
      };

      mockedAxios.put.mockResolvedValueOnce(mockResponse);

      const result = await updateUser(1, updateData, '"etag-value"');

      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/admin/database-interface/users/1'),
        updateData,
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-Match': '"etag-value"',
          }),
        })
      );
      expect(result.first_name).toBe('John');
    });

    it('should handle 409 conflict error', async () => {
      mockedAxios.put.mockRejectedValueOnce({
        response: { status: 409, data: { detail: 'Resource modified by another user' } },
      });

      await expect(
        updateUser(1, { first_name: 'Test' }, '"old-etag"')
      ).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user with ETag', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ status: 204 });

      await deleteUser(1, '"etag"');

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/admin/database-interface/users/1'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-Match': '"etag"',
          }),
        })
      );
    });
  });

  describe('bulkUpdateRecords', () => {
    it('should bulk update users status', async () => {
      const mockResponse = {
        data: {
          updated_count: 5,
          failed_ids: [],
          message: 'Successfully updated 5 record(s)',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await bulkUpdateRecords({
        table: 'users',
        ids: [1, 2, 3, 4, 5],
        field: 'status',
        value: 'ACTIVE',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/database-interface/bulk-update'),
        { table: 'users', ids: [1, 2, 3, 4, 5], field: 'status', value: 'ACTIVE' },
        expect.any(Object)
      );
      expect(result.updated_count).toBe(5);
    });

    it('should handle validation error for >100 records', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { detail: 'Cannot update more than 100 records at once' },
        },
      });

      const largeIds = Array.from({ length: 150 }, (_, i) => i + 1);

      await expect(
        bulkUpdateRecords({ table: 'users', ids: largeIds, field: 'status', value: 'ACTIVE' })
      ).rejects.toMatchObject({
        response: { status: 400 },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getDatabaseUsers({ page: 1, page_size: 20 })).rejects.toThrow('Network Error');
    });

    it('should handle 401 unauthorized', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'Unauthorized' } },
      });

      await expect(getDatabaseUsers({ page: 1, page_size: 20 })).rejects.toMatchObject({
        response: { status: 401 },
      });
    });

    it('should handle 403 forbidden', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 403, data: { detail: 'Forbidden' } },
      });

      await expect(getDatabaseUsers({ page: 1, page_size: 20 })).rejects.toMatchObject({
        response: { status: 403 },
      });
    });
  });
});
