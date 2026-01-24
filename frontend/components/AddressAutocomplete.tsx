/**
 * Address Input Component - Structured Fields
 * Users enter address details in separate labeled fields
 */
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  style,
}: AddressAutocompleteProps) {
  // Parse existing address value into separate fields
  const lines = value.split('\n').filter(line => line.trim());
  const [streetAddress, setStreetAddress] = React.useState(lines[0] || '');
  const [suburb, setSuburb] = React.useState(lines[1] || '');
  const [city, setCity] = React.useState(lines[2] || '');
  const [postalCode, setPostalCode] = React.useState(lines[3] || '');

  // Update parent when any field changes
  const updateAddress = (street: string, sub: string, cty: string, postal: string) => {
    const parts = [street, sub, cty, postal].filter(p => p.trim());
    onChangeText(parts.join('\n'));
  };

  return (
    <View style={[styles.container, style]}>
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
