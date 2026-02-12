/**
 * Database Interface API Service
 * Handles all HTTP requests to /admin/database-interface endpoints
 * Uses apiService for authenticated requests
 */

import { AxiosError } from 'axios';
import apiService from './api';

interface ListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  links: {
    self: string;
    first: string;
    last: string;
    prev?: string;
    next?: string;
  };
}

interface DetailResponse<T> {
  data: T;
  meta: {
    etag: string;
    last_modified: string;
  };
}

interface UpdateResponse<T> {
  data: T;
  meta: {
    etag?: string;
    message: string;
  };
}

// ============================================================================
// USERS API
// ============================================================================

export const getDatabaseUsers = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  filterRole?: string,
  filterStatus?: string,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (search) params.append('search', search);
  if (filterRole) params.append('filter_role', filterRole);
  if (filterStatus) params.append('filter_status', filterStatus);
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/users?${params.toString()}`
  );
  return response.data;
};

export const getUserDetail = async (userId: number): Promise<DetailResponse<any>> => {
  const response = await apiService.get(
    `/admin/database-interface/users/${userId}`
  );
  return response.data;
};

export const updateUser = async (
  userId: number,
  data: Record<string, any>,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.put(
    `/admin/database-interface/users/${userId}`,
    data,
    { headers }
  );
  return response.data;
};

export const deleteUser = async (
  userId: number,
  etag?: string,
  roleType?: string  // 'student_profile', 'instructor_profile', or 'primary' (suspends user)
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  // Build URL with role_type query parameter if provided
  let url = `/admin/database-interface/users/${userId}`;
  if (roleType) {
    url += `?role_type=${roleType}`;
  }

  const response = await apiService.delete(url, { headers });
  return response.data;
};

// ============================================================================
// INSTRUCTORS API
// ============================================================================

export const getDatabaseInstructors = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  filterVerified?: boolean,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (search) params.append('search', search);
  if (filterVerified !== undefined) params.append('filter_verified', filterVerified.toString());
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/instructors?${params.toString()}`
  );
  return response.data;
};

export const getInstructorDetail = async (instructorId: number): Promise<DetailResponse<any>> => {
  const response = await apiService.get(
    `/admin/database-interface/instructors/${instructorId}`
  );
  return response.data;
};

export const updateInstructor = async (
  instructorId: number,
  data: Record<string, any>,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.put(
    `/admin/database-interface/instructors/${instructorId}`,
    data,
    { headers }
  );
  return response.data;
};

export const deleteInstructor = async (
  instructorId: number,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.delete(
    `/admin/database-interface/instructors/${instructorId}`,
    { headers }
  );
  return response.data;
};

// ============================================================================
// STUDENTS API
// ============================================================================

export const getDatabaseStudents = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (search) params.append('search', search);
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/students?${params.toString()}`
  );
  return response.data;
};

export const getStudentDetail = async (studentId: number): Promise<DetailResponse<any>> => {
  const response = await apiService.get(
    `/admin/database-interface/students/${studentId}`
  );
  return response.data;
};

export const updateStudent = async (
  studentId: number,
  data: Record<string, any>,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.put(
    `/admin/database-interface/students/${studentId}`,
    data,
    { headers }
  );
  return response.data;
};

export const deleteStudent = async (
  studentId: number,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.delete(
    `/admin/database-interface/students/${studentId}`,
    { headers }
  );
  return response.data;
};

// ============================================================================
// BOOKINGS API
// ============================================================================

export const getDatabaseBookings = async (
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  filterStatus?: string,
  filterPaymentStatus?: string,
  startDate?: string,
  endDate?: string,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (search) params.append('search', search);
  if (filterStatus) params.append('filter_status', filterStatus);
  if (filterPaymentStatus) params.append('filter_payment_status', filterPaymentStatus);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/bookings?${params.toString()}`
  );
  return response.data;
};

export const getBookingDetail = async (bookingId: number): Promise<DetailResponse<any>> => {
  const response = await apiService.get(
    `/admin/database-interface/bookings/${bookingId}`
  );
  return response.data;
};

export const updateBooking = async (
  bookingId: number,
  data: Record<string, any>,
  etag?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.put(
    `/admin/database-interface/bookings/${bookingId}`,
    data,
    { headers }
  );
  return response.data;
};

export const deleteBooking = async (
  bookingId: number,
  etag?: string,
  reason?: string
): Promise<UpdateResponse<any>> => {
  const headers: Record<string, string> = {};

  if (etag) {
    headers['If-Match'] = etag;
  }

  const response = await apiService.delete(
    `/admin/database-interface/bookings/${bookingId}`,
    {
      headers,
      data: reason ? { reason } : undefined,
    }
  );
  return response.data;
};

// ============================================================================
// REVIEWS API
// ============================================================================

export const getDatabaseReviews = async (
  page: number = 1,
  pageSize: number = 20,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/reviews?${params.toString()}`
  );
  return response.data;
};

// ============================================================================
// SCHEDULES API
// ============================================================================

export const getDatabaseSchedules = async (
  page: number = 1,
  pageSize: number = 20,
  filterInstructorId?: number,
  sort?: string
): Promise<ListResponse<any>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('page_size', pageSize.toString());
  if (filterInstructorId) params.append('filter_instructor_id', filterInstructorId.toString());
  if (sort) params.append('sort', sort);

  const response = await apiService.get(
    `/admin/database-interface/schedules?${params.toString()}`
  );
  return response.data;
};

// ============================================================================
// BULK OPERATIONS API (PHASE 4.2)
// ============================================================================

export interface BulkUpdateRequest {
  table: 'users' | 'instructors' | 'students' | 'bookings';
  ids: number[];
  field: string;
  value: any;
}

export interface BulkUpdateResponse {
  updated_count: number;
  failed_ids: number[];
  message: string;
}

export const bulkUpdateRecords = async (
  request: BulkUpdateRequest
): Promise<BulkUpdateResponse> => {
  const response = await apiService.post(
    `/admin/database-interface/bulk-update`,
    request
  );
  return response.data;
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

export const handleApiError = (error: AxiosError): string => {
  if (!error.response) {
    return 'Network error. Please check your connection.';
  }

  const status = error.response.status;
  const data = error.response.data as Record<string, any>;

  // RFC 7807 Problem Details
  if (data?.title && data?.detail) {
    return `${data.title}: ${data.detail}`;
  }

  // Fallback messages
  switch (status) {
    case 400:
      return data?.detail || 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication failed. Please log in again.';
    case 403:
      return 'You do not have permission to access this resource.';
    case 404:
      return data?.detail || 'Record not found.';
    case 409:
      return data?.detail || 'This record was modified by another user. Please refresh and try again.';
    case 422:
      return data?.detail || 'Validation error. Please check your input.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return data?.detail || 'Server error. Please try again later.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return `Error ${status}: ${data?.detail || error.message}`;
  }
};

// ============================================================================
// SERVICE OBJECT EXPORT (for component usage)
// ============================================================================

export const databaseInterfaceService = {
  // Users
  getDatabaseUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  
  // Instructors
  getDatabaseInstructors,
  getInstructorDetail,
  updateInstructor,
  deleteInstructor,
  
  // Students
  getDatabaseStudents,
  getStudentDetail,
  updateStudent,
  deleteStudent,
  
  // Bookings
  getDatabaseBookings,
  getBookingDetail,
  updateBooking,
  deleteBooking,
  
  // Reviews (read-only)
  getDatabaseReviews,
  
  // Schedules (read-only)
  getDatabaseSchedules,
  
  // Bulk operations
  bulkUpdateRecords,
};
