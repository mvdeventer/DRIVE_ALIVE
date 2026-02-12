/**
 * Address Input Component - Structured Fields with GPS Location
 * Modernized: Pressable, Ionicons, useTheme, Inter fonts
 */
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
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
  const { colors } = useTheme();

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
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setGpsError('GPS not available on this device');
          setLoadingGPS(false);
          return;
        }

        const isSecure = window.location.protocol === 'https:';
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isIOS && !isSecure) {
          setGpsError(
            'iOS web browsers require HTTPS for GPS.\n\n' +
              'Please enter the pickup address manually below.'
          );
          setLoadingGPS(false);
          return;
        }

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
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          setGpsError(
            'Location Permission Required\n\n' +
              '1. Open Settings on your device\n' +
              '2. Find "RoadReady" app\n' +
              '3. Enable Location Services\n' +
              '4. Return and try again\n\n' +
              'OR enter address manually below'
          );
          setLoadingGPS(false);
          return;
        }

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

    if (onLocationCapture) {
      onLocationCapture(coords);
    }

    try {
      const googleResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8`
      );

      if (googleResponse.ok) {
        const googleData = await googleResponse.json();
        if (googleData.status === 'OK' && googleData.results?.[0]) {
          const components = googleData.results[0].address_components;

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
          return;
        }
      }

      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
          `lat=${coords.latitude}&lon=${coords.longitude}&format=json&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RoadReady-BookingApp/3.0',
          },
        }
      );

      if (osmResponse.ok) {
        const data = await osmResponse.json();
        const address = data.address;

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
    }
  };

  // Handle geolocation errors (web API)
  const handleLocationError = (errorCode: number) => {
    setLoadingGPS(false);

    const isIOS = Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    switch (errorCode) {
      case 1:
        if (isIOS) {
          setGpsError(
            'iOS Location Access:\n' +
              '1. Open Settings > Safari > Location\n' +
              '2. Select "Ask" or "Allow"\n' +
              '3. Reload page and try again\n\n' +
              'OR use manual address entry below'
          );
        } else {
          setGpsError(
            'Location permission denied.\n\n' +
              'Click the lock icon in your browser address bar to allow location access.\n' +
              'Then reload the page and try again.'
          );
        }
        break;
      case 2:
        setGpsError(
          'Location unavailable. Check GPS/Location Services are enabled on your device.'
        );
        break;
      case 3:
        setGpsError('Location request timed out. Please try again or enter address manually.');
        break;
      default:
        setGpsError('Unable to get location. Please enter address manually below.');
    }
  };

  // Shared input style
  const inputStyle = {
    backgroundColor: colors.inputBackground,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.inputText,
  } as const;

  return (
    <View style={[{ gap: 12 }, style]}>
      {/* GPS Location Button */}
      <Pressable
        onPress={handleGetCurrentLocation}
        disabled={loadingGPS}
        style={({ pressed }) => ({
          backgroundColor: loadingGPS
            ? colors.textTertiary
            : pressed
              ? colors.primaryDark
              : colors.buttonPrimary,
          padding: 14,
          borderRadius: 8,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          flexDirection: 'row' as const,
          gap: 8,
          minHeight: 48,
          opacity: loadingGPS ? 0.7 : 1,
        })}
      >
        {loadingGPS ? (
          <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
        ) : (
          <>
            <Ionicons name="location" size={20} color={colors.buttonPrimaryText} />
            <Text
              style={{
                color: colors.buttonPrimaryText,
                fontSize: 16,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              Use Current Location (GPS)
            </Text>
          </>
        )}
      </Pressable>

      {/* GPS Status Messages */}
      {gpsError && (
        <View
          style={{
            backgroundColor: colors.dangerBg,
            padding: 12,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: colors.danger,
          }}
        >
          <Text
            style={{
              color: colors.danger,
              fontSize: 13,
              lineHeight: 18,
              fontFamily: 'Inter_400Regular',
            }}
          >
            {gpsError}
          </Text>
        </View>
      )}

      {coordinates && (
        <View
          style={{
            backgroundColor: colors.successBg,
            padding: 10,
            borderRadius: 8,
            borderLeftWidth: 4,
            borderLeftColor: colors.success,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text
            style={{
              color: colors.success,
              fontSize: 14,
              fontFamily: 'Inter_500Medium',
              flex: 1,
            }}
          >
            GPS Location: {coordinates.latitude.toFixed(6)},{' '}
            {coordinates.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Map View showing captured location */}
      {coordinates && (
        <MapPreview latitude={coordinates.latitude} longitude={coordinates.longitude} />
      )}

      {/* Manual Address Entry */}
      <Text
        style={{
          textAlign: 'center',
          color: colors.textTertiary,
          fontSize: 14,
          fontFamily: 'Inter_500Medium',
          marginVertical: 4,
        }}
      >
        — OR Enter Address Manually —
      </Text>

      <View style={{ marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: colors.text,
            marginBottom: 6,
          }}
        >
          Street Address <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 40 Potgieter Crescent"
          placeholderTextColor={colors.inputPlaceholder}
          value={streetAddress}
          onChangeText={text => {
            setStreetAddress(text);
            updateAddress(text, suburb, city, postalCode);
          }}
        />
      </View>

      <View style={{ marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: colors.text,
            marginBottom: 6,
          }}
        >
          Suburb <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Brackenfell"
          placeholderTextColor={colors.inputPlaceholder}
          value={suburb}
          onChangeText={text => {
            setSuburb(text);
            updateAddress(streetAddress, text, city, postalCode);
          }}
        />
      </View>

      <View style={{ marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: colors.text,
            marginBottom: 6,
          }}
        >
          City <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. Cape Town"
          placeholderTextColor={colors.inputPlaceholder}
          value={city}
          onChangeText={text => {
            setCity(text);
            updateAddress(streetAddress, suburb, text, postalCode);
          }}
        />
      </View>

      <View style={{ marginBottom: 4 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: 'Inter_600SemiBold',
            color: colors.text,
            marginBottom: 6,
          }}
        >
          Postal Code <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <TextInput
          style={inputStyle}
          placeholder="e.g. 7560"
          placeholderTextColor={colors.inputPlaceholder}
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
