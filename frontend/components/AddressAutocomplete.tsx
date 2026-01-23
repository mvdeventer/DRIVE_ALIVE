/**
 * Address Autocomplete Component - OpenCage Geocoding API
 * Free tier: 2,500 requests/day (more accurate than Nominatim)
 * Aggregates 20+ data sources: Google, Bing, OSM, TomTom, etc.
 * Sign up: https://opencagedata.com/users/sign_up
 */
import React, { useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { OPENCAGE_API_KEY } from '../config';

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  placeholder = 'Start typing your address...',
  style,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = React.useState<any[]>([]);
  const [showPredictions, setShowPredictions] = React.useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  const searchPlaces = async (input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      // OpenCage Geocoding API - Better accuracy than Nominatim
      // Aggregates 20+ data sources (Google, Bing, OSM, TomTom, etc.)
      const searchQuery = input.trim();

      // Build OpenCage API request
      const params = new URLSearchParams({
        q: searchQuery,
        countrycode: 'za', // South Africa only
        limit: '10',
        no_annotations: '1', // Skip extra data we don't need
        language: 'en',
        key: OPENCAGE_API_KEY,
      });

      // If input looks like it has a suburb/area name, add bounds for Cape Town
      if (
        searchQuery.toLowerCase().includes('brackenfell') ||
        searchQuery.toLowerCase().includes('kraaifontein') ||
        searchQuery.toLowerCase().includes('cape town')
      ) {
        // Cape Town bounding box (lon_min,lat_min,lon_max,lat_max)
        params.append('bounds', '18.3,-34.0,18.9,-33.7');
      }

      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?${params.toString()}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Sort results by confidence (OpenCage provides confidence scores)
        const sorted = data.results.sort((a: any, b: any) => {
          return (b.confidence || 0) - (a.confidence || 0);
        });

        setPredictions(sorted);
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
      console.error('Make sure OPENCAGE_API_KEY is set in config.ts');
    }
  };

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchPlaces(text);
    }, 500); // 500ms debounce for free service
  };

  const handleSelectPrediction = (prediction: any) => {
    // OpenCage provides a formatted address string
    const fullAddress = prediction.formatted;

    onChangeText(fullAddress);
    setShowPredictions(false);
    setPredictions([]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[styles.input, style]}
        placeholder={placeholder}
        value={value}
        onChangeText={handleTextChange}
        multiline
        numberOfLines={3}
      />

      {/* Use Modal for web to escape scroll container */}
      {Platform.OS === 'web' && showPredictions && predictions.length > 0 ? (
        <View style={styles.predictionsContainer}>
          {predictions.map((prediction, index) => {
            // OpenCage format: components object with structured address data
            const components = prediction.components || {};
            const houseNumber = components.house_number || '';
            const road = components.road || components.street || '';
            const suburb =
              components.suburb || components.neighbourhood || components.village || '';
            const city = components.city || components.town || '';

            // Main line: house number + road, or suburb if no road
            const mainLine = [houseNumber, road].filter(Boolean).join(' ') || suburb || 'Address';
            // Secondary line: suburb + city, or full formatted address
            const secondaryLine = [suburb, city].filter(Boolean).join(', ') || prediction.formatted;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.predictionItem,
                  index === predictions.length - 1 && styles.predictionItemLast,
                ]}
                onPress={() => handleSelectPrediction(prediction)}
              >
                <Text style={styles.predictionMain}>{mainLine}</Text>
                <Text style={styles.predictionSecondary} numberOfLines={2}>
                  {secondaryLine}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : showPredictions && predictions.length > 0 ? (
        <ScrollView style={styles.predictionsContainer} nestedScrollEnabled>
          {predictions.map((prediction, index) => {
            // OpenCage format: components object with structured address data
            const components = prediction.components || {};
            const houseNumber = components.house_number || '';
            const road = components.road || components.street || '';
            const suburb =
              components.suburb || components.neighbourhood || components.village || '';
            const city = components.city || components.town || '';

            // Main line: house number + road, or suburb if no road
            const mainLine = [houseNumber, road].filter(Boolean).join(' ') || suburb || 'Address';
            // Secondary line: suburb + city, or full formatted address
            const secondaryLine = [suburb, city].filter(Boolean).join(', ') || prediction.formatted;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.predictionItem,
                  index === predictions.length - 1 && styles.predictionItemLast,
                ]}
                onPress={() => handleSelectPrediction(prediction)}
              >
                <Text style={styles.predictionMain}>{mainLine}</Text>
                <Text style={styles.predictionSecondary} numberOfLines={2}>
                  {secondaryLine}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 85,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    maxHeight: 250,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.25)',
          zIndex: 999999,
        }
      : {
          elevation: 15,
          zIndex: 999999,
        }),
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
  },
  predictionItemLast: {
    borderBottomWidth: 0,
  },
  predictionMain: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  predictionSecondary: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
