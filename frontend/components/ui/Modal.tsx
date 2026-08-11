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

import React, { useEffect, useId, useRef } from 'react';
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
import { useBreakpoint } from '../../hooks/useBreakpoint';

type ModalSize = 'sm' | 'md' | 'lg';

interface ThemedModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Max width cap: sm 550 · md 650 · lg 800. Width itself is viewport-driven. */
  size?: ModalSize;
  /** Show close × button in top-right */
  showClose?: boolean;
  /** Disable closing by tapping overlay */
  persistent?: boolean;
  /** Footer buttons area */
  footer?: React.ReactNode;
  /** Accessible name for the close button and the overlay dismiss target. */
  closeLabel?: string;
}

/** Max width per size. Below `md` the dialog is near-full-bleed regardless. */
const sizeMap: Record<ModalSize, { maxWidth: number }> = {
  sm: { maxWidth: 550 },
  md: { maxWidth: 650 },
  lg: { maxWidth: 800 },
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  closeLabel = 'Close dialog',
}: ThemedModalProps) {
  const { colors, elevation, fontFamilies } = useTheme();
  const { select } = useBreakpoint();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const containerRef = useRef<any>(null);

  // Callers pass `onClose` as an inline arrow, so its identity changes on every
  // parent render. The focus trap below must not depend on it: re-running the
  // effect tears focus out of whatever the user is typing in, which swallowed
  // every character after the first.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const persistentRef = useRef(persistent);
  persistentRef.current = persistent;
  const titleId = useId();

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

  // Web-only keyboard behaviour: Escape closes, Tab is trapped inside the
  // dialog, and focus is restored to the trigger on close. On native, the RN
  // Modal + accessibilityViewIsModal already isolate the dialog.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;

    const doc = typeof document !== 'undefined' ? document : undefined;
    if (!doc) return;

    const previouslyFocused = doc.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] => {
      const node = containerRef.current as HTMLElement | null;
      if (!node?.querySelectorAll) return [];
      return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === doc.activeElement,
      );
    };

    // Move focus into the dialog once it has mounted.
    const focusTimer = setTimeout(() => {
      const [first] = focusables();
      (first ?? (containerRef.current as HTMLElement | null))?.focus?.();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !persistentRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = doc.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !containerRef.current?.contains?.(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    doc.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      doc.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
    // Deliberately only `visible`: see onCloseRef above.
  }, [visible]);

  const s = sizeMap[size];
  // Narrow viewports get a near-full-bleed sheet; wide ones get a centred
  // dialog capped at the size's maxWidth.
  const widthPct = select({ xs: '95%', sm: '92%', md: '70%', lg: '60%' });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={persistent ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          importantForAccessibility={persistent ? 'no-hide-descendants' : 'yes'}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            ref={containerRef}
            accessibilityViewIsModal
            accessibilityRole={Platform.OS === 'web' ? ('dialog' as any) : undefined}
            accessibilityLabel={title}
            {...({
              'aria-modal': true,
              'aria-labelledby': title ? titleId : undefined,
              tabIndex: -1,
            } as any)}
            style={[
              styles.container,
              elevation('lg'),
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                width: widthPct as any,
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
                    <Text
                      nativeID={titleId}
                      accessibilityRole="header"
                      style={[styles.title, { fontFamily: fontFamilies.bold, color: colors.text }]}
                    >
                      {title}
                    </Text>
                  ) : null}
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {showClose && (
                  <Pressable
                    onPress={onClose}
                    style={styles.closeBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={closeLabel}
                  >
                    <Text
                      style={[styles.closeIcon, { color: colors.textTertiary }]}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      {...({ 'aria-hidden': true } as any)}
                    >
                      ✕
                    </Text>
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
    // Must fill the overlay. Without a height it shrink-wraps the dialog, and
    // the dialog's `maxHeight: 85%` then resolves against its own height —
    // a circular constraint that clipped ~15% of every modal body.
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
    // Shadow supplied by the theme's elevation('lg') token at render time.
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
    // Size to content; the container's maxHeight caps it, and only then does
    // the ScrollView scroll.
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
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
