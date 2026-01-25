/**
 * Map Preview Component - Web
 * Uses Google Maps Static API
 */
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
}

export default function MapPreview({ latitude, longitude }: MapPreviewProps) {
  // Use OpenStreetMap for map display (free, no API key needed)
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <View style={styles.container}>
      <View style={styles.webMapContainer}>
        <iframe
          src={mapUrl}
          style={{ width: '100%', height: 250, border: 0 }}
          title="Pickup Location Map"
        />
      </View>

      <TouchableOpacity
        style={styles.openMapsButton}
        onPress={() => {
          const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          Linking.openURL(url);
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
  webMapContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
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
