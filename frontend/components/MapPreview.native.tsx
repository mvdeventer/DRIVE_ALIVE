/**
 * Map Preview Component - Native (iOS/Android)
 * Uses react-native-maps for interactive map
 */
import React from 'react';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
}

export default function MapPreview({ latitude, longitude }: MapPreviewProps) {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title="Pickup Location"
          description={`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
          pinColor="red"
        />
      </MapView>

      <TouchableOpacity
        style={styles.openMapsButton}
        onPress={() => {
          const url = Platform.select({
            ios: `maps://app?daddr=${latitude},${longitude}`,
            android: `google.navigation:q=${latitude},${longitude}`,
          });
          Linking.openURL(url!);
        }}
      >
        <Text style={styles.openMapsButtonText}>🗺️ Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  map: {
    width: '100%',
    height: 250,
  },
  openMapsButton: {
    backgroundColor: '#34A853',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openMapsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
