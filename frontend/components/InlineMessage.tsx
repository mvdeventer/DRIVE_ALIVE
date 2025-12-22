/**
 * Reusable inline message component for success/error/info/warning messages
 * Replaces Alert.alert() popups with inline messages
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface InlineMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export default function InlineMessage({
  type,
  message,
  onDismiss,
  autoDismissMs = 0,
}: InlineMessageProps) {
  useEffect(() => {
    if (autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: styles.successBox,
          text: styles.successText,
        };
      case 'error':
        return {
          container: styles.errorBox,
          text: styles.errorText,
        };
      case 'warning':
        return {
          container: styles.warningBox,
          text: styles.warningText,
        };
      case 'info':
        return {
          container: styles.infoBox,
          text: styles.infoText,
        };
    }
  };

  const messageStyles = getStyles();

  return (
    <View style={[styles.messageBox, messageStyles.container]}>
      <Text style={[styles.messageText, messageStyles.text]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  successText: {
    color: '#155724',
  },
  errorBox: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  errorText: {
    color: '#721c24',
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
  },
  warningText: {
    color: '#856404',
  },
  infoBox: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
  },
  infoText: {
    color: '#0c5460',
  },
});
