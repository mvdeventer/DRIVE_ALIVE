/**
 * Message Configuration Utility
 * Provides centralized message display duration management
 */
import messageConfig from '../config/messageConfig.json';

interface MessageConfig {
  globalOverride: {
    enabled: boolean;
    defaultDuration: number;
  };
  screens: {
    [screenName: string]: {
      [actionName: string]: {
        success?: number;
        error?: number;
      };
    };
  };
}

const config: MessageConfig = messageConfig as MessageConfig;

/**
 * Get the duration for displaying an inline message
 * @param screenName - Name of the screen (e.g., 'UserManagementScreen')
 * @param actionName - Name of the action (e.g., 'statusChange')
 * @param messageType - Type of message: 'success' or 'error'
 * @returns Duration in milliseconds
 */
export const getMessageDuration = (
  screenName: string,
  actionName: string = 'general',
  messageType: 'success' | 'error' = 'success'
): number => {
  // If global override is enabled, return default duration
  if (config.globalOverride.enabled) {
    return config.globalOverride.defaultDuration;
  }

  // Try to get screen-specific duration
  const screenConfig = config.screens[screenName];
  if (screenConfig) {
    const actionConfig = screenConfig[actionName];
    if (actionConfig && actionConfig[messageType] !== undefined) {
      return actionConfig[messageType];
    }
  }

  // Fallback to global default
  return config.globalOverride.defaultDuration;
};

/**
 * Auto-clear a message after the configured duration
 * @param setMessage - State setter function for the message
 * @param screenName - Name of the screen
 * @param actionName - Name of the action
 * @param messageType - Type of message: 'success' or 'error'
 * @returns Timeout ID that can be used to cancel the auto-clear
 */
export const autoClearMessage = (
  setMessage: (msg: string) => void,
  screenName: string,
  actionName: string = 'general',
  messageType: 'success' | 'error' = 'success'
): NodeJS.Timeout => {
  const duration = getMessageDuration(screenName, actionName, messageType);
  return setTimeout(() => setMessage(''), duration);
};

/**
 * Show a message with auto-clear
 * @param setMessage - State setter function for the message
 * @param message - Message text to display
 * @param screenName - Name of the screen
 * @param actionName - Name of the action
 * @param messageType - Type of message: 'success' or 'error'
 */
export const showMessage = (
  setMessage: (msg: string) => void,
  message: string,
  screenName: string,
  actionName: string = 'general',
  messageType: 'success' | 'error' = 'success'
): void => {
  setMessage(message);
  autoClearMessage(setMessage, screenName, actionName, messageType);
};

export default {
  getMessageDuration,
  autoClearMessage,
  showMessage,
};
