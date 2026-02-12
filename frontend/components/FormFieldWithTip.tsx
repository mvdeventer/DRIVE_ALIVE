/**
 * Form Field with Info Tooltip Component
 */
import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface FormFieldWithTipProps extends TextInputProps {
  label?: string;
  tooltip: string;
  required?: boolean;
}

export default function FormFieldWithTip({
  label,
  tooltip,
  required = false,
  ...textInputProps
}: FormFieldWithTipProps) {
  const { colors } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <View style={{ marginBottom: 15 }}>
      {label && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: 'Inter_600SemiBold',
              color: colors.text,
              flex: 1,
            }}
          >
            {label}
            {required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
          <Pressable
            style={{
              marginLeft: 8,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setShowTooltip(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            tabIndex={-1}
          >
            <Ionicons name="information" size={14} color={colors.textInverse} />
          </Pressable>
        </View>
      )}

      <TextInput
        {...textInputProps}
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          {
            backgroundColor: colors.inputBackground,
            padding: 15,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            color: colors.inputText,
          },
          textInputProps.style,
        ]}
      />

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          onPress={() => setShowTooltip(false)}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 24,
              maxWidth: 350,
              width: '100%',
              boxShadow: `0px 4px 12px ${colors.shadowColor}`,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontFamily: 'Inter_700Bold',
                color: colors.text,
                marginBottom: 10,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Inter_400Regular',
                color: colors.textSecondary,
                lineHeight: 22,
                marginBottom: 20,
              }}
            >
              {tooltip}
            </Text>
            <Pressable
              onPress={() => setShowTooltip(false)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: 'center' as const,
              })}
            >
              <Text
                style={{
                  color: colors.buttonPrimaryText,
                  fontSize: 15,
                  fontFamily: 'Inter_600SemiBold',
                }}
              >
                Got it!
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
