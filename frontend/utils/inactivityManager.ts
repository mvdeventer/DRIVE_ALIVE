/**
 * Inactivity Manager
 * Tracks user activity and triggers auto-logout after configured idle time
 */
import { Platform } from 'react-native';

class InactivityManager {
  private timeoutId: any = null;
  private lastActivityTime: number = Date.now();
  private timeoutDuration: number = 15 * 60 * 1000; // Default 15 minutes
  private onLogout: (() => void) | null = null;
  private isTracking: boolean = false;

  constructor() {
    if (Platform.OS === 'web') {
      // Setup activity listeners on web
      this.setupActivityListeners();
    }
  }

  private setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, this.resetTimer.bind(this), true);
    });
  }

  /**
   * Start tracking user activity
   * @param onLogout - Callback function to execute on inactivity timeout
   * @param timeoutMinutes - Timeout duration in minutes (optional, uses server config if not provided)
   */
  public startTracking(onLogout: () => void, timeoutMinutes?: number) {
    this.onLogout = onLogout;
    
    if (timeoutMinutes) {
      this.timeoutDuration = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    }
    
    this.isTracking = true;
    this.resetTimer();
    
    console.log(`🕐 Inactivity tracking started - timeout: ${this.timeoutDuration / 60000} minutes`);
  }

  /**
   * Stop tracking user activity
   */
  public stopTracking() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isTracking = false;
    console.log('⏸️ Inactivity tracking stopped');
  }

  /**
   * Update timeout duration
   * @param minutes - New timeout duration in minutes
   */
  public updateTimeout(minutes: number) {
    this.timeoutDuration = minutes * 60 * 1000;
    
    // Reset timer with new duration if currently tracking
    if (this.isTracking) {
      this.resetTimer();
      console.log(`⏱️ Inactivity timeout updated to ${minutes} minutes`);
    }
  }

  private resetTimer() {
    this.lastActivityTime = Date.now();
    
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Set new timeout
    this.timeoutId = setTimeout(() => {
      console.log('⏱️ Inactivity timeout reached - logging out user');
      if (this.onLogout) {
        this.onLogout();
      }
    }, this.timeoutDuration);
  }

  /**
   * Get idle time in milliseconds
   */
  public getIdleTime(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Check if user is currently idle
   */
  public isIdle(): boolean {
    return this.getIdleTime() > this.timeoutDuration;
  }

  /**
   * Get remaining time before timeout in minutes
   */
  public getRemainingMinutes(): number {
    const remaining = this.timeoutDuration - this.getIdleTime();
    return Math.max(0, Math.floor(remaining / 60000));
  }
}

export default new InactivityManager();
