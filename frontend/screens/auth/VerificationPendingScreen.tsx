import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'VerificationPending'>;

export default function VerificationPendingScreen({ route, navigation }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const {
    email,
    phone,
    firstName,
    emailSent = false,
    whatsappSent = false,
    expiryMinutes = 30,
  } = route.params || {};

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage('❌ Email not available');
      return;
    }

    setResendingEmail(true);
    setResendMessage('');

    try {
      const response = await fetch('http://localhost:8000/verify/resend?email=' + encodeURIComponent(email), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResendMessage('✅ Verification links resent! Check your email and WhatsApp.');
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        const error = await response.json();
        setResendMessage(`❌ Failed: ${error.detail || 'Could not resend verification'}`);
      }
    } catch (error) {
      setResendMessage('❌ Network error. Please check your connection.');
      console.error('Resend error:', error);
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📧</Text>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Complete registration to start using the app
        </Text>
      </View>

      {/* Main Message */}
      <View style={styles.mainMessage}>
        <Text style={styles.mainText}>
          Hi {firstName}! We've sent verification links to confirm it's really you.
        </Text>
      </View>

      {/* Verification Details Card */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>✉️</Text>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Email Verification</Text>
            <Text style={styles.detailValue}>{email}</Text>
            {emailSent ? (
              <Text style={styles.detailStatus}>✅ Email sent</Text>
            ) : (
              <Text style={styles.detailStatusWarning}>⚠️ Email not sent (check admin settings)</Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💬</Text>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>WhatsApp Verification</Text>
            <Text style={styles.detailValue}>{phone}</Text>
            {whatsappSent ? (
              <Text style={styles.detailStatus}>✅ WhatsApp sent</Text>
            ) : (
              <Text style={styles.detailStatusWarning}>⚠️ WhatsApp not sent (Twilio sandbox may require opt-in)</Text>
            )}
          </View>
        </View>
      </View>

      {/* Important Info */}
      <View style={styles.importantBox}>
        <Text style={styles.importantTitle}>⏰ Important Timeline</Text>
        <Text style={styles.importantText}>
          Your verification link will expire in <Text style={styles.bold}>{expiryMinutes} minutes</Text>
        </Text>
        <Text style={styles.importantText}>
          After expiry, your account will be automatically deleted and you'll need to register again.
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.stepsBox}>
        <Text style={styles.stepsTitle}>What to do next:</Text>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Check your email</Text>
            <Text style={styles.stepDescription}>
              Look for a message from the driving school with subject "Verify Your Driving School Account"
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Check WhatsApp</Text>
            <Text style={styles.stepDescription}>
              You'll also receive a WhatsApp message to {phone} with the verification link
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Click the verification link</Text>
            <Text style={styles.stepDescription}>
              Click on the link from either email or WhatsApp to verify your account
            </Text>
          </View>
        </View>

        <View style={styles.step}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Log in to the app</Text>
            <Text style={styles.stepDescription}>
              After verification is complete, you can log in and start using the app
            </Text>
          </View>
        </View>
      </View>

      {/* Resend Message */}
      {resendMessage && (
        <View
          style={[
            styles.resendMessage,
            resendMessage.includes('✅') ? styles.resendSuccess : styles.resendError,
          ]}
        >
          <Text style={styles.resendMessageText}>{resendMessage}</Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResendVerification}
          disabled={resendingEmail}
        >
          <Text style={styles.resendButtonText}>
            {resendingEmail ? '⏳ Resending...' : '🔄 Resend Verification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.loginButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Notes */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>📝 Important Notes:</Text>
        <Text style={styles.footerItem}>
          • You <Text style={styles.bold}>cannot log in</Text> until your account is verified
        </Text>
        <Text style={styles.footerItem}>
          • Verification links are valid for {expiryMinutes} minutes only
        </Text>
        <Text style={styles.footerItem}>
          • If the link expires, register again or use "Resend Verification"
        </Text>
        <Text style={styles.footerItem}>
          • Check your spam/junk folder if you don't see the email
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: Platform.OS === 'web' ? 40 : 20,
    paddingTop: Platform.OS === 'web' ? 40 : 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 32 : 24,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#666',
  },
  mainMessage: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 28 : 20,
  },
  mainText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#0056b3',
    fontWeight: '500',
    lineHeight: 22,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 24 : 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: Platform.OS === 'web' ? 28 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  detailIcon: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    marginTop: 4,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 6,
  },
  detailStatus: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#28a745',
    fontWeight: '500',
  },
  detailStatusWarning: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#ffc107',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: Platform.OS === 'web' ? 16 : 12,
  },
  importantBox: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 28 : 20,
  },
  importantTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  importantText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
  },
  stepsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 24 : 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: Platform.OS === 'web' ? 28 : 20,
  },
  stepsTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  step: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
  },
  stepNumber: {
    width: Platform.OS === 'web' ? 40 : 36,
    height: Platform.OS === 'web' ? 40 : 36,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#666',
    lineHeight: 18,
  },
  resendMessage: {
    padding: Platform.OS === 'web' ? 16 : 12,
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
  },
  resendSuccess: {
    backgroundColor: '#d4edda',
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  resendError: {
    backgroundColor: '#f8d7da',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  resendMessageText: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '500',
    color: '#333',
  },
  buttonContainer: {
    gap: Platform.OS === 'web' ? 12 : 8,
    marginBottom: Platform.OS === 'web' ? 28 : 20,
  },
  resendButton: {
    backgroundColor: '#28a745',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderRadius: 8,
  },
  footerTitle: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  footerItem: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
});
