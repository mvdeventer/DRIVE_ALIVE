/**
 * Unit tests for the Database Interface API service.
 *
 * These functions are thin wrappers over `services/api` — they build the URL,
 * the query string and the conditional-request headers, and hand back
 * `response.data`. So `./api` is the mock boundary: mocking `axios` instead
 * would exercise the shared client's interceptors, which belong to that
 * module's own tests, and would break at import time because `axios.create()`
 * is called while `services/api/index.ts` is still being evaluated.
 */

import apiService from '../api';
import {
  getDatabaseUsers,
  getDatabaseInstructors,
  getDatabaseStudents,
  getDatabaseBookings,
  getUserDetail,
  updateUser,
  deleteUser,
  bulkUpdateRecords,
  handleApiError,
} from '../database-interface';

jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

/** Every endpoint returns the envelope under `response.data`. */
const list = (data: any[] = [], total = data.length) => ({
  data: { data, meta: { total, page: 1, page_size: 20, total_pages: 1 } },
});

describe('Database Interface API service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list endpoints', () => {
    it('sends page and page_size, and unwraps the envelope', async () => {
      const users = [
        { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
      ];
      mockedApi.get.mockResolvedValueOnce(list(users, 2) as any);

      const result = await getDatabaseUsers(1, 20);

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/admin/database-interface/users?page=1&page_size=20',
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('appends search only when one is given', async () => {
      mockedApi.get.mockResolvedValue(list() as any);

      await getDatabaseUsers(1, 20, 'john');
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('search=john'),
      );

      await getDatabaseUsers(1, 20);
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        expect.not.stringContaining('search='),
      );
    });

    it('appends the role and status filters', async () => {
      mockedApi.get.mockResolvedValueOnce(list() as any);

      await getDatabaseUsers(2, 50, undefined, 'instructor', 'active');

      const url = mockedApi.get.mock.calls[0][0];
      expect(url).toContain('page=2');
      expect(url).toContain('page_size=50');
      expect(url).toContain('filter_role=instructor');
      expect(url).toContain('filter_status=active');
    });

    it('each table hits its own path', async () => {
      mockedApi.get.mockResolvedValue(list() as any);

      await getDatabaseInstructors();
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('/admin/database-interface/instructors'),
      );

      await getDatabaseStudents();
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('/admin/database-interface/students'),
      );

      await getDatabaseBookings();
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        expect.stringContaining('/admin/database-interface/bookings'),
      );
    });
  });

  describe('getUserDetail', () => {
    it('fetches one record by id', async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { data: { id: 7 }, meta: { etag: 'W/"abc"', last_modified: 'now' } },
      } as any);

      const result = await getUserDetail(7);

      expect(mockedApi.get).toHaveBeenCalledWith('/admin/database-interface/users/7');
      expect(result.meta.etag).toBe('W/"abc"');
    });

    it('propagates a rejection rather than swallowing it', async () => {
      mockedApi.get.mockRejectedValueOnce({ response: { status: 404 } });

      await expect(getUserDetail(999)).rejects.toMatchObject({
        response: { status: 404 },
      });
    });
  });

  describe('updateUser', () => {
    it('sends If-Match when an ETag is supplied', async () => {
      mockedApi.put.mockResolvedValueOnce({
        data: { data: { id: 1 }, meta: { message: 'ok' } },
      } as any);

      await updateUser(1, { first_name: 'Updated' }, 'W/"v1"');

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/admin/database-interface/users/1',
        { first_name: 'Updated' },
        { headers: { 'Content-Type': 'application/json', 'If-Match': 'W/"v1"' } },
      );
    });

    it('omits If-Match when no ETag is supplied', async () => {
      mockedApi.put.mockResolvedValueOnce({ data: { data: {}, meta: {} } } as any);

      await updateUser(1, { first_name: 'Updated' });

      const [, , config] = mockedApi.put.mock.calls[0];
      expect((config as any).headers).not.toHaveProperty('If-Match');
    });

    it('propagates a 409 conflict', async () => {
      mockedApi.put.mockRejectedValueOnce({ response: { status: 409 } });

      await expect(updateUser(1, {}, 'W/"stale"')).rejects.toMatchObject({
        response: { status: 409 },
      });
    });
  });

  describe('deleteUser', () => {
    it('sends If-Match and the role_type query when given', async () => {
      mockedApi.delete.mockResolvedValueOnce({
        data: { data: {}, meta: { message: 'deleted' } },
      } as any);

      await deleteUser(5, 'W/"v2"', 'student_profile');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/admin/database-interface/users/5?role_type=student_profile',
        { headers: { 'If-Match': 'W/"v2"' } },
      );
    });

    it('leaves the URL bare when no role_type is given', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { data: {}, meta: {} } } as any);

      await deleteUser(5);

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/admin/database-interface/users/5',
        { headers: {} },
      );
    });
  });

  describe('bulkUpdateRecords', () => {
    it('posts the request body unchanged', async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { updated_count: 3, failed_ids: [], message: 'Updated 3 records' },
      } as any);

      const request = {
        table: 'users' as const,
        ids: [1, 2, 3],
        field: 'status',
        value: 'active',
      };
      const result = await bulkUpdateRecords(request);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/admin/database-interface/bulk-update',
        request,
      );
      expect(result.updated_count).toBe(3);
    });

    it('propagates the server-side cap on batch size', async () => {
      mockedApi.post.mockRejectedValueOnce({
        response: { status: 422, data: { detail: 'Maximum 100 records per request' } },
      });

      await expect(
        bulkUpdateRecords({
          table: 'users',
          ids: Array.from({ length: 101 }, (_, i) => i + 1),
          field: 'status',
          value: 'active',
        }),
      ).rejects.toMatchObject({ response: { status: 422 } });
    });
  });

  describe('handleApiError', () => {
    it('names the connection when there is no response', () => {
      expect(handleApiError({} as any)).toMatch(/network error/i);
    });

    it('prefers RFC 7807 title and detail', () => {
      const message = handleApiError({
        response: { status: 400, data: { title: 'Bad Request', detail: 'id is required' } },
      } as any);

      expect(message).toBe('Bad Request: id is required');
    });

    it('maps the statuses the screen can actually provoke', () => {
      const at = (status: number, data: any = {}) =>
        handleApiError({ response: { status, data }, message: 'x' } as any);

      expect(at(401)).toMatch(/log in again/i);
      expect(at(403)).toMatch(/permission/i);
      expect(at(404)).toMatch(/not found/i);
      expect(at(409)).toMatch(/modified by another user/i);
      expect(at(429)).toMatch(/too many requests/i);
      expect(at(503)).toMatch(/unavailable/i);
    });

    it('falls back to the server detail where one is given', () => {
      expect(handleApiError({
        response: { status: 500, data: { detail: 'Disk full' } },
      } as any)).toBe('Disk full');
    });
  });
});
