/**
 * Address Input Component - Structured Fields with GPS Location
 * Users can enter address manually OR capture current GPS coordinates
 */
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapPreview from './MapPreview';

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onLocationCapture?: (coords: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  style?: any;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onLocationCapture,
  style,
}: AddressAutocompleteProps) {
  // Parse existing address value into separate fields
  const lines = value.split('\n').filter(line => line.trim());
  const [streetAddress, setStreetAddress] = useState(lines[0] || '');
  const [suburb, setSuburb] = useState(lines[1] || '');
  const [city, setCity] = useState(lines[2] || '');
  const [postalCode, setPostalCode] = useState(lines[3] || '');

  // GPS state
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  // Update parent when any field changes
  const updateAddress = (street: string, sub: string, cty: string, postal: string) => {
    const parts = [street, sub, cty, postal].filter(p => p.trim());
    onChangeText(parts.join('\n'));
  };

  // Capture current GPS location
  const handleGetCurrentLocation = async () => {
    setLoadingGPS(true);
    setGpsError(null);

    try {
      // Use expo-location for native apps, navigator.geolocation for web
      if (Platform.OS === 'web') {
        // Web-specific geolocation
        if (!navigator.geolocation) {
          setGpsError('GPS not available on this device');
          setLoadingGPS(false);
          return;
        }

        // iOS Safari/Chrome requires HTTPS for geolocation
        const isSecure = window.location.protocol === 'https:';
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isIOS && !isSecure) {
          setGpsError(
            '🔒 iOS web browsers require HTTPS for GPS.\n\n' +
              'Please enter the pickup address manually below.'
          );
          setLoadingGPS(false);
          return;
        }

        // Web geolocation API
        navigator.geolocation.getCurrentPosition(
          async position => {
            await processLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          error => {
            handleLocationError(error.code);
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          }
        );
      } else {
        // Native app - use expo-location
        // Request permissions first
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setGpsError(
            '📱 Location Permission Required\n\n' +
              '1. Open Settings on your device\n' +
              '2. Find "Drive Alive" app\n' +
              '3. Enable Location Services\n' +
              '4. Return and try again\n\n' +
              'OR enter address manually below'
          );
          setLoadingGPS(false);
          return;
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        await processLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error: any) {
      console.error('Location error:', error);
      setGpsError(
        'Unable to get location.\n\n' +
          'Please ensure Location Services are enabled and try again,\n' +
          'or enter the pickup address manually below.'
      );
      setLoadingGPS(false);
    }
  };

  // Process captured location coordinates
  const processLocation = async (coords: { latitude: number; longitude: number }) => {
    setCoordinates(coords);
    setLoadingGPS(false);

    // Notify parent component of coordinates
    if (onLocationCapture) {
      onLocationCapture(coords);
    }

    // Attempt reverse geocoding - try Google first (more accurate for SA), fallback to OpenStreetMap
    try {
      // Try Google Geocoding API first (more accurate for South African addresses)
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
      );

      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        if (googleData.status === 'OK' && googleData.results?.[0]) {
          const components = googleData.results[0].address_components;

          // Extract address components
          let street = '';
          let house = '';
          let suburbValue = '';
          let cityValue = '';
          let postalValue = '';

          components.forEach((component: any) => {
            if (component.types.includes('street_number')) {
              house = component.long_name;
            } else if (component.types.includes('route')) {
              street = component.long_name;
            } else if (
              component.types.includes('sublocality') ||
              component.types.includes('sublocality_level_1')
            ) {
              suburbValue = component.long_name;
            } else if (component.types.includes('locality')) {
              cityValue = component.long_name;
            } else if (component.types.includes('postal_code')) {
              postalValue = component.long_name;
            }
          });

          const fullStreet = house ? `${house} ${street}`.trim() : street;

          setStreetAddress(fullStreet);
          setSuburb(suburbValue);
          setCity(cityValue);
          setPostalCode(postalValue);
          updateAddress(fullStreet, suburbValue, cityValue, postalValue);
          return; // Success - exit
        }
      }

      // Fallback to OpenStreetMap if Google fails
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
          `lat=${coords.latitude}&lon=${coords.longitude}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DriveAlive-BookingApp/1.0',
          },
        }
      );

      if (osmResponse.ok) {
        const data = await osmResponse.json();
        const address = data.address;

        // Auto-fill address fields from geocoded data
        if (address) {
          const street = address.road || address.street || '';
          const house = address.house_number || '';
          const suburbValue = address.suburb || address.neighbourhood || address.village || '';
          const cityValue = address.city || address.town || address.municipality || '';
          const postalValue = address.postcode || '';

          const fullStreet = house ? `${house} ${street}`.trim() : street;

          setStreetAddress(fullStreet);
          setSuburb(suburbValue);
          setCity(cityValue);
          setPostalCode(postalValue);
          updateAddress(fullStreet, suburbValue, cityValue, postalValue);
        }
      }
    } catch (error) {
      console.log('Reverse geocoding failed, coordinates captured:', coords);
      // Even if reverse geocoding fails, we still have the coordinates
    }
  };

  // Handle geolocation errors (web API)
  const handleLocationError = (errorCode: number) => {
    setLoadingGPS(false);

    const isIOS = Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    switch (errorCode) {
      case 1: // PERMISSION_DENIED
        if (isIOS) {
          setGpsError(
            '📱 iOS Location Access:\n' +
              '1. Open Settings > Safari > Location\n' +
              '2. Select "Ask" or "Allow"\n' +
              '3. Reload page and try again\n\n' +
              'OR use manual address entry below'
          );
        } else {
          setGpsError(
            'Location permission denied.\n\n' +
              'Click the 🔒 icon in your browser address bar to allow location access.\n' +
              'Then reload the page and try again.'
          );
        }
        break;
      case 2: // POSITION_UNAVAILABLE
        setGpsError(
          'Location unavailable. Check GPS/Location Services are enabled on your device.'
        );
        break;
      case 3: // TIMEOUT
        setGpsError('Location request timed out. Please try again or enter address manually.');
        break;
      default:
        setGpsError('Unable to get location. Please enter address manually below.');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* GPS Location Button */}
      <TouchableOpacity
        style={styles.gpsButton}
        onPress={handleGetCurrentLocation}
        disabled={loadingGPS}
      >
        {loadingGPS ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.gpsButtonText}>📍 Use Current Location (GPS)</Text>
        )}
      </TouchableOpacity>

      {/* GPS Status Messages */}
      {gpsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{gpsError}</Text>
        </View>
      )}

      {coordinates && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            ✓ Location captured: {coordinates.latitude.toFixed(6)},{' '}
            {coordinates.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Map View showing captured location */}
      {coordinates && (
        <MapPreview latitude={coordinates.latitude} longitude={coordinates.longitude} />
      )}

      {/* Manual Address Entry */}
      <Text style={styles.orText}>— OR Enter Address Manually —</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Street Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 40 Potgieter Crescent"
          value={streetAddress}
          onChangeText={text => {
            setStreetAddress(text);
            updateAddress(text, suburb, city, postalCode);
          }}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Suburb *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Brackenfell"
          value={suburb}
          onChangeText={text => {
            setSuburb(text);
            updateAddress(streetAddress, text, city, postalCode);
          }}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Cape Town"
          value={city}
          onChangeText={text => {
            setCity(text);
            updateAddress(streetAddress, suburb, text, postalCode);
          }}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Postal Code *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 7560"
          value={postalCode}
          onChangeText={text => {
            setPostalCode(text);
            updateAddress(streetAddress, suburb, city, text);
          }}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#d00',
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  successContainer: {
    backgroundColor: '#efe',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0a0',
  },
  successText: {
    color: '#0a0',
    fontSize: 14,
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 8,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
  },
});
