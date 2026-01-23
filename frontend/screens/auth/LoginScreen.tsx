/**
 * Login Screen
 */
import * as SecureStore from 'expo-secure-store';
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
import InlineMessage from '../../components/InlineMessage';
import { API_CONFIG } from '../../config';
import ApiService from '../../services/api';

// Storage wrapper for web compatibility
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
};

export default function LoginScreen({ navigation, onAuthChange }: any) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoading(true);

    try {
      // Normalize phone number format for South African numbers
      let normalizedEmailOrPhone = emailOrPhone.trim();
      if (/^0\d{9}$/.test(normalizedEmailOrPhone)) {
        normalizedEmailOrPhone = '+27' + normalizedEmailOrPhone.substring(1);
      }

      // Try using fetch directly first to test connectivity
      console.log('Attempting fetch-based login...');
      const params = new URLSearchParams();
      params.append('username', normalizedEmailOrPhone);
      params.append('password', password);

      const fetchResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log('Fetch response status:', fetchResponse.status);
      const data = await fetchResponse.json();
      console.log('Fetch response data:', data);

      if (!fetchResponse.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Store token and continue with ApiService for other calls
      await ApiService.setAuthToken(data.access_token);

      // Get user info to determine role
      const user = await ApiService.getCurrentUser();

      // Store user role BEFORE triggering auth change
      await storage.setItem('user_role', user.role);

      // Trigger auth state update in App.tsx
      if (onAuthChange) {
        onAuthChange();
      }

      // Navigate based on user role
      if (user.role === 'admin') {
        navigation.replace('AdminDashboard');
      } else if (user.role === 'student') {
        navigation.replace('StudentHome');
      } else if (user.role === 'instructor') {
        navigation.replace('InstructorHome');
      }

      // REMOVED: window.location.reload() - causes navigation issues
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error detail:', error.response?.data?.detail);
      console.error('Error status:', error.response?.status);
      console.error('Error code:', error.code);
      console.error('Error request:', error.request);

      // More detailed error message for debugging
      let errorMessage = 'An error occurred during login';
      let statusCode = 'unknown';

      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.detail || error.response.statusText || 'Server error';
        statusCode = error.response.status;
      } else if (error.request) {
        // Request made but no response (network error)
        errorMessage = `Network error: ${error.message}. Check if backend is running and firewall allows port 8000.`;
        statusCode = 'network';
      } else {
        // Something else happened
        errorMessage = error.message;
      }

      console.error(`Showing error message: ${errorMessage} (${statusCode})`);

      setMessage({
        type: 'error',
        text: `Login Failed (${statusCode}): ${errorMessage}`,
      });
      setTimeout(() => setMessage(null), 8000); // Longer timeout for network errors
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driving School</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

      {/* Debug: Show API URL */}
      <View style={styles.debugBox}>
        <Text style={styles.debugText}>API: {API_CONFIG.BASE_URL}</Text>
        <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
        {Platform.OS === 'web' && typeof window !== 'undefined' && (
          <Text style={styles.debugText}>
            Page URL: {window.location.protocol}//{window.location.host}
          </Text>
        )}
        <TouchableOpacity
          onPress={async () => {
            try {
              const response = await fetch(`${API_CONFIG.BASE_URL}/docs`);
              const text = await response.text();
              alert(`Fetch test: ${response.status} - ${text.substring(0, 50)}`);
            } catch (err: any) {
              alert(`Fetch error: ${err.message}`);
            }
          }}
          style={{ marginTop: 5, padding: 5, backgroundColor: '#ddd' }}
        >
          <Text style={{ fontSize: 10 }}>Test Connection</Text>
        </TouchableOpacity>
      </View>

      {message && (
        <View style={{ marginBottom: 16 }}>
          <InlineMessage
            type={message.type}
            message={message.text}
            onDismiss={() => setMessage(null)}
            autoDismissMs={0}
          />
        </View>
      )}

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
        onPress={() => navigation.navigate('ForgotPassword' as never)}
        style={styles.forgotPasswordButton}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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
  forgotPasswordButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 8,
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  debugBox: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
