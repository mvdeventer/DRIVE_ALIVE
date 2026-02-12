/**
 * Reusable inline message component for success/error/info/warning messages
 * Replaces Alert.alert() popups with inline messages
 */
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface InlineMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const iconMap: Record<InlineMessageProps['type'], keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

export default function InlineMessage({
  type,
  message,
  onDismiss,
  autoDismissMs = 0,
}: InlineMessageProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  const colorMap = {
    success: { bg: colors.successBg, text: colors.success, border: colors.success },
    error: { bg: colors.dangerBg, text: colors.danger, border: colors.danger },
    warning: { bg: colors.warningBg, text: colors.warning, border: colors.warning },
    info: { bg: colors.infoBg, text: colors.info, border: colors.info },
  } as const;

  const c = colorMap[type];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        backgroundColor: c.bg,
        borderColor: c.border + '40',
      }}
    >
      <Ionicons name={iconMap[type]} size={20} color={c.text} style={{ marginRight: 10 }} />
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontFamily: 'Inter_500Medium',
          color: c.text,
        }}
      >
        {message}
      </Text>
    </View>
  );
}
