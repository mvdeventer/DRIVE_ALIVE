/**
 * Console Monitor
 * Captures and logs all console messages for debugging
 */

import { API_BASE_URL } from '../config';

interface ConsoleLog {
  timestamp: string;
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  stack?: string;
}

class ConsoleMonitor {
  private logs: ConsoleLog[] = [];
  private maxLogs = 1000;
  private apiBaseUrl = API_BASE_URL;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Override console methods
    console.log = (...args: any[]) => {
      this.capture('log', args);
      this.originalConsole.log(...args);
    };

    console.warn = (...args: any[]) => {
      this.capture('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      this.capture('error', args);
      this.originalConsole.error(...args);
    };

    console.info = (...args: any[]) => {
      this.capture('info', args);
      this.originalConsole.info(...args);
    };

    console.debug = (...args: any[]) => {
      this.capture('debug', args);
      this.originalConsole.debug(...args);
    };

    // Capture unhandled errors
    window.addEventListener('error', event => {
      this.capture('error', [event.message], event.error?.stack);
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      this.capture('error', [`Unhandled Promise Rejection: ${event.reason}`]);
    });
  }

  private capture(type: ConsoleLog['type'], args: any[], stack?: string) {
    const message = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
      .join(' ');

    const log: ConsoleLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      stack,
    };

    this.logs.push(log);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Send to backend if needed (optional)
    if (type === 'error') {
      this.sendToBackend(log);
    }
  }

  private async sendToBackend(log: ConsoleLog) {
    // Optional: Send errors to backend for logging
    try {
      await fetch(`${this.apiBaseUrl}/api/client-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      }).catch(() => {
        // Silently fail if backend is not available
      });
    } catch {
      // Ignore
    }
  }

  public getLogs(): ConsoleLog[] {
    return [...this.logs];
  }

  public getErrorLogs(): ConsoleLog[] {
    return this.logs.filter(log => log.type === 'error');
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public downloadLogs(): void {
    const dataStr = JSON.stringify(this.logs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataUri);
    downloadAnchorNode.setAttribute('download', `console-logs-${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  public printSummary(): void {
    const summary = {
      total: this.logs.length,
      errors: this.logs.filter(l => l.type === 'error').length,
      warnings: this.logs.filter(l => l.type === 'warn').length,
      logs: this.logs.filter(l => l.type === 'log').length,
      info: this.logs.filter(l => l.type === 'info').length,
      debug: this.logs.filter(l => l.type === 'debug').length,
    };
    this.originalConsole.log('📊 Console Summary:', summary);
  }
}

// Create singleton instance
const consoleMonitor = new ConsoleMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).consoleMonitor = consoleMonitor;
}

export default consoleMonitor;
