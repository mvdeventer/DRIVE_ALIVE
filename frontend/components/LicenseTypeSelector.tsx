/**
 * License Type Selector Component
 */
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

      <TouchableOpacity style={styles.selectorButton} onPress={() => setShowSelector(true)}>
        <Text style={selectedTypes.length > 0 ? styles.selectedText : styles.placeholderText}>
          {selectedTypes.length > 0
            ? selectedTypes.join(', ')
            : 'Select license types you can teach'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Selected License Types Details */}
      {selectedTypes.length > 0 && (
        <View style={styles.selectedDetailsContainer}>
          {selectedTypes.map(code => {
            const licenseType = LICENSE_TYPES.find(lt => lt.code === code);
            if (!licenseType) return null;
            return (
              <View key={code} style={styles.selectedDetailItem}>
                <Text style={styles.selectedDetailCode}>{licenseType.code}</Text>
                <View style={styles.selectedDetailInfo}>
                  <Text style={styles.selectedDetailName}>{licenseType.name}</Text>
                  <Text style={styles.selectedDetailDescription}>{licenseType.description}</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.selectorContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select License Types</Text>
              <TouchableOpacity onPress={() => setShowSelector(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
              {LICENSE_TYPES.map(type => (
                <TouchableOpacity
                  key={type.code}
                  style={styles.licenseItem}
                  onPress={() => toggleLicenseType(type.code)}
                >
                  <View style={styles.licenseInfo}>
                    <Text style={styles.licenseName}>{type.name}</Text>
                    <Text style={styles.licenseDescription}>{type.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedTypes.includes(type.code) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedTypes.includes(type.code) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.hint}>
              Selected: {selectedTypes.length} {selectedTypes.length === 1 ? 'type' : 'types'}
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
        <TouchableOpacity
          style={styles.tooltipOverlay}
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
  selectorButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    flex: 1,
  },
  selectedText: {
    color: '#333',
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
    transform: [{ rotate: '90deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  doneButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    padding: 15,
  },
  licenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 10,
  },
  licenseInfo: {
    flex: 1,
    marginRight: 10,
  },
  licenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  licenseDescription: {
    fontSize: 13,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
  selectedDetailsContainer: {
    marginTop: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDetailItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectedDetailCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 60,
    marginRight: 12,
  },
  selectedDetailInfo: {
    flex: 1,
  },
  selectedDetailName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedDetailDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  tooltipOverlay: {
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
