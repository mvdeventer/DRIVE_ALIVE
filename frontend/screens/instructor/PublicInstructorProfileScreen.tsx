import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { RouteProp, useRoute } from '@react-navigation/native';

import ApiService from '../../services/api';

interface InstructorProfile {
  id: number;
  first_name: string;
  last_name: string;
  bio: string | null;
  rating: number;
  total_reviews: number;
  hourly_rate: number;
  province: string | null;
  city: string | null;
  suburb: string | null;
  is_verified: boolean;
  vehicle_make: string | null;
  vehicle_model: string | null;
  service_radius_km: number;
}

/** Set web <title> and <meta> tags for SEO without any extra library. */
function setWebMeta(title: string, description: string, url: string): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  document.title = title;

  const setMeta = (attr: string, value: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${value}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, value);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', 'profile');
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:card', 'summary');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
}

function resetWebMeta(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.title = 'RoadReady';
}

// Reached both by navigating within the app and by opening the public URL
// /instructors/:instructorId, so the parameter arrives as a number in the
// first case and as a string in the second. It is only ever interpolated
// into a request path, so both are fine — but the type has to admit it.
type PublicProfileRoute = RouteProp<
  { PublicInstructorProfile: { instructorId: string | number } },
  'PublicInstructorProfile'
>;

export default function PublicInstructorProfileScreen() {
  // Taken from the hook rather than a prop: a hand-written prop type is not
  // assignable to what the navigator expects of a screen component.
  const route = useRoute<PublicProfileRoute>();
  const { instructorId } = route.params;
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiService.get<InstructorProfile>(`/instructors/${instructorId}`)
      // The payload is in `.data`; the resolved value is the whole response.
      // Reading it directly made every field undefined, so building the page
      // title threw and the catch below reported the instructor as missing.
      .then(({ data }) => {
        setInstructor(data);
        const name = `${data.first_name} ${data.last_name}`;
        const location = [data.suburb, data.city, data.province].filter(Boolean).join(', ');
        const title = `${name} — Driving Instructor${location ? ` in ${location}` : ''} | RoadReady`;
        const description =
          data.bio ||
          `${name} is a ${data.is_verified ? 'verified' : ''} driving instructor${location ? ` in ${location}` : ''} with a rating of ${data.rating.toFixed(1)}/5 from ${data.total_reviews} reviews.`;
        const url = typeof window !== 'undefined' ? window.location.href : '';
        setWebMeta(title, description.slice(0, 160), url);
      })
      .catch(() => setError('Instructor not found.'))
      .finally(() => setLoading(false));

    return () => resetWebMeta();
  }, [instructorId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (error || !instructor) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Instructor not found.'}</Text>
      </View>
    );
  }

  const fullName = `${instructor.first_name} ${instructor.last_name}`;
  const location = [instructor.suburb, instructor.city, instructor.province].filter(Boolean).join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{fullName}</Text>
        {instructor.is_verified && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ Verified</Text>
          </View>
        )}
        {location ? <Text style={styles.location}>{location}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{instructor.rating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{instructor.total_reviews}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>R{instructor.hourly_rate}/hr</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{instructor.service_radius_km} km</Text>
          <Text style={styles.statLabel}>Service area</Text>
        </View>
      </View>

      {instructor.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bio}>{instructor.bio}</Text>
        </View>
      ) : null}

      {(instructor.vehicle_make || instructor.vehicle_model) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>
          <Text style={styles.vehicle}>
            {[instructor.vehicle_make, instructor.vehicle_model].filter(Boolean).join(' ')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16 },
  header: { marginBottom: 24, alignItems: 'center' },
  name: { fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'center' },
  badge: {
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: '#065F46', fontWeight: '600', fontSize: 14 },
  location: { marginTop: 6, color: '#6B7280', fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0D9488' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  bio: { fontSize: 15, color: '#374151', lineHeight: 22 },
  vehicle: { fontSize: 15, color: '#374151' },
});
