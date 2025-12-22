/**
 * Login Screen
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/api';

export default function LoginScreen({ navigation, onAuthChange }: any) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      await ApiService.login(emailOrPhone, password);

      // On web, reload the page to trigger App.tsx to re-check auth
      if (Platform.OS === 'web') {
        window.location.reload();
      } else {
        // Trigger auth state update in App.tsx
        if (onAuthChange) {
          onAuthChange();
        }

        // Navigate based on user role
        const user = await ApiService.getCurrentUser();
        if (user.role === 'student') {
          navigation.replace('StudentHome');
        } else if (user.role === 'instructor') {
          navigation.replace('InstructorHome');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error detail:', error.response?.data?.detail);
      console.error('Error status:', error.response?.status);

      // Debug: Show full error structure
      const errorMessage =
        error.response?.data?.detail || error.message || 'An error occurred during login';
      const statusCode = error.response?.status || 'unknown';

      console.error(`Showing alert: ${errorMessage} (${statusCode})`);

      if (Platform.OS === 'web') {
        alert(
          `Login Failed (${statusCode})\n\n${errorMessage}\n\nCheck browser console for details`
        );
      } else {
        Alert.alert('Login Failed', `${errorMessage}\n\nStatus: ${statusCode}`);
      }
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driving School</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email or Phone Number"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={handleLogin}
        returnKeyType="next"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleLogin}
        returnKeyType="go"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('RegisterChoice')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>Don't have an account? Register</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
