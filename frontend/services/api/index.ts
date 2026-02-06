/**
 * API Service for backend communication
 */
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_CONFIG } from '../../config';

// Storage wrapper to handle web vs native
// Web: Uses HTTP-only cookies plus in-memory fallback for dev
// Native: Uses SecureStore (Authorization header fallback)
let webAccessToken: string | null = null;
let webUserRole: string | null = null;
const storage = {
  async getItem(key: string): Promise<string | null> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      if (key === 'access_token') {
        return webAccessToken;
      }
      if (key === 'user_role') {
        return webUserRole;
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      if (key === 'access_token') {
        webAccessToken = value;
        return;
      }
      if (key === 'user_role') {
        webUserRole = value;
        return;
      }
      return;
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      if (key === 'access_token') {
        webAccessToken = null;
        return;
      }
      if (key === 'user_role') {
        webUserRole = null;
        return;
      }
      return;
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

class ApiService {
  private api: AxiosInstance;

  constructor() {
    // Debug: Log the API URL being used
    const isWeb = Platform?.OS === 'web';
    console.log('API Service initialized with BASE_URL:', API_CONFIG.BASE_URL);
    console.log('Platform:', Platform?.OS || 'undefined');
    console.log(
      'Current hostname:',
      isWeb && typeof window !== 'undefined' ? window.location.hostname : 'Native'
    );

    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
      // Enable credentials for cookie support (HTTP-only cookies)
      // Web: Allows browser to send/receive cookies automatically
      // Native: Authorization header used as fallback
      withCredentials: true,
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async config => {
        const token = await storage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          // Token expired, logout user
          await storage.removeItem('access_token');
          // You might want to navigate to login screen here
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic API methods
  async get(url: string, config?: any) {
    return await this.api.get(url, config);
  }

  async post(url: string, data?: any, config?: any) {
    return await this.api.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any) {
    return await this.api.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: any) {
    return await this.api.patch(url, data, config);
  }

  async delete(url: string, config?: any) {
    return await this.api.delete(url, config);
  }

  async setAuthToken(token: string) {
    await storage.setItem('access_token', token);
  }

  // Auth methods
  async login(email: string, password: string) {
    // Use URLSearchParams for proper x-www-form-urlencoded format
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    // Debug: Log the login request details
    console.log('Login attempt:');
    console.log('- URL:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`);
    console.log('- Username:', email);

    const response = await this.api.post(API_CONFIG.ENDPOINTS.LOGIN, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.access_token) {
      await storage.setItem('access_token', response.data.access_token);

      // Get user info to store role
      const user = await this.getCurrentUser();
      if (user.role) {
        await storage.setItem('user_role', user.role);
      }
    }

    return response.data;
  }

  async registerStudent(data: any) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.REGISTER_STUDENT, data);

    if (response.data.access_token) {
      await storage.setItem('access_token', response.data.access_token);
    }

    return response.data;
  }

  async registerInstructor(data: any) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.REGISTER_INSTRUCTOR, data);

    if (response.data.access_token) {
      await storage.setItem('access_token', response.data.access_token);
    }

    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.ME);
    return response.data;
  }

  async logout() {
    // Call backend logout endpoint to clear HTTP-only cookie
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout endpoint failed, clearing local tokens anyway:', error);
    }
    
    // Clear mobile tokens (web cookies are cleared by server)
    await storage.removeItem('access_token');
    await storage.removeItem('user_role');
  }

  // Instructor methods
  async getInstructors(params?: {
    latitude?: number;
    longitude?: number;
    max_distance_km?: number;
    min_rating?: number;
    available_only?: boolean;
  }) {
    const response = await this.api.get(API_CONFIG.ENDPOINTS.INSTRUCTORS, { params });
    return response.data;
  }

  async updateInstructorLocation(latitude: number, longitude: number) {
    const response = await this.api.put(API_CONFIG.ENDPOINTS.INSTRUCTOR_LOCATION, {
      latitude,
      longitude,
    });
    return response.data;
  }

  // Booking methods
  async createBooking(data: any) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.BOOKINGS, data);
    return response.data;
  }

  async getBookings(status?: string) {
    const params = status ? { status } : {};
    const response = await this.api.get(API_CONFIG.ENDPOINTS.BOOKINGS, { params });
    return response.data;
  }

  async cancelBooking(bookingId: number, reason: string) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.BOOKING_CANCEL(bookingId), {
      cancellation_reason: reason,
    });
    return response.data;
  }

  async confirmBooking(bookingId: number) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.BOOKING_CONFIRM(bookingId));
    return response.data;
  }

  // Payment methods
  async initiatePayment(data: { instructor_id: number; bookings: any[]; payment_gateway: string }) {
    const response = await this.api.post('/payments/initiate', data);
    return response.data;
  }

  async getPaymentSession(paymentSessionId: string) {
    const response = await this.api.get(`/payments/session/${paymentSessionId}`);
    return response.data;
  }

  async createStripePaymentIntent(bookingId: number) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.STRIPE_PAYMENT_INTENT, {
      booking_id: bookingId,
    });
    return response.data;
  }

  async createPayFastPayment(bookingId: number) {
    const response = await this.api.post(API_CONFIG.ENDPOINTS.PAYFAST_PAYMENT, {
      booking_id: bookingId,
    });
    return response.data;
  }

  // Admin methods
  async getAdminStats() {
    const response = await this.api.get('/admin/stats');
    return response.data;
  }

  async getPendingInstructors(skip = 0, limit = 50) {
    const response = await this.api.get('/admin/instructors/pending-verification', {
      params: { skip, limit },
    });
    return response.data;
  }

  async verifyInstructor(instructorId: number, isVerified: boolean, deactivateAccount = false) {
    const response = await this.api.post(`/admin/instructors/${instructorId}/verify`, {
      is_verified: isVerified,
      deactivate_account: deactivateAccount,
    });
    return response.data;
  }

  async getAllUsers(role?: string, status?: string, skip = 0, limit = 50) {
    const params: any = { skip, limit };
    if (role) params.role = role;
    if (status) params.status = status;
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async updateUserStatus(userId: number, newStatus: string) {
    const response = await this.api.put(`/admin/users/${userId}/status`, null, {
      params: { new_status: newStatus },
    });
    return response.data;
  }

  async updateInstructorBookingFee(instructorId: number, bookingFee: number) {
    const response = await this.api.put(`/admin/instructors/${instructorId}/booking-fee`, null, {
      params: { booking_fee: bookingFee },
    });
    return response.data;
  }

  async getAllBookingsAdmin(statusFilter?: string, skip = 0, limit = 50) {
    const params: any = { skip, limit };
    if (statusFilter) params.status_filter = statusFilter;
    const response = await this.api.get('/admin/bookings', { params });
    return response.data;
  }

  async cancelBookingAdmin(bookingId: number) {
    const response = await this.api.delete(`/admin/bookings/${bookingId}`);
    return response.data;
  }

  async getRevenueStats(instructorId?: number) {
    const params: any = {};
    if (instructorId) params.instructor_id = instructorId;
    const response = await this.api.get('/admin/revenue/stats', { params });
    return response.data;
  }

  async getInstructorRevenue(instructorId: number) {
    const response = await this.api.get(`/admin/revenue/by-instructor/${instructorId}`);
    return response.data;
  }

  async createAdmin(data: {
    email: string;
    phone: string;
    password: string;
    first_name: string;
    last_name: string;
  }) {
    const response = await this.api.post('/admin/create', data);
    return response.data;
  }

  async getUserDetails(userId: number) {
    const response = await this.api.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserDetails(
    userId: number,
    data: { first_name?: string; last_name?: string; phone?: string }
  ) {
    const response = await this.api.put(`/admin/users/${userId}`, null, { params: data });
    return response.data;
  }

  async resetUserPassword(userId: number, newPassword: string) {
    const response = await this.api.post(`/admin/users/${userId}/reset-password`, null, {
      params: { new_password: newPassword },
    });
    return response.data;
  }

  async getInstructorSchedule(instructorId: number) {
    const response = await this.api.get(`/admin/instructors/${instructorId}/schedule`);
    return response.data;
  }

  async getInstructorTimeOff(instructorId: number) {
    const response = await this.api.get(`/admin/instructors/${instructorId}/time-off`);
    return response.data;
  }

  // Database Backup/Restore Methods
  async backupDatabase() {
    const response = await this.api.get('/admin/database/backup', {
      responseType: 'blob',
    });
    return response;
  }

  async listBackups() {
    const response = await this.api.get('/admin/database/backups/list');
    return response.data;
  }

  async downloadBackupFromServer(filename: string) {
    const response = await this.api.get(`/admin/database/backups/download/${filename}`, {
      responseType: 'blob',
    });
    return response;
  }

  async getAllBackups() {
    const response = await this.api.get('/admin/database/backups/all');
    return response.data;
  }

  async getBackupConfig() {
    const response = await this.api.get('/admin/database/backups/config');
    return response.data;
  }

  async updateBackupConfig(config: any) {
    const response = await this.api.put('/admin/database/backups/config', config);
    return response.data;
  }

  async extractFromArchive(archiveName: string, backupFilename: string) {
    const response = await this.api.get(
      `/admin/database/backups/extract/${archiveName}/${backupFilename}`
    );
    return response.data;
  }

  async resetDatabase() {
    const response = await this.api.post('/admin/database/reset');
    return response.data;
  }

  async restoreDatabase(file: File | Blob) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post('/admin/database/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Admin Settings Methods
  async getAdminSettings() {
    const response = await this.api.get('/admin/settings');
    return response.data;
  }

  async updateAdminSettings(data: any) {
    const response = await this.api.put('/admin/settings', data);
    return response.data;
  }

  async createAdmin(data: any) {
    const response = await this.api.post('/admin/create', data);
    return response.data;
  }

  async deleteAdmin(adminId: number) {
    const response = await this.api.delete(`/admin/admins/${adminId}`);
    return response.data;
  }

  async deleteInstructor(userId: number) {
    const response = await this.api.delete(`/admin/instructors/${userId}`);
    return response.data;
  }

  async getInstructorBookingSummary(userId: number) {
    const response = await this.api.get(`/admin/instructors/${userId}/booking-summary`);
    return response.data;
  }

  async deleteStudent(userId: number) {
    const response = await this.api.delete(`/admin/students/${userId}`);
    return response.data;
  }

  async getStudentBookingSummary(userId: number) {
    const response = await this.api.get(`/admin/students/${userId}/booking-summary`);
    return response.data;
  }

  async deleteUser(userId: number) {
    const response = await this.api.delete(`/admin/users/${userId}`);
    return response.data;
  }

  // Mock Payment Methods
  async completeMockPayment(sessionId: string, success: boolean = true) {
    const response = await this.api.post('/payments/mock-complete', {
      payment_session_id: sessionId,
      success,
    });
    return response.data;
  }
}

export default new ApiService();
