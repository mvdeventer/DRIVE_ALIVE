/**
 * Form Field with Info Tooltip Component
 */
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => setShowTooltip(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            tabIndex={-1}
          >
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>i</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <TextInput {...textInputProps} style={[styles.input, textInputProps.style]} />

      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View style={styles.tooltipContainer}>
            <Text style={styles.tooltipTitle}>{label}</Text>
            <Text style={styles.tooltipText}>{tooltip}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowTooltip(false)}>
              <Text style={styles.closeButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  required: {
    color: '#FF3B30',
  },
  infoButton: {
    marginLeft: 8,
  },
  infoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 350,
    width: '100%',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tooltipText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
