import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { z } from 'zod';
import { databaseInterfaceService } from '../services/database-interface';

// Validation Schemas
const UserUpdateSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  role: z.enum(['student', 'instructor', 'admin']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

const InstructorUpdateSchema = z.object({
  license_number: z.string().min(5, 'License number required').max(50),
  vehicle: z.string().min(1, 'Vehicle required').max(100),
  vehicle_year: z.number().min(1980).max(new Date().getFullYear() + 1),
  hourly_rate: z.number().min(0.01),
  service_radius_km: z.number().min(1).max(100),
  bio: z.string().max(500).optional(),
  verified: z.boolean(),
});

const StudentUpdateSchema = z.object({
  emergency_contact_name: z.string().min(1).max(100),
  emergency_contact_phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(50),
  postal_code: z.string().regex(/^[0-9]{4}$/, 'Invalid postal code'),
});

const BookingUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  amount: z.number().min(0.01),
  notes: z.string().max(500).optional(),
});

type FormData = {
  [key: string]: any;
};

interface DatabaseEditFormProps {
  visible: boolean;
  tableType: 'users' | 'instructors' | 'students' | 'bookings' | 'reviews' | 'schedules';
  recordId: number;
  currentData: FormData;
  etag: string;
  onClose: () => void;
  onSuccess: (updatedData: FormData) => void;
  onError: (error: string) => void;
}

