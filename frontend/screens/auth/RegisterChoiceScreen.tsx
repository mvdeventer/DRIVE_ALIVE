/**
 * Register Choice Screen - Choose between Student and Instructor
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

export default function RegisterChoiceScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join as...</Text>

      <TouchableOpacity
        style={[styles.optionCard, { backgroundColor: '#007AFF' }]}
        onPress={() => navigation.navigate('RegisterStudent')}
      >
        <Text style={styles.optionTitle}>Student</Text>
        <Text style={styles.optionDescription}>
          Book driving lessons with certified instructors
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionCard, { backgroundColor: '#34C759' }]}
        onPress={() => navigation.navigate('RegisterInstructor')}
      >
        <Text style={styles.optionTitle}>Instructor</Text>
        <Text style={styles.optionDescription}>
          Offer driving lessons and manage your schedule
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#333',
  },
  optionCard: {
    padding: 30,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  optionDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
