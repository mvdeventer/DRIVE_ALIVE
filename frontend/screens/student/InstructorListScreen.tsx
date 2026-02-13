/**
 * Instructor List Screen - Browse and select instructors for booking
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebNavigationHeader from '../../components/WebNavigationHeader';
import CreditBanner from '../../components/CreditBanner';
import InlineMessage from '../../components/InlineMessage';
import { Badge, Button, Card, Input, ThemedModal } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
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
  booking_fee?: number;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  current_latitude?: number;
  current_longitude?: number;
  is_self?: boolean;
}

export default function InstructorListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [numColumns, setNumColumns] = useState(getNumColumns());
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [filteredInstructors, setFilteredInstructors] = useState<Instructor[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
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
      setErrorMessage('');
      // Get current user to identify their instructor profile
      const currentUserResponse = await ApiService.getCurrentUser();
      const currentUserId = currentUserResponse.id;

      // Load ALL instructors (not just available)
      const response = await ApiService.get('/instructors/', {
        params: {
          available_only: false,
        },
      });

      const allInstructors = response.data.map((instructor: Instructor) => ({
        ...instructor,
        is_self: instructor.id === currentUserId,
      }));

      setInstructors(allInstructors);
      setFilteredInstructors(allInstructors);
    } catch (error: any) {
      console.error('Error loading instructors:', error);
      setErrorMessage(error?.response?.data?.detail || 'Failed to load instructors. Please try again.');
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
          (i.first_name && i.first_name.toLowerCase().includes(query)) ||
          (i.last_name && i.last_name.toLowerCase().includes(query)) ||
          (i.vehicle_make && i.vehicle_make.toLowerCase().includes(query)) ||
          (i.vehicle_model && i.vehicle_model.toLowerCase().includes(query)) ||
          (i.city && i.city.toLowerCase().includes(query)) ||
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

  const handleSelectInstructor = (instructor: Instructor) => {
    // Show full profile when card is tapped
    handleViewFullProfile(instructor);
  };

  const handleBookLesson = (instructor: Instructor) => {
    if (instructor.is_self) {
      if (Platform.OS === 'web') {
        alert('You cannot book lessons with your own instructor profile.');
      } else {
        Alert.alert('Not Allowed', 'You cannot book lessons with your own instructor profile.');
      }
      return;
    }

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

I am ${studentName} and I found your profile on RoadReady.

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
    } ${instructor.vehicle_model} (${instructor.vehicle_year})\n\n💰 Pricing\nR${(
      (instructor.hourly_rate || 0) + (instructor.booking_fee || 20.0)
    ).toFixed(2)}/hr\n\n⭐ Rating\n${instructor.rating.toFixed(1)} stars (${
      instructor.total_reviews
    } reviews)\n\n${
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
    const location = [item.suburb, item.city, item.province].filter(Boolean).join(', ');

    return (
      <Pressable
        style={({ pressed }) => [
          styles.instructorCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => handleSelectInstructor(item)}
      >
        <View style={styles.instructorHeader}>
          <View style={styles.instructorInfo}>
            <View style={styles.nameRow}>
              <View style={styles.nameBadgesRow}>
                <Text style={[styles.instructorName, { color: colors.text }]}>
                  {item.first_name} {item.last_name} {item.is_verified && '✅'}
                </Text>
                {item.is_self && (
                  <Badge variant="default" size="sm">Your Profile</Badge>
                )}
              </View>
              <Badge
                variant={item.is_available ? 'success' : 'danger'}
                size="sm"
              >
                {item.is_available ? 'Available' : 'Unavailable'}
              </Badge>
            </View>
            <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>
              🚗 {item.vehicle_make} {item.vehicle_model} ({item.vehicle_year})
            </Text>
          </View>
        </View>

        <View style={styles.instructorDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>📍 {location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              🪪{' '}
              {item.license_types
                .split(',')
                .map(t => `Code ${t}`)
                .join(', ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
              💰 R{((item.hourly_rate || 0) + (item.booking_fee || 20.0)).toFixed(2)}/hr
            </Text>
            <Text style={[styles.detailLabel, { color: colors.accent }]}>
              ⭐ {item.rating.toFixed(1)} ({item.total_reviews})
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionButtonsContainer}>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onPress={() => handleBookLesson(item)}
            disabled={!item.is_available || !!item.is_self}
            icon="📅"
          >
            Book Lesson
          </Button>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading instructors...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WebNavigationHeader
        title="Instructor List"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />

      <CreditBanner compact />

      {/* Search Bar and Filter Toggles */}
      <View style={[styles.searchAndFilterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search by name, vehicle, city, suburb, or province..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterButton,
              { borderColor: colors.primary },
              availableOnly && { backgroundColor: colors.primary },
            ]}
            onPress={() => setAvailableOnly(!availableOnly)}
          >
            <Text style={[styles.filterButtonText, { color: colors.primary }, availableOnly && { color: '#fff' }]}>
              {availableOnly ? '✓ Available Only' : 'Show All'}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              { borderColor: colors.primary },
              selectedCity ? { backgroundColor: colors.primary } : undefined,
            ]}
            onPress={() => setShowCityPicker(true)}
          >
            <Text style={[styles.filterButtonText, { color: colors.primary }, selectedCity ? { color: '#fff' } : undefined]}>
              {selectedCity ? `📍 ${selectedCity}` : '📍 All Cities'}
            </Text>
          </Pressable>
          {selectedCity && (
            <Pressable
              style={[styles.clearCityButton, { backgroundColor: colors.danger }]}
              onPress={() => setSelectedCity(null)}
            >
              <Text style={styles.clearCityText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={[styles.resultCountContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filteredInstructors.length} instructor(s) found
        </Text>
      </View>

      {/* City Picker Modal */}
      <ThemedModal
        visible={showCityPicker}
        onClose={() => {
          setShowCityPicker(false);
          setLocationSearchQuery('');
        }}
        title="Select City or Suburb"
        size="md"
      >
        <View style={{ marginBottom: 12 }}>
          <Input
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
              <Pressable
                key={location}
                style={[
                  styles.cityItem,
                  { borderBottomColor: colors.border },
                  selectedCity === location && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => {
                  setSelectedCity(location);
                  setShowCityPicker(false);
                  setLocationSearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.cityItemText,
                    { color: colors.text },
                    selectedCity === location && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {location}
                </Text>
              </Pressable>
            ))}
        </ScrollView>
      </ThemedModal>

      {/* Instructor List */}
      <FlatList
        data={filteredInstructors}
        renderItem={renderInstructor}
        keyExtractor={item => item.id.toString()}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {errorMessage ? (
              <InlineMessage type="error" message={errorMessage} />
            ) : instructors.length === 0 ? (
              <>
                <InlineMessage type="info" message="No instructors have registered yet. Please check back later." />
              </>
            ) : (
              <>
                <Text style={[styles.emptyStateText, { color: colors.text }]}>No instructors match your filters</Text>
                <Text style={[styles.emptyStateSubtext, { color: colors.textSecondary }]}>
                  Try adjusting your filters or search query
                </Text>
              </>
            )}
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
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
  }
  const width = Dimensions.get('window').width;
  if (width >= 768) return 2;
  return 1;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontWeight: '600',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  clearCityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultCount: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  cityItemText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
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
    borderRadius: 12,
    padding: 18,
    margin: 6,
    flexBasis: '45%',
    minWidth: 340,
    maxWidth: '100%',
    flexGrow: 1,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
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
  nameBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    flex: 1,
  },
  vehicleInfo: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  instructorDetails: {
    marginBottom: 8,
  },
  detailRow: {
    marginBottom: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
