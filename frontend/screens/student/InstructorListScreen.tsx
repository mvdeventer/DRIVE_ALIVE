/**
 * Instructor List Screen - Browse and select instructors for booking
 */
import { FontAwesome } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import ApiService from '../../services/api';
import { getAllCitiesAndSuburbs } from '../../utils/cities';

interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  instructor_id: number;
  license_number: string;
  license_types: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  province?: string;
  city: string;
  suburb?: string;
  is_available: boolean;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  current_latitude?: number;
  current_longitude?: number;
}

export default function InstructorListScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [numColumns, setNumColumns] = useState(getNumColumns());
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [filteredInstructors, setFilteredInstructors] = useState<Instructor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  useEffect(() => {
    loadInstructors();

    // Handle window resize for responsive grid
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setNumColumns(getNumColumns());
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    filterInstructors();
  }, [searchQuery, availableOnly, selectedCity, instructors]);

  const loadInstructors = async () => {
    try {
      // Load ALL instructors (not just available)
      const response = await ApiService.get('/instructors/', {
        params: {
          available_only: false,
        },
      });
      setInstructors(response.data);
      setFilteredInstructors(response.data);
    } catch (error: any) {
      console.error('Error loading instructors:', error);
      if (Platform.OS === 'web') {
        alert('Failed to load instructors');
      } else {
        Alert.alert('Error', 'Failed to load instructors');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterInstructors = () => {
    let filtered = instructors;

    // Filter by availability
    if (availableOnly) {
      filtered = filtered.filter(i => i.is_available);
    }

    // Filter by city or suburb
    if (selectedCity) {
      filtered = filtered.filter(i => i.city === selectedCity || i.suburb === selectedCity);
    }

    // Filter by search query (name, vehicle, city, suburb, province)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.first_name.toLowerCase().includes(query) ||
          i.last_name.toLowerCase().includes(query) ||
          i.vehicle_make.toLowerCase().includes(query) ||
          i.vehicle_model.toLowerCase().includes(query) ||
          i.city.toLowerCase().includes(query) ||
          (i.suburb && i.suburb.toLowerCase().includes(query)) ||
          (i.province && i.province.toLowerCase().includes(query))
      );
    }

    setFilteredInstructors(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInstructors();
  };

  const handleLogout = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.reload();
      } else {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('user_role');
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSelectInstructor = (instructor: Instructor) => {
    // Show full profile when card is tapped
    handleViewFullProfile(instructor);
  };

  const handleBookLesson = (instructor: Instructor) => {
    if (!instructor.is_available) {
      if (Platform.OS === 'web') {
        alert('This instructor is currently unavailable');
      } else {
        Alert.alert('Unavailable', 'This instructor is currently unavailable');
      }
      return;
    }

    // Navigate to booking screen with instructor data
    navigation.navigate('Booking' as never, { instructor } as never);
  };

  const handleCallInstructor = (instructor: Instructor) => {
    if (Platform.OS === 'web') {
      window.open(`tel:${instructor.phone}`, '_self');
    } else {
      Alert.alert('Call Instructor', `Call ${instructor.first_name} ${instructor.last_name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const { Linking } = require('react-native');
            Linking.openURL(`tel:${instructor.phone}`);
          },
        },
      ]);
    }
  };

  const handleWhatsAppInstructor = async (instructor: Instructor) => {
    try {
      // Get current student information
      const currentUser = await ApiService.getCurrentUser();
      const studentName = `${currentUser.first_name} ${currentUser.last_name}`;
      const studentPhone = currentUser.phone;

      // Format phone number for WhatsApp
      // According to WhatsApp docs: Use full phone number in international format
      // Omit any zeroes, brackets, or dashes. Format: 27XXXXXXXXX (no + sign)
      let phoneNumber = instructor.phone.replace(/\D/g, ''); // Remove all non-digits (+, spaces, dashes, etc.)

      // Handle different input formats
      if (phoneNumber.startsWith('0')) {
        // Local format (0XXXXXXXXX) -> international (27XXXXXXXXX)
        phoneNumber = '27' + phoneNumber.substring(1);
      } else if (phoneNumber.startsWith('27')) {
        // Already in international format, keep as is
        phoneNumber = phoneNumber;
      } else {
        // Missing country code, add it
        phoneNumber = '27' + phoneNumber;
      }

      // Validate: SA mobile numbers are 11 digits total (27 + 9 digits)
      if (phoneNumber.length !== 11) {
        console.error('❌ Invalid phone number length:', {
          original: instructor.phone,
          formatted: phoneNumber,
          length: phoneNumber.length,
          expected: 11,
        });

        if (Platform.OS === 'web') {
          const retry = window.confirm(
            `Invalid phone number format: ${instructor.phone}\n` +
              `Formatted: ${phoneNumber} (${phoneNumber.length} digits)\n\n` +
              `Click OK to try opening WhatsApp anyway, or Cancel to copy the number.`
          );
          if (!retry) {
            navigator.clipboard.writeText(instructor.phone);
            alert(
              `Phone number copied: ${instructor.phone}\nYou can manually add this contact in WhatsApp.`
            );
            return;
          }
        } else {
          Alert.alert(
            'Invalid Phone Number',
            `Cannot open WhatsApp.\nPhone: ${instructor.phone}\nFormatted: ${phoneNumber}`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Try Anyway', onPress: () => {} },
            ]
          );
          return;
        }
      }

      // Validate: Must start with 27
      if (!phoneNumber.startsWith('27')) {
        console.error('❌ Phone number does not start with country code 27:', phoneNumber);
        if (Platform.OS === 'web') {
          alert(
            `Invalid phone number: ${phoneNumber}\nMust start with 27 (South African country code)`
          );
        } else {
          Alert.alert('Invalid Phone Number', `Number must start with country code 27`);
        }
        return;
      }

      // Professional message with student details
      const message = `Good day ${instructor.first_name},

I am ${studentName} and I found your profile on Drive Alive.

I am interested in booking driving lessons with you.

My contact details:
Name: ${studentName}
Phone: ${studentPhone}

Looking forward to hearing from you.

Kind regards,
${studentName}`;

      // Use whatsapp:// protocol to open the app directly instead of web
      // For mobile: whatsapp://send?phone=XXXXXXXXXXX&text=message
      // For desktop: whatsapp://send?phone=XXXXXXXXXXX&text=message (opens desktop app if installed)
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
        message
      )}`;

      // Enhanced debug logging
      console.log('✅ WhatsApp URL Generated:', {
        instructor: `${instructor.first_name} ${instructor.last_name}`,
        student: studentName,
        originalPhone: instructor.phone,
        formattedPhone: phoneNumber,
        phoneLength: phoneNumber.length,
        startsWithCC: phoneNumber.startsWith('27'),
        protocol: 'whatsapp://',
        fullUrl: whatsappUrl.substring(0, 100) + '...',
      });

      if (Platform.OS === 'web') {
        console.log('🌐 Opening WhatsApp Desktop App...');
        // Try to open WhatsApp desktop app, will fall back to web if app not installed
        window.location.href = whatsappUrl;
      } else {
        console.log('📱 Opening WhatsApp Mobile App...');
        const { Linking } = require('react-native');
        Linking.openURL(whatsappUrl).catch(error => {
          console.error('❌ Error opening WhatsApp:', error);
          Alert.alert(
            'WhatsApp Error',
            `This phone number may not be registered with WhatsApp: ${instructor.phone}\n\nWould you like to call instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Call', onPress: () => handleCallInstructor(instructor) },
            ]
          );
        });
      }
    } catch (error) {
      console.error('❌ Error in handleWhatsAppInstructor:', error);
      if (Platform.OS === 'web') {
        alert(
          `Failed to open WhatsApp: ${error}\n\n` +
            `Phone: ${instructor.phone}\n\n` +
            `Please try calling instead or manually add this number to WhatsApp.`
        );
      } else {
        Alert.alert('Error', 'Failed to open WhatsApp. Please try calling instead.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call Instead', onPress: () => handleCallInstructor(instructor) },
        ]);
      }
    }
  };

  const handleViewFullProfile = (instructor: Instructor) => {
    const licenseTypes = instructor.license_types
      .split(',')
      .map(t => `Code ${t}`)
      .join(', ');

    const location = [instructor.province, instructor.city, instructor.suburb]
      .filter(Boolean)
      .join(', ');

    const details = `👤 ${instructor.first_name} ${instructor.last_name}\n${
      instructor.is_verified ? '✅ Verified Instructor' : '⚠️ Not Verified'
    }\n\n📍 Location\n${location}\n\n🪪 License Types\n${licenseTypes}\n\n🚗 Vehicle\n${
      instructor.vehicle_make
    } ${instructor.vehicle_model} (${instructor.vehicle_year})\n\n💰 Pricing\nR${
      instructor.hourly_rate
    }/hr\n\n⭐ Rating\n${instructor.rating.toFixed(1)} stars (${
      instructor.total_reviews
    } reviews)\n\n📱 Contact\nPhone: ${instructor.phone}\nEmail: ${instructor.email}\n\n${
      instructor.is_available ? '✅ Currently Available' : '❌ Currently Unavailable'
    }`;

    if (Platform.OS === 'web') {
      alert(`Instructor Profile\n\n${details}`);
    } else {
      Alert.alert('Instructor Profile', details, [
        { text: 'Close', style: 'cancel' },
        { text: 'Book Now', onPress: () => handleBookLesson(instructor) },
      ]);
    }
  };

  const renderInstructor = ({ item }: { item: Instructor }) => {
    // Compact location display
    const location = [item.suburb, item.city, item.province].filter(Boolean).join(', ');

    return (
      <TouchableOpacity style={styles.instructorCard} onPress={() => handleSelectInstructor(item)}>
        <View style={styles.instructorHeader}>
          <View style={styles.instructorInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.instructorName}>
                {item.first_name} {item.last_name} {item.is_verified && '✅'}
              </Text>
              <View
                style={[
                  styles.availabilityBadge,
                  { backgroundColor: item.is_available ? '#28a745' : '#dc3545' },
                ]}
              >
                <Text style={styles.availabilityText}>
                  {item.is_available ? 'Available' : 'Unavailable'}
                </Text>
              </View>
            </View>
            <Text style={styles.vehicleInfo}>
              🚗 {item.vehicle_make} {item.vehicle_model} ({item.vehicle_year})
            </Text>
          </View>
        </View>

        <View style={styles.instructorDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📍 {location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              🪪{' '}
              {item.license_types
                .split(',')
                .map(t => `Code ${t}`)
                .join(', ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.detailLabel}>💰 R{item.hourly_rate}/hr</Text>
            <Text style={styles.detailLabel}>
              ⭐ {item.rating.toFixed(1)} ({item.total_reviews})
            </Text>
            <Text style={styles.detailLabel}>📱 {item.phone}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, !item.is_available && styles.primaryButtonDisabled]}
            onPress={() => handleBookLesson(item)}
            disabled={!item.is_available}
          >
            <Text style={styles.primaryButtonText}>📅 Book Lesson</Text>
          </TouchableOpacity>

          <View style={styles.secondaryButtonsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleCallInstructor(item)}
            >
              <Text style={styles.secondaryButtonText}>📞 Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleWhatsAppInstructor(item)}
            >
              <FontAwesome name="whatsapp" size={16} color="#25D366" style={{ marginRight: 6 }} />
              <Text style={styles.secondaryButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading instructors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Instructor List"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      {/* Search Bar and Filter Toggles */}
      <View style={styles.searchAndFilterRow}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, vehicle, city, suburb, or province..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, availableOnly && styles.filterButtonActive]}
            onPress={() => setAvailableOnly(!availableOnly)}
          >
            <Text style={[styles.filterButtonText, availableOnly && styles.filterButtonTextActive]}>
              {availableOnly ? '✓ Available Only' : 'Show All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, selectedCity && styles.filterButtonActive]}
            onPress={() => setShowCityPicker(true)}
          >
            <Text style={[styles.filterButtonText, selectedCity && styles.filterButtonTextActive]}>
              {selectedCity ? `📍 ${selectedCity}` : '📍 All Cities'}
            </Text>
          </TouchableOpacity>
          {selectedCity && (
            <TouchableOpacity style={styles.clearCityButton} onPress={() => setSelectedCity(null)}>
              <Text style={styles.clearCityText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.resultCountContainer}>
        <Text style={styles.resultCount}>{filteredInstructors.length} instructor(s) found</Text>
      </View>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCityPicker(false);
          setLocationSearchQuery('');
        }}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select City or Suburb</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCityPicker(false);
                  setLocationSearchQuery('');
                }}
              >
                <Text style={styles.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerSearchContainer}>
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search locations..."
                value={locationSearchQuery}
                onChangeText={setLocationSearchQuery}
                autoFocus={Platform.OS !== 'android'}
              />
            </View>
            <ScrollView style={styles.cityList}>
              {getAllCitiesAndSuburbs()
                .filter(location =>
                  location.toLowerCase().includes(locationSearchQuery.toLowerCase())
                )
                .map(location => (
                  <TouchableOpacity
                    key={location}
                    style={[styles.cityItem, selectedCity === location && styles.cityItemSelected]}
                    onPress={() => {
                      setSelectedCity(location);
                      setShowCityPicker(false);
                      setLocationSearchQuery('');
                    }}
                  >
                    <Text
                      style={[
                        styles.cityItemText,
                        selectedCity === location && styles.cityItemTextSelected,
                      ]}
                    >
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Instructor List */}
      <FlatList
        data={filteredInstructors}
        renderItem={renderInstructor}
        keyExtractor={item => item.id.toString()}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No instructors found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your filters or search query</Text>
          </View>
        }
      />
    </View>
  );
}

// Calculate number of columns based on screen width
function getNumColumns(): number {
  if (Platform.OS === 'web') {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    if (width >= 1200) return 3; // Large screens
    if (width >= 768) return 2; // Tablets
    return 1; // Mobile
  }
  // For native mobile apps, use screen dimensions
  const width = Dimensions.get('window').width;
  if (width >= 768) return 2; // Tablets in landscape
  return 1; // Mobile phones
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
    marginRight: 12,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007bff',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    color: '#007bff',
    fontWeight: '600',
    fontSize: 14,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearCityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sortContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    backgroundColor: '#fff',
  },
  sortButtonActive: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  sortButtonText: {
    color: '#6c757d',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  resultCountContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerSearchContainer: {
    padding: 12,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerSearchInput: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerClose: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityItemSelected: {
    backgroundColor: '#e7f3ff',
  },
  cityItemText: {
    fontSize: 16,
    color: '#333',
  },
  cityItemTextSelected: {
    color: '#007bff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  instructorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    margin: 6,
    flexBasis: '45%',
    minWidth: 340,
    maxWidth: '100%',
    flexGrow: 1,
    boxShadow: '0px 2px 4px #0000001A',
    elevation: 2,
  },
  instructorHeader: {
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  vehicleInfo: {
    fontSize: 11,
    color: '#666',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availabilityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  instructorDetails: {
    marginBottom: 6,
  },
  detailRow: {
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonsContainer: {
    marginTop: 5,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 5,
  },
  primaryButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 6,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 2,
  },
  secondaryButtonText: {
    color: '#495057',
    fontSize: 11,
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
