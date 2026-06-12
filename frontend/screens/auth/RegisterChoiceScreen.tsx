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

function RegisterOptionCard({
  icon,
  title,
  description,
  backgroundColor,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  backgroundColor: string;
  onPress: () => void;
}) {
  return (
    <Card
      variant="elevated"
      padding="lg"
      onPress={onPress}
      style={[styles.optionCard, { backgroundColor }]}
    >
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </Card>
  );
}

export default function RegisterChoiceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const goStudent = () => navigation.navigate('RegisterStudent');
  const goInstructor = () => navigation.navigate('RegisterInstructor');
  const goCompany = () => navigation.navigate('RegisterCompany');
  const goLogin = () => navigation.navigate('Login');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Join as…</Text>

      <RegisterOptionCard
        icon="🎓"
        title="Student"
        description="Book driving lessons with certified instructors"
        backgroundColor={colors.primary}
        onPress={goStudent}
      />

      <RegisterOptionCard
        icon="🚗"
        title="Instructor"
        description="Offer driving lessons and manage your schedule"
        backgroundColor={colors.accent}
        onPress={goInstructor}
      />

      <RegisterOptionCard
        icon="🏢"
        title="Company"
        description="Register a driving school and onboard instructors"
        backgroundColor="#0F766E"
        onPress={goCompany}
      />

      <Pressable
        onPress={goLogin}
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
