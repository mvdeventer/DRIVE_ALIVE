/**
 * License Type Selector Component
 * Modernized: Pressable, Ionicons, useTheme, Inter fonts
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface LicenseTypeSelectorProps {
  label?: string;
  tooltip: string;
  required?: boolean;
  selectedTypes: string[];
  onSelectionChange: (types: string[]) => void;
}

const LICENSE_TYPES = [
  {
    code: 'A1',
    name: 'Code A1 (Motorcycle up to 125cc)',
    description: 'Motorcycles with engine capacity up to 125cc',
  },
  {
    code: 'A',
    name: 'Code A (Motorcycle)',
    description: 'Motorcycles over 125cc and three-wheeled motor vehicles',
  },
  {
    code: 'B',
    name: 'Code B (Light Motor Vehicle)',
    description: 'Standard cars, bakkies, and light vehicles up to 3,500kg',
  },
  {
    code: 'C1',
    name: 'Code C1 (Light Commercial/Minibus)',
    description: 'Light commercial vehicles 3,500-16,000kg or minibus 9-16 passengers',
  },
  {
    code: 'C',
    name: 'Code C (Heavy Vehicle/Bus)',
    description: 'Heavy vehicles over 16,000kg or buses with more than 16 passengers',
  },
  {
    code: 'EB',
    name: 'Code EB (Light Vehicle with Trailer)',
    description: 'Light motor vehicle with trailer over 750kg',
  },
  {
    code: 'EC1',
    name: 'Code EC1 (Light Commercial with Trailer)',
    description: 'Light commercial vehicle or minibus with trailer',
  },
  {
    code: 'EC',
    name: 'Code EC (Heavy Vehicle with Trailer)',
    description: 'Heavy vehicle or bus with trailer',
  },
];

export default function LicenseTypeSelector({
  label,
  tooltip,
  required = false,
  selectedTypes,
  onSelectionChange,
}: LicenseTypeSelectorProps) {
  const { colors } = useTheme();
  const [showSelector, setShowSelector] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleLicenseType = (code: string) => {
    if (selectedTypes.includes(code)) {
      onSelectionChange(selectedTypes.filter(t => t !== code));
    } else {
      onSelectionChange([...selectedTypes, code]);
    }
  };

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
            {required && (
              <Text style={{ color: colors.danger }}> *</Text>
            )}
          </Text>
          <Pressable
            onPress={() => setShowTooltip(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            tabIndex={-1}
            style={({ pressed }) => ({
              marginLeft: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="information" size={14} color={colors.textInverse} />
            </View>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={() => setShowSelector(true)}
        style={({ pressed }) => ({
          backgroundColor: colors.inputBackground,
          padding: 15,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text
          style={{
            color: selectedTypes.length > 0 ? colors.inputText : colors.inputPlaceholder,
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            flex: 1,
          }}
        >
          {selectedTypes.length > 0
            ? selectedTypes.join(', ')
            : 'Select license types you can teach'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
      </Pressable>

      {/* Selected License Types Details */}
      {selectedTypes.length > 0 && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: colors.backgroundSecondary,
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {selectedTypes.map((code, index) => {
            const licenseType = LICENSE_TYPES.find(lt => lt.code === code);
            if (!licenseType) return null;
            const isLast = index === selectedTypes.length - 1;
            return (
              <View
                key={code}
                style={{
                  flexDirection: 'row',
                  marginBottom: isLast ? 0 : 12,
                  paddingBottom: isLast ? 0 : 12,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter_700Bold',
                    color: colors.primary,
                    width: 60,
                    marginRight: 12,
                  }}
                >
                  {licenseType.code}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: 'Inter_600SemiBold',
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {licenseType.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: 'Inter_400Regular',
                      color: colors.textSecondary,
                      lineHeight: 18,
                    }}
                  >
                    {licenseType.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* License Type Selector Modal */}
      <Modal
        visible={showSelector}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSelector(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80%',
              paddingBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Inter_700Bold',
                  color: colors.text,
                }}
              >
                Select License Types
              </Text>
              <Pressable
                onPress={() => setShowSelector(false)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: 'Inter_600SemiBold',
                    color: colors.primary,
                  }}
                >
                  Done
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ padding: 15 }}>
              {LICENSE_TYPES.map(type => {
                const isSelected = selectedTypes.includes(type.code);
                return (
                  <Pressable
                    key={type.code}
                    onPress={() => toggleLicenseType(type.code)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 15,
                      backgroundColor: pressed
                        ? colors.primary + '10'
                        : isSelected
                          ? colors.primary + '08'
                          : colors.backgroundSecondary,
                      borderRadius: 10,
                      marginBottom: 10,
                    })}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.text,
                          marginBottom: 4,
                        }}
                      >
                        {type.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: 'Inter_400Regular',
                          color: colors.textSecondary,
                        }}
                      >
                        {type.description}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: colors.primary,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text
              style={{
                textAlign: 'center',
                fontFamily: 'Inter_500Medium',
                color: colors.textSecondary,
                fontSize: 14,
                marginTop: 10,
              }}
            >
              Selected: {selectedTypes.length}{' '}
              {selectedTypes.length === 1 ? 'type' : 'types'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Tooltip Modal */}
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
              padding: 20,
              maxWidth: 350,
              width: '100%',
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
              elevation: 5,
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
                marginBottom: 15,
              }}
            >
              {tooltip}
            </Text>
            <Pressable
              onPress={() => setShowTooltip(false)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.primaryDark : colors.primary,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
              })}
            >
              <Text
                style={{
                  color: colors.textInverse,
                  fontSize: 16,
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
