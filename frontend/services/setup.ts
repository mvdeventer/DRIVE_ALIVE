/**
 * System initialization service
 * Checks if the system is set up (admin exists)
 */

import { API_BASE_URL } from '../config';

export interface SetupStatus {
  initialized: boolean;
  requires_setup: boolean;
  message: string;
}

class SetupService {
  /**
   * Check if system is initialized (admin exists)
   */
  static async checkSetupStatus(): Promise<SetupStatus> {
    try {
      const url = `${API_BASE_URL}/setup/status`;
      console.log('Fetching setup status from:', url);
      const response = await fetch(url);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      
      const text = await response.text();
      console.log('Raw response text:', text.substring(0, 200));
      const data = JSON.parse(text);
      console.log('Setup status response:', data);
      return data;
    } catch (error) {
      console.error('Failed to check setup status:', error);
      console.error('Error details:', error);
      // On error, default to showing setup screen (safer default)
      // This ensures setup page appears if backend is unreachable
      return {
        initialized: false,
        requires_setup: true,
        message: 'Unable to verify setup status - defaulting to setup',
      };
    }
  }

  /**
   * Get the appropriate screen based on setup status
   */
  static async getInitialScreen(): Promise<'Setup' | 'Login'> {
    const status = await SetupService.checkSetupStatus();
    return status.requires_setup ? 'Setup' : 'Login';
  }
}

export default SetupService;
