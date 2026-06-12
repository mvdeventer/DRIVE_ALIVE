/**
 * Company Registration Entry Screen
 * Collects a driving school name and routes to instructor registration
 * with company creation pre-selected.
 */
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';

export default function RegisterCompanyScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setError('Company name is required');
      return;
    }

    setError('');
    navigation.navigate('RegisterInstructor', {
      presetCompanyChoice: 'create',
      presetCompanyName: trimmed,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Register Your Driving School</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}> 
        Create your school profile first, then complete instructor owner registration.
      </Text>

      <Card
        variant="outlined"
        padding="lg"
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Driving School Name</Text>
        <TextInput
          value={companyName}
          onChangeText={(text) => {
            setCompanyName(text);
            if (error) setError('');
          }}
          placeholder="e.g., RoadReady Driving Academy"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: error ? colors.danger : colors.border,
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
        />
        {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        <Pressable
          onPress={handleContinue}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.primaryButtonText}>Continue as Company Owner</Text>
        </Pressable>
      </Card>

      <Pressable onPress={() => navigation.navigate('RegisterChoice')} style={styles.linkButton}>
        <Text style={[styles.linkText, { color: colors.textSecondary }]}>Back to account type</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 40 : 24,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    textAlign: 'center',
    maxWidth: 560,
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    width: '100%',
    maxWidth: 520,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: {
    marginTop: 8,
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 18,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
