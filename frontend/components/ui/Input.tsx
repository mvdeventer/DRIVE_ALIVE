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

import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors, responsive } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : colors.textSecondary,
              fontSize: responsive(14, 13),
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        {...props}
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
            backgroundColor: colors.inputBackground,
            borderColor: error
              ? colors.danger
              : isFocused
                ? colors.borderFocus
                : colors.inputBorder,
            borderWidth: isFocused ? 2 : 1,
            color: colors.inputText,
            fontSize: responsive(16, 15),
            paddingVertical: responsive(14, 12),
            paddingHorizontal: responsive(14, 12),
          },
          props.multiline && {
            minHeight: responsive(100, 80),
            textAlignVertical: 'top',
          },
          style,
        ]}
      />
      {error && (
        <Text style={[styles.error, { color: colors.danger, fontSize: responsive(12, 11) }]}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text style={[styles.hint, { color: colors.textTertiary, fontSize: responsive(12, 11) }]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
  },
  error: {
    marginTop: 4,
    fontFamily: 'Inter_500Medium',
  },
  hint: {
    marginTop: 4,
  },
});