export default function DatabaseEditForm({
  visible,
  tableType,
  recordId,
  currentData,
  etag,
  onClose,
  onSuccess,
  onError,
}: DatabaseEditFormProps) {
  const [formData, setFormData] = useState<FormData>(currentData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Get schema based on table type
  const getSchema = () => {
    switch (tableType) {
      case 'users':
        return UserUpdateSchema;
      case 'instructors':
        return InstructorUpdateSchema;
      case 'students':
        return StudentUpdateSchema;
      case 'bookings':
        return BookingUpdateSchema;
      default:
        return UserUpdateSchema;
    }
  };

  // Get editable fields based on table type
  const getEditableFields = (): string[] => {
    switch (tableType) {
      case 'users':
        return ['first_name', 'last_name', 'email', 'phone', 'role', 'status'];
      case 'instructors':
        return ['license_number', 'vehicle', 'vehicle_year', 'hourly_rate', 'service_radius_km', 'bio', 'verified'];
      case 'students':
        return ['emergency_contact_name', 'emergency_contact_phone', 'address', 'city', 'postal_code'];
      case 'bookings':
        return ['status', 'amount', 'notes'];
      default:
        return [];
    }
  };

  // Get field label
  const getFieldLabel = (field: string): string => {
    const labels: { [key: string]: string } = {
      first_name: 'First Name',
      last_name: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      status_field: 'Status',
      license_number: 'License Number',
      vehicle: 'Vehicle',
      vehicle_year: 'Year',
      hourly_rate: 'Hourly Rate',
      service_radius_km: 'Service Radius (km)',
      bio: 'Bio',
      verified: 'Verified',
      emergency_contact_name: 'Emergency Contact Name',
      emergency_contact_phone: 'Emergency Contact Phone',
      address: 'Address',
      city: 'City',
      postal_code: 'Postal Code',
      amount: 'Amount',
      notes: 'Notes',
    };
    return labels[field] || field;
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    try {
      const schema = getSchema();
      schema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.issues.forEach((issue) => {
          newErrors[issue.path[0] as string] = issue.message;
        });
        setErrors(newErrors);
      }
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setConflictMessage('');

    try {
      // Prepare update data (only changed fields)
      const updateData: FormData = {};
      const editableFields = getEditableFields();
      editableFields.forEach((field) => {
        if (formData[field] !== undefined) {
          updateData[field] = formData[field];
        }
      });

      let result: any;

      // Call appropriate update method
      switch (tableType) {
        case 'users':
          result = await databaseInterfaceService.updateUser(recordId, updateData, etag);
          break;
        case 'instructors':
          result = await databaseInterfaceService.updateInstructor(recordId, updateData, etag);
          break;
        case 'students':
          result = await databaseInterfaceService.updateStudent(recordId, updateData, etag);
          break;
        case 'bookings':
          result = await databaseInterfaceService.updateBooking(recordId, updateData, etag);
          break;
        default:
          throw new Error('Unsupported table type');
      }

      // Success
      onSuccess(result);
      onClose();
    } catch (error: any) {
      setLoading(false);

      // Handle 409 Conflict (ETag mismatch)
      if (error.status === 409) {
        setConflictMessage(
          '⚠️ This record was modified by another user. Click "Refresh & Edit" to reload the latest data.'
        );
        onError('Record conflict - another user modified this record');
      } else if (error.status === 422) {
        // Validation error
        if (error.errors && typeof error.errors === 'object') {
          setErrors(error.errors);
        } else {
          onError(error.detail || 'Validation error');
        }
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        onError(error.detail || 'Failed to update record');
      }
    }
  };

  // Render form field
  const renderField = (field: string) => {
    const value = formData[field];
    const error = errors[field];
    const label = getFieldLabel(field);
    const isBoolean = typeof currentData[field] === 'boolean';
    const isEnum = ['role', 'status'].includes(field);

    if (isBoolean) {
      return (
        <View key={field} style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.booleanContainer}>
            <TouchableOpacity
              style={[
                styles.booleanButton,
                value === true && styles.booleanButtonActive,
              ]}
              onPress={() => handleFieldChange(field, true)}
            >
              <Text
                style={[
                  styles.booleanButtonText,
                  value === true && styles.booleanButtonTextActive,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.booleanButton,
                value === false && styles.booleanButtonActive,
              ]}
              onPress={() => handleFieldChange(field, false)}
            >
              <Text
                style={[
                  styles.booleanButtonText,
                  value === false && styles.booleanButtonTextActive,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      );
    }

    if (isEnum) {
      const options = field === 'role' 
        ? ['student', 'instructor', 'admin']
        : ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

      return (
        <View key={field} style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.enumContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.enumButton,
                  value === option && styles.enumButtonActive,
                ]}
                onPress={() => handleFieldChange(field, option)}
              >
                <Text
                  style={[
                    styles.enumButtonText,
                    value === option && styles.enumButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      );
    }

    return (
      <View key={field} style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={String(value || '')}
          onChangeText={(text) => handleFieldChange(field, text)}
          placeholder={`Enter ${label.toLowerCase()}`}
          editable={!loading}
          multiline={field === 'bio' || field === 'notes'}
          numberOfLines={field === 'bio' || field === 'notes' ? 4 : 1}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay as any}>
        <View style={styles.container as any}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit {tableType.charAt(0).toUpperCase() + tableType.slice(1)}</Text>
            <TouchableOpacity onPress={onClose} disabled={loading} style={{ padding: 8 }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Conflict Message */}
          {conflictMessage && (
            <View style={styles.conflictContainer}>
              <Text style={styles.conflictText}>{conflictMessage}</Text>
            </View>
          )}

          {/* Form */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.formContainer}
            contentContainerStyle={styles.formContent}
            scrollEnabled={true}
          >
            {getEditableFields().map((field) => renderField(field))}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
    maxHeight: '85%' as any,
    display: 'flex' as any,
    flexDirection: 'column' as any,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: Platform.OS === 'web' ? 24 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700' as any,
    color: '#333',
  },
  closeButton: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: '#666',
    fontWeight: '700' as any,
  },
  conflictContainer: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: Platform.OS === 'web' ? 16 : 12,
    marginHorizontal: Platform.OS === 'web' ? 24 : 16,
    marginTop: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 4,
  },
  conflictText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#856404',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  fieldContainer: {
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  label: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: 600 as any,
    color: '#333',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  error: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#dc3545',
    marginTop: Platform.OS === 'web' ? 6 : 4,
    fontWeight: 500 as any,
  },
  booleanContainer: {
    flexDirection: 'row' as const,
    gap: Platform.OS === 'web' ? 12 : 8,
  },
  booleanButton: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    alignItems: 'center' as const,
  },
  booleanButtonActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  booleanButtonText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#666',
  },
  booleanButtonTextActive: {
    color: '#fff',
  },
  enumContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Platform.OS === 'web' ? 10 : 8,
  },
  enumButton: {
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 11,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  enumButtonActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  enumButtonText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '500',
    color: '#666',
  },
  enumButtonTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row' as const,
    gap: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  cancelButtonText: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: 600 as any,
    color: '#dc3545',
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  submitButtonText: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: 600 as any,
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
};
