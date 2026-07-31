/**
 * RoadReady UI Input Component
 *
 * Themed text input with label, error state, and focus ring.
 *
 * Usage:
 *   <Input label="Email" value={email} onChangeText={setEmail} />
 *   <Input label="Password" secureTextEntry error="Required" />
 *   <Input label="Bio" multiline numberOfLines={3} />
 */

import React, { useId, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: any;
}

export default function Input({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { colors, radii, fontFamilies } = useTheme();
  const { select } = useBreakpoint();
  const [isFocused, setIsFocused] = useState(false);
  const reactId = useId();

  const describedById = `${reactId}-desc`;
  const description = error ?? hint;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Ternaries, not `&&`, throughout: label/error/hint are optional strings,
          and `'' && …` renders the empty string as a text node, which
          react-native-web rejects as a child of a <View>. */}
      {label ? (
        <Text
          nativeID={`${reactId}-label`}
          style={[
            styles.label,
            {
              fontFamily: fontFamilies.semibold,
              color: error ? colors.danger : colors.textSecondary,
              fontSize: select({ xs: 13, md: 14 }),
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        {...props}
        // Screen readers announce the visible label; if a caller passes its
        // own accessibilityLabel that wins.
        accessibilityLabel={props.accessibilityLabel ?? label}
        accessibilityHint={props.accessibilityHint ?? hint}
        accessibilityState={{ disabled: props.editable === false }}
        // react-native-web maps these onto the underlying <input>
        {...({
          'aria-invalid': error ? true : undefined,
          'aria-errormessage': error ? describedById : undefined,
          'aria-describedby': description ? describedById : undefined,
        } as any)}
        autoComplete={props.autoComplete ?? (props.secureTextEntry ? 'new-password' : 'off')}
        autoCorrect={props.autoCorrect ?? false}
        spellCheck={false}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          styles.input,
          {
            borderRadius: radii.md,
            backgroundColor: colors.inputBackground,
            borderColor: error
              ? colors.danger
              : isFocused
                ? colors.borderFocus
                : colors.inputBorder,
            borderWidth: isFocused ? 2 : 1,
            color: colors.inputText,
            fontSize: select({ xs: 15, md: 16 }),
            paddingVertical: select({ xs: 12, md: 14 }),
            paddingHorizontal: select({ xs: 12, md: 14 }),
            // Keyboard users need a visible focus indicator that doesn't rely
            // on the 1px→2px border swap alone.
            ...(Platform.OS === 'web' && isFocused
              ? { outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2, outlineColor: colors.borderFocus }
              : null),
          } as any,
          props.multiline && {
            minHeight: select({ xs: 80, md: 100 }),
            textAlignVertical: 'top',
          },
          style,
        ]}
      />
      {error ? (
        <Text
          nativeID={describedById}
          accessibilityLiveRegion="polite"
          {...({ role: 'alert' } as any)}
          style={[
            styles.error,
            { fontFamily: fontFamilies.medium, color: colors.danger, fontSize: select({ xs: 11, md: 12 }) },
          ]}
        >
          {error}
        </Text>
      ) : null}
      {hint && !error ? (
        <Text
          nativeID={describedById}
          style={[styles.hint, { color: colors.textTertiary, fontSize: select({ xs: 11, md: 12 }) }]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  // fontFamily / borderRadius come from theme tokens at render time.
  label: {
    marginBottom: 6,
  },
  input: {},
  error: {
    marginTop: 4,
  },
  hint: {
    marginTop: 4,
  },
});
