/**
 * Login Screen
 */
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
import ApiService from '../../services/api';

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
      // Convert local format (0611154598) to international format (+27611154598)
      let normalizedEmailOrPhone = emailOrPhone.trim();

      // Check if it's a phone number starting with 0 (South African local format)
      if (/^0\d{9}$/.test(normalizedEmailOrPhone)) {
        // Replace leading 0 with +27
        normalizedEmailOrPhone = '+27' + normalizedEmailOrPhone.substring(1);
      }

      await ApiService.login(normalizedEmailOrPhone, password);

      // Get user info to determine role
      const user = await ApiService.getCurrentUser();

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

      // On web, reload after setting up navigation (ensures proper state)
      if (Platform.OS === 'web') {
        setTimeout(() => window.location.reload(), 100);
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

      console.error(`Showing error message: ${errorMessage} (${statusCode})`);

      setMessage({
        type: 'error',
        text: `Login Failed (${statusCode}): ${errorMessage}`,
      });
      setTimeout(() => setMessage(null), 5000);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driving School</Text>
      <Text style={styles.subtitle}>Login to your account</Text>

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
