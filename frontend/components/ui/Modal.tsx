/**
 * RoadReady Modal Component
 *
 * Themed modal with dark overlay, slide-up animation, and consistent styling.
 * Replaces the ad-hoc modals scattered across screens.
 *
 * Usage:
 *   <ThemedModal visible={show} onClose={() => setShow(false)} title="Confirm Action">
 *     <Text>Are you sure?</Text>
 *     <Button label="Confirm" onPress={handleConfirm} />
 *   </ThemedModal>
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type ModalSize = 'sm' | 'md' | 'lg';

interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** sm = 45%/92%, md = 50%/92%, lg = 60%/95% (web/mobile) */
  size?: ModalSize;
  /** Show close × button in top-right */
  showClose?: boolean;
  /** Disable closing by tapping overlay */
  persistent?: boolean;
  /** Footer buttons area */
  footer?: React.ReactNode;
}

const sizeMap: Record<ModalSize, { web: string; mobile: string; maxWidth: number }> = {
  sm: { web: '45%', mobile: '92%', maxWidth: 550 },
  md: { web: '50%', mobile: '92%', maxWidth: 650 },
  lg: { web: '60%', mobile: '95%', maxWidth: 800 },
};

export default function ThemedModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = 'sm',
  showClose = true,
  persistent = false,
  footer,
}: ThemedModalProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible]);

  const s = sizeMap[size];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={persistent ? undefined : onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: Platform.OS === 'web' ? (s.web as any) : (s.mobile as any),
                maxWidth: s.maxWidth,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Header */}
            {(title || showClose) && (
              <View style={styles.header}>
                <View style={styles.headerText}>
                  {title ? (
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                  ) : null}
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {showClose && (
                  <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Text style={[styles.closeIcon, { color: colors.textTertiary }]}>✕</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Body */}
            <ScrollView
              style={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {/* Footer */}
            {footer && (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                {footer}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  keyboardAvoid: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 28 : 20,
    paddingTop: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 22 : 19,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginTop: 4,
    lineHeight: 20,
  },
  closeBtn: {
    padding: 10,
    marginTop: -6,
    marginRight: -6,
  },
  closeIcon: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
  },
  body: {
    paddingHorizontal: Platform.OS === 'web' ? 28 : 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: Platform.OS === 'web' ? 28 : 20,
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
});
