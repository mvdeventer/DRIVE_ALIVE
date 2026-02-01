/**
 * Login Screen
 */
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
// Using sessionStorage on web (clears when browser/tab closes)
const storage = {
  async getItem(key: string): Promise<string | null> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      return sessionStorage.getItem(key); // Changed from localStorage
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      sessionStorage.setItem(key, value); // Changed from localStorage
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
};

export default function LoginScreen({ navigation, onAuthChange }: any) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Admin Profile';
    if (role === 'instructor') return 'Instructor Profile';
    if (role === 'student') return 'Student Profile';
    return role;
  };

  const normalizeLoginIdentifier = () => {
    let normalizedEmailOrPhone = emailOrPhone.trim();
    if (/^0\d{9}$/.test(normalizedEmailOrPhone)) {
      normalizedEmailOrPhone = '+27' + normalizedEmailOrPhone.substring(1);
    }
    return normalizedEmailOrPhone;
  };

  const buildLoginBody = (selectedRole?: string) => {
    const params = new URLSearchParams();
    params.append('username', normalizeLoginIdentifier());
    params.append('password', password);
    if (selectedRole) {
      params.append('role', selectedRole);
    }
    return params.toString();
  };

  const fetchLoginResponse = async (body: string) => {
    const fetchResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await fetchResponse.json();
    if (!fetchResponse.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    return data;
  };

  const requestLogin = async (selectedRole?: string) => {
    return fetchLoginResponse(buildLoginBody(selectedRole));
  };

  const finalizeLogin = async (accessToken: string, role?: string) => {
    console.log('[LoginScreen] finalizeLogin called with role:', role);
    await ApiService.setAuthToken(accessToken);
    console.log('[LoginScreen] Auth token set in ApiService');

    // Use role from login response if provided, otherwise fetch from /auth/me
    let userRole = role;
    if (!userRole) {
      console.log('[LoginScreen] No role provided, fetching from /auth/me');
      const user = await ApiService.getCurrentUser();
      userRole = user.role;
      console.log('[LoginScreen] Fetched role from /auth/me:', userRole);
    }
    
    console.log('[LoginScreen] Storing user_role in AsyncStorage:', userRole);
    await storage.setItem('user_role', userRole);

    if (onAuthChange) {
      onAuthChange();
    }

    console.log('[LoginScreen] Navigating based on role:', userRole);
    if (userRole === 'admin') {
      navigation.replace('AdminDashboard');
    } else if (userRole === 'student') {
      navigation.replace('StudentHome');
    } else if (userRole === 'instructor') {
      navigation.replace('InstructorHome');
    }
  };

  const performLogin = async (selectedRole?: string) => {
    if (!emailOrPhone || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setLoading(true);
      console.log('[LoginScreen] performLogin called with selectedRole:', selectedRole);

      const data = await requestLogin(selectedRole);
      console.log('[LoginScreen] Login response:', data);

      if (data.requires_role_selection && Array.isArray(data.available_roles)) {
        console.log('[LoginScreen] Role selection required:', data.available_roles);
        setRoleOptions(data.available_roles);
        setShowRoleModal(true);
        return;
      }

      // Pass both access_token AND role from login response to finalizeLogin
      console.log('[LoginScreen] Calling finalizeLogin with role:', data.role);
      await finalizeLogin(data.access_token, data.role);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    await performLogin();
  };

  const handleRoleSelect = async (role: string) => {
    setShowRoleModal(false);
    await performLogin(role);
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

      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Profile</Text>
            <Text style={styles.modalSubtitle}>
              This account has multiple profiles. Choose which one to use.
            </Text>

            {roleOptions.map(role => (
              <TouchableOpacity
                key={role}
                style={styles.roleOption}
                onPress={() => handleRoleSelect(role)}
              >
                <Text style={styles.roleOptionText}>{getRoleLabel(role)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
        secureTextEntry={!showPassword}
        onSubmitEditing={handleLogin}
        returnKeyType="go"
      />

      <TouchableOpacity
        style={styles.showPasswordButton}
        onPress={() => setShowPassword(!showPassword)}
      >
        <Text style={styles.showPasswordText}>
          {showPassword ? '🙈 Hide Password' : '👁️ Show Password'}
        </Text>
      </TouchableOpacity>

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
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
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
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: 'bold',
  },
  showPasswordButton: {
    marginBottom: 15,
    padding: 8,
    alignItems: 'center',
  },
  showPasswordText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: Platform.OS === 'web' ? 16 : 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 32 : 24,
    width: Platform.OS === 'web' ? '45%' : '92%',
    maxWidth: 550,
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  roleOption: {
    backgroundColor: '#F0F6FF',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  roleOptionText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#0057D9',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancelButton: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F3F5',
  },
  modalCancelText: {
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
  },
});
