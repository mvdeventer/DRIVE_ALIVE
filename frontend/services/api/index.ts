/**
 * API Service for backend communication
 */
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_CONFIG } from '../../config';

// Storage wrapper to handle web vs native
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
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
    const response = await this.api.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any) {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any) {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any) {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  async setAuthToken(token: string) {
    await storage.setItem('access_token', token);
  }

  // Auth methods
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await this.api.post(API_CONFIG.ENDPOINTS.LOGIN, formData, {
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
}

export default new ApiService();
