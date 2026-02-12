/**
 * Register Choice Screen — Choose between Student and Instructor
 */
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';

export default function RegisterChoiceScreen({ navigation }: any) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Join as…</Text>

      <Card
        variant="elevated"
        padding="lg"
        onPress={() => navigation.navigate('RegisterStudent')}
        style={[styles.optionCard, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.cardIcon}>🎓</Text>
        <Text style={styles.optionTitle}>Student</Text>
        <Text style={styles.optionDescription}>
          Book driving lessons with certified instructors
        </Text>
      </Card>

      <Card
        variant="elevated"
        padding="lg"
        onPress={() => navigation.navigate('RegisterInstructor')}
        style={[styles.optionCard, { backgroundColor: colors.accent }]}
      >
        <Text style={styles.cardIcon}>🚗</Text>
        <Text style={styles.optionTitle}>Instructor</Text>
        <Text style={styles.optionDescription}>
          Offer driving lessons and manage your schedule
        </Text>
      </Card>

      <Pressable
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        <Text style={[styles.linkLabel, { color: colors.textSecondary }]}>
          Already have an account?{' '}
        </Text>
        <Text style={[styles.linkAction, { color: colors.primary }]}>Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Platform.OS === 'web' ? 40 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 30 : 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 36,
    letterSpacing: -0.5,
  },
  optionCard: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: Platform.OS === 'web' ? 44 : 38,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  linkButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
  },
  linkAction: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
});
