/**
 * Payment Cancel Screen - Shows when user cancels PayFast payment
 */
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';

export default function PaymentCancelScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const handleRetry = () => {
    navigation.goBack(); // Go back to payment screen
  };

  const handleGoHome = () => {
    // Navigate to Main tabs — resolves to the user's role-specific home
    navigation.navigate('Main' as never);
  };

  React.useEffect(() => {
    // Clean up payment session ID
    if (Platform.OS === 'web') {
      localStorage.removeItem('payment_session_id');
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>❌</Text>
        <Text style={[styles.title, { color: colors.danger }]}>Payment Cancelled</Text>
        <Text style={[styles.text, { color: colors.text }]}>
          You cancelled the payment. No charges were made to your account.
        </Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          Your lesson booking was not completed. You can try again or return to home.
        </Text>

        <Button variant="primary" onPress={handleRetry} fullWidth style={{ marginBottom: 12 }}>
          Try Again
        </Button>

        <Button variant="outline" onPress={handleGoHome} fullWidth>
          Return to Home
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 32,
  },
});
