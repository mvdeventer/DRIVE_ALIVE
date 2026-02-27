/**
 * Login Screen — RoadReady Modern UI
 */
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import { Button, Card, Input } from '../../components/ui';
import ThemedModal from '../../components/ui/Modal';
import { API_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

// Storage wrapper for web compatibility
// Web: HTTP-only cookies (no JS access)
// Native: SecureStore
const storage = {
  async getItem(key: string): Promise<string | null> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      return null;
    }
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    const isWeb = Platform?.OS === 'web';
    if (isWeb) {
      return;
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
};

export default function LoginScreen({ navigation, onAuthChange }: any) {
  const { colors, isDark } = useTheme();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ emailOrPhone?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [roleSelectionIsForceLogin, setRoleSelectionIsForceLogin] = useState(false);
  const [showForceLoginModal, setShowForceLoginModal] = useState(false);
  const [pendingForceLoginRole, setPendingForceLoginRole] = useState<string | undefined>(undefined);
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

  const buildLoginBody = (selectedRole?: string, forceLogin?: boolean) => {
    const params = new URLSearchParams();
    params.append('username', normalizeLoginIdentifier());
    params.append('password', password);
    if (selectedRole) {
      params.append('role', selectedRole);
    }
    if (forceLogin) {
      params.append('force_login', 'true');
    }
    return params.toString();
  };

  const fetchLoginResponse = async (body: string) => {
    const fetchResponse = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await fetchResponse.json();
    if (!fetchResponse.ok) {
      // `detail` may be a string or a structured object { message, error_code }
      const detailMsg =
        typeof data.detail === 'object' && data.detail !== null
          ? data.detail.message
          : data.detail;
      const errorCode =
        typeof data.detail === 'object' && data.detail !== null
          ? data.detail.error_code
          : undefined;
      const err: any = new Error(detailMsg || 'Login failed');
      err.httpStatus = fetchResponse.status;
      err.errorCode = errorCode;
      throw err;
    }

    return data;
  };

  const requestLogin = async (selectedRole?: string, forceLogin?: boolean) => {
    return fetchLoginResponse(buildLoginBody(selectedRole, forceLogin));
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

    // Trigger auth state change — the conditional navigator in App.tsx
    // will automatically switch from auth screens to the MainTabs navigator
    if (onAuthChange) {
      console.log('[LoginScreen] Calling onAuthChange to switch navigator');
      await onAuthChange();
    }
  };

  const performLogin = async (selectedRole?: string) => {
    const errors: { emailOrPhone?: string; password?: string } = {};
    if (!emailOrPhone) errors.emailOrPhone = 'Email or phone is required';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setFieldErrors({});

    try {
      setLoading(true);
      console.log('[LoginScreen] performLogin called with selectedRole:', selectedRole);

      const data = await requestLogin(selectedRole);
      console.log('[LoginScreen] Login response:', data);

      if (data.requires_role_selection && Array.isArray(data.available_roles)) {
        console.log('[LoginScreen] Role selection required:', data.available_roles);
        setRoleOptions(data.available_roles);
        setRoleSelectionIsForceLogin(false);
        setShowRoleModal(true);
        return;
      }

      // Pass both access_token AND role from login response to finalizeLogin
      console.log('[LoginScreen] Calling finalizeLogin with role:', data.role);
      await finalizeLogin(data.access_token, data.role);
    } catch (error: any) {
      console.error('Login error:', error);

      // ── Single-session conflict ────────────────────────────────────────────
      if (error.httpStatus === 409 || error.errorCode === 'ALREADY_LOGGED_IN') {
        setPendingForceLoginRole(selectedRole);
        setShowForceLoginModal(true);
        return;
      }
      // ───────────────────────────────────────────────────────────────────────

      // More detailed error message for debugging
      let errorMessage = 'An error occurred during login';
      let statusCode = error.httpStatus ?? 'unknown';

      if (error.response) {
        errorMessage = error.response.data?.detail || error.response.statusText || 'Server error';
        statusCode = error.response.status;
      } else if (error.request) {
        errorMessage = `Network error: ${error.message}. Check if backend is running and firewall allows port 8000.`;
        statusCode = 'network';
      } else {
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
    if (roleSelectionIsForceLogin) {
      // This role selection is part of a force-login flow — pass force_login=true
      setRoleSelectionIsForceLogin(false);
      const errors: { emailOrPhone?: string; password?: string } = {};
      if (!emailOrPhone) errors.emailOrPhone = 'Email or phone is required';
      if (!password) errors.password = 'Password is required';
      if (Object.keys(errors).length > 0) return;
      try {
        setLoading(true);
        const data = await requestLogin(role, true /* forceLogin */);
        await finalizeLogin(data.access_token, data.role);
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Force login failed' });
        setTimeout(() => setMessage(null), 8000);
      } finally {
        setLoading(false);
      }
    } else {
      await performLogin(role);
    }
  };

  const handleForceLogin = async () => {
    setShowForceLoginModal(false);
    const role = pendingForceLoginRole;
    setPendingForceLoginRole(undefined);
    // Re-run login with force_login=true to override the other session
    const errors: { emailOrPhone?: string; password?: string } = {};
    if (!emailOrPhone) errors.emailOrPhone = 'Email or phone is required';
    if (!password) errors.password = 'Password is required';
    if (Object.keys(errors).length > 0) return;
    try {
      setLoading(true);
      const data = await requestLogin(role, true /* forceLogin */);
      if (data.requires_role_selection && Array.isArray(data.available_roles)) {
        setRoleOptions(data.available_roles);
        setRoleSelectionIsForceLogin(true); // keep force context for role selection
        setShowRoleModal(true);
        return;
      }
      await finalizeLogin(data.access_token, data.role);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Force login failed' });
      setTimeout(() => setMessage(null), 8000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandArea}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '15' }]}>
            <Text style={styles.logoEmoji}>🚗</Text>
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>RoadReady</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Login to your account
          </Text>
        </View>

        {/* Login Card */}
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          {message && (
            <View style={styles.messageWrap}>
              <InlineMessage
                type={message.type}
                message={message.text}
                onDismiss={() => setMessage(null)}
                autoDismissMs={0}
              />
            </View>
          )}

          <Input
            label="Email or Phone"
            placeholder="Email or phone number"
            value={emailOrPhone}
            onChangeText={(text) => { setEmailOrPhone(text); setFieldErrors(prev => ({ ...prev, emailOrPhone: undefined })); }}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleLogin}
            returnKeyType="next"
            keyboardType="email-address"
            error={fieldErrors.emailOrPhone}
          />

          <View style={styles.passwordRow}>
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text) => { setPassword(text); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
              secureTextEntry={!showPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
              error={fieldErrors.password}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.togglePassword}
              hitSlop={8}
            >
              <Text style={[styles.toggleText, { color: colors.primary }]}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword' as never)}
            style={styles.forgotLink}
          >
            <Text style={[styles.forgotText, { color: colors.textSecondary }]}>
              Forgot password?
            </Text>
          </Pressable>

          <Button
            label="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
          />
        </Card>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerLabel, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('RegisterChoice')} style={{ padding: 8 }}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Register</Text>
          </Pressable>
        </View>

        {/* Debug Box (dev only) */}
        {__DEV__ && (
          <View style={[styles.debugBox, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.debugText, { color: colors.textTertiary }]}>
              API: {API_CONFIG.BASE_URL} | {Platform.OS}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Role Selection Modal */}
      <ThemedModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Select Profile"
        subtitle="This account has multiple profiles. Choose which one to use."
        size="sm"
      >
        {roleOptions.map(role => (
          <Pressable
            key={role}
            onPress={() => handleRoleSelect(role)}
            style={({ pressed }) => [
              styles.roleOption,
              {
                backgroundColor: pressed
                  ? colors.primary + '20'
                  : colors.primary + '10',
                borderColor: colors.primary + '30',
              },
            ]}
          >
            <Text style={[styles.roleOptionText, { color: colors.primary }]}>
              {getRoleLabel(role)}
            </Text>
          </Pressable>
        ))}

        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => setShowRoleModal(false)}
          fullWidth
          style={{ marginTop: 4 }}
        />
      </ThemedModal>

      {/* Force Login Modal — shown when the account is already active elsewhere */}
      <ThemedModal
        visible={showForceLoginModal}
        onClose={() => setShowForceLoginModal(false)}
        title="Already Logged In"
        subtitle="This account is already logged in from another device or browser. You can force-end that session and log in here instead."
        size="sm"
      >
        <Button
          label="Force Login (End Other Session)"
          onPress={handleForceLogin}
          fullWidth
          style={{ marginBottom: 10 }}
        />
        <Button
          label="Cancel"
          variant="ghost"
          onPress={() => { setShowForceLoginModal(false); setPendingForceLoginRole(undefined); }}
          fullWidth
        />
      </ThemedModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? '20%' : 24,
    paddingVertical: 40,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: Platform.OS === 'web' ? 80 : 68,
    height: Platform.OS === 'web' ? 80 : 68,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: Platform.OS === 'web' ? 40 : 34,
  },
  appName: {
    fontSize: Platform.OS === 'web' ? 34 : 28,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  formCard: {
    marginBottom: 20,
  },
  messageWrap: {
    marginBottom: 12,
  },
  passwordRow: {
    position: 'relative',
  },
  togglePassword: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
    padding: 6,
  },
  forgotText: {
    fontSize: 13,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  registerLabel: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
  },
  registerLink: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
  debugBox: {
    marginTop: 24,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  roleOption: {
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  roleOptionText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
