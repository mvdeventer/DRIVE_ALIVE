// Placeholder - To be implemented in Phase 2
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WebNavigationHeader from '../../components/WebNavigationHeader';

export default function PaymentScreen({ navigation: navProp }: any) {
  const navigation = navProp || useNavigation();

  return (
    <View style={styles.container}>
      <WebNavigationHeader
        title="Payment"
        onBack={() => navigation.goBack()}
        showBackButton={true}
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>Payment Screen - Coming Soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: '#666',
  },
});
