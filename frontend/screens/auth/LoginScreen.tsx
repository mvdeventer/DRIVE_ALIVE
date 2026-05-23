/**
 * Login Screen — RoadReady Modern UI
 * Animated Road Hero + rotating tagline + live stats ticker
 */
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import InlineMessage from '../../components/InlineMessage';
import { Button, Card, Input } from '../../components/ui';
import ThemedModal from '../../components/ui/Modal';
import { API_CONFIG } from '../../config';
import ApiService from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

// ─── Rotating tagline content ─────────────────────────────────────────────
const TAGLINES = [
  'Learn to drive with confidence.',
  'Book instructors near you in seconds.',
  'Track every lesson — pass every test.',
  'Your K53 journey, all in one app.',
];

// ─── Animated Road Hero (story: meet → drive → arrive → graduate) ───────
function RoadHero({ heroHeight }: { heroHeight: number }) {
  const progress = useRef(new Animated.Value(0)).current; // 0 → 1 over 14s
  const carBob = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const runProgress = () => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !cancelled) runProgress();
      });
    };
    runProgress();

    Animated.loop(
      Animated.sequence([
        Animated.timing(carBob, { toValue: -2, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(carBob, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();

    return () => {
      cancelled = true;
      progress.stopAnimation();
      carBob.stopAnimation();
    };
  }, [progress, carBob]);

  // Story timeline (progress 0..1):
  //   0.00-0.16  student + instructor walk in
  //   0.16-0.22  meet & wave
  //   0.22-0.30  enter car (people fade, car appears)
  //   0.30-0.78  car drives — hills, traffic light, stop sign, zebra, oncoming car
  //   0.78-0.84  arrival sparkle at flag
  //   0.84-0.90  car fades, student + instructor re-appear at finish
  //   0.90-1.00  instructor hands certificate → grad cap appears → "Certified!"
  const centerX = w / 2;
  const carStart = w * 0.18;
  const carEnd = w * 0.78;
  const finishStudentX = w - 110;
  const finishInstructorX = w - 60;

  // People (walk-in phase)
  const studentX = progress.interpolate({
    inputRange: [0, 0.16, 0.22, 0.30],
    outputRange: [-80, centerX - 55, centerX - 55, centerX - 25],
    extrapolate: 'clamp',
  });
  const instructorX = progress.interpolate({
    inputRange: [0, 0.16, 0.22, 0.30],
    outputRange: [w + 80, centerX + 15, centerX + 15, centerX - 5],
    extrapolate: 'clamp',
  });
  const peopleOpacity = progress.interpolate({
    inputRange: [0, 0.05, 0.27, 0.32],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const waveOpacity = progress.interpolate({
    inputRange: [0.15, 0.18, 0.22, 0.25],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const waveBounce = progress.interpolate({
    inputRange: [0.16, 0.20, 0.24],
    outputRange: [0, -10, 0],
    extrapolate: 'clamp',
  });

  // Car (drive phase)
  const carOpacity = progress.interpolate({
    inputRange: [0.28, 0.32, 0.83, 0.86],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const carX = progress.interpolate({
    inputRange: [0, 0.30, 0.78, 1],
    outputRange: [carStart, carStart, carEnd, carEnd],
    extrapolate: 'clamp',
  });
  // Hills — car rises/falls along the route
  const carHill = progress.interpolate({
    inputRange: [0.30, 0.40, 0.50, 0.60, 0.70, 0.78],
    outputRange: [0, -10, 6, -12, 8, 0],
    extrapolate: 'clamp',
  });

  // Scenery + road scroll (only during drive phase)
  const sceneryX = progress.interpolate({
    inputRange: [0, 0.30, 0.78, 1],
    outputRange: [0, 0, -w * 1.6, -w * 1.6],
    extrapolate: 'clamp',
  });
  const stripeX = progress.interpolate({
    inputRange: [0, 0.30, 0.78, 1],
    outputRange: [0, 0, -w * 2.2, -w * 2.2],
    extrapolate: 'clamp',
  });

  // Oncoming car (passes once during the drive)
  const oncomingX = progress.interpolate({
    inputRange: [0.45, 0.58],
    outputRange: [w + 60, -100],
    extrapolate: 'clamp',
  });
  const oncomingOpacity = progress.interpolate({
    inputRange: [0.44, 0.46, 0.57, 0.59],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });

  // Arrival sparkle
  const sparkleOpacity = progress.interpolate({
    inputRange: [0.77, 0.80, 0.84],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const sparkleScale = progress.interpolate({
    inputRange: [0.77, 0.82],
    outputRange: [0.5, 1.4],
    extrapolate: 'clamp',
  });

  // Graduation scene — people reappear at finish line
  const finalPeopleOpacity = progress.interpolate({
    inputRange: [0.83, 0.88, 1],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });
  const finalStudentX = progress.interpolate({
    inputRange: [0.83, 0.88],
    outputRange: [finishStudentX - 30, finishStudentX],
    extrapolate: 'clamp',
  });
  const finalInstructorX = progress.interpolate({
    inputRange: [0.83, 0.88],
    outputRange: [finishInstructorX + 30, finishInstructorX],
    extrapolate: 'clamp',
  });

  // Certificate hand-off: starts at instructor, slides to student
  const certX = progress.interpolate({
    inputRange: [0.90, 0.96],
    outputRange: [finishInstructorX - 4, finishStudentX + 14],
    extrapolate: 'clamp',
  });
  const certOpacity = progress.interpolate({
    inputRange: [0.88, 0.91, 0.99, 1],
    outputRange: [0, 1, 1, 1],
    extrapolate: 'clamp',
  });
  const certLift = progress.interpolate({
    inputRange: [0.88, 0.93, 0.96],
    outputRange: [0, -14, 0],
    extrapolate: 'clamp',
  });
  // Grad cap pops above student
  const capOpacity = progress.interpolate({
    inputRange: [0.95, 0.98],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const capScale = progress.interpolate({
    inputRange: [0.95, 1],
    outputRange: [0.4, 1.2],
    extrapolate: 'clamp',
  });
  const certifiedOpacity = progress.interpolate({
    inputRange: [0.96, 0.99],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Dashed road stripes (horizontal) — tile twice for seamless scroll
  const stripeCount = Math.max(8, Math.ceil(w / 40) + 2);
  const stripes = Array.from({ length: stripeCount * 2 });

  // Scenery items (positions are factors of width; >1 = second tile)
  const sceneryItems = [
    { kind: 'tree', x: 0.08, size: 24, color: '#0E5C49' },
    { kind: 'tree', x: 0.18, size: 30, color: '#0E7A60' },
    { kind: 'hill', x: 0.25, size: 80, color: 'rgba(14,92,73,0.4)' },
    { kind: 'cone', x: 0.34, size: 22 },
    { kind: 'tree', x: 0.42, size: 26, color: '#0E5C49' },
    { kind: 'trafficLight', x: 0.50 },
    { kind: 'tree', x: 0.60, size: 22, color: '#0E7A60' },
    { kind: 'building', x: 0.68, size: 30 },
    { kind: 'stopSign', x: 0.78 },
    { kind: 'tree', x: 0.88, size: 28, color: '#0E5C49' },
    { kind: 'hill', x: 0.95, size: 90, color: 'rgba(14,92,73,0.35)' },
    // Second tile (x + 1.0)
    { kind: 'tree', x: 1.08, size: 24, color: '#0E5C49' },
    { kind: 'cone', x: 1.20, size: 22 },
    { kind: 'tree', x: 1.32, size: 30, color: '#0E7A60' },
    { kind: 'trafficLight', x: 1.45 },
    { kind: 'building', x: 1.58, size: 30 },
    { kind: 'tree', x: 1.72, size: 26, color: '#0E5C49' },
    { kind: 'stopSign', x: 1.85 },
    { kind: 'hill', x: 1.92, size: 80, color: 'rgba(14,92,73,0.4)' },
  ] as const;

  const renderSceneryItem = (item: typeof sceneryItems[number], i: number) => {
    const baseTop = heroHeight * 0.68;
    if (item.kind === 'tree') {
      return (
        <View key={i} style={{ position: 'absolute', left: item.x * w, top: baseTop - item.size }}>
          <Ionicons name="leaf" size={item.size} color={item.color} />
        </View>
      );
    }
    if (item.kind === 'hill') {
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: item.x * w - item.size / 2,
            top: baseTop - item.size * 0.55,
            width: item.size,
            height: item.size,
            borderRadius: item.size / 2,
            backgroundColor: item.color,
          }}
        />
      );
    }
    if (item.kind === 'building') {
      return (
        <View key={i} style={{ position: 'absolute', left: item.x * w, top: baseTop - item.size }}>
          <Ionicons name="business" size={item.size} color="#FFD166" />
        </View>
      );
    }
    if (item.kind === 'cone') {
      return (
        <View key={i} style={{ position: 'absolute', left: item.x * w, top: baseTop - item.size }}>
          <Ionicons name="warning" size={item.size} color="#FF8C42" />
        </View>
      );
    }
    if (item.kind === 'trafficLight') {
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: item.x * w,
            top: baseTop - 56,
            alignItems: 'center',
          }}
        >
          <View style={styles.trafficLightBox}>
            <View style={[styles.trafficDot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.trafficDot, { backgroundColor: '#F59E0B' }]} />
            <View style={[styles.trafficDot, { backgroundColor: '#22C55E' }]} />
          </View>
          <View style={styles.trafficPole} />
        </View>
      );
    }
    if (item.kind === 'stopSign') {
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: item.x * w,
            top: baseTop - 42,
            alignItems: 'center',
          }}
        >
          <View style={styles.stopSign}>
            <Text style={styles.stopSignText}>STOP</Text>
          </View>
          <View style={styles.trafficPole} />
        </View>
      );
    }
    return null;
  };

  return (
    <View
      style={[styles.heroRoot, { height: heroHeight }]}
      pointerEvents="none"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {/* Sky */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0E7A60' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0A8F7D', opacity: 0.55 }]} />

      {/* Sun + clouds */}
      <View style={[styles.sun, { right: 24, top: 24 }]} />
      <View style={[styles.cloud, { top: 30, left: '18%' }]} />
      <View style={[styles.cloud, { top: 50, left: '55%', opacity: 0.7 }]} />
      <View style={[styles.cloud, { top: 70, left: '30%', opacity: 0.4 }]} />

      {/* Distant mountains (static) */}
      <View style={[styles.mountain, { left: '5%', bottom: heroHeight * 0.32 }]} />
      <View style={[styles.mountain, { left: '38%', bottom: heroHeight * 0.32, width: 140, height: 60 }]} />
      <View style={[styles.mountain, { right: '8%', bottom: heroHeight * 0.32, width: 110, height: 45 }]} />

      {/* Scenery layer (trees + signs + traffic light scroll past) */}
      {w > 0 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ translateX: sceneryX }] }]}
        >
          {sceneryItems.map((item, i) => renderSceneryItem(item, i))}
        </Animated.View>
      )}

      {/* Road band */}
      <View style={[styles.roadBand, { height: heroHeight * 0.28 }]}>
        {/* Dashed center line */}
        <Animated.View
          style={[styles.roadStripesRow, { transform: [{ translateX: stripeX }] }]}
        >
          {stripes.map((_, i) => (
            <View key={i} style={styles.roadStripeH} />
          ))}
        </Animated.View>
        {/* Zebra crossing — tiled with road, positioned every w*0.7 */}
        {w > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              left: w * 0.65,
              top: 0,
              bottom: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              transform: [{ translateX: stripeX }],
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.zebraBar} />
            ))}
          </Animated.View>
        )}
      </View>

      {/* Finish flag (anchored right) */}
      {w > 0 && (
        <View
          style={{
            position: 'absolute',
            right: 18,
            top: heroHeight * 0.72 - 14,
          }}
        >
          <Ionicons name="flag" size={28} color="#FFD166" />
          <Animated.View
            style={{
              position: 'absolute',
              left: -10,
              top: -10,
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            }}
          >
            <Ionicons name="sparkles" size={44} color="#FFEC8A" />
          </Animated.View>
        </View>
      )}

      {/* Student (walks in from left) */}
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: heroHeight * 0.55,
            transform: [{ translateX: studentX }],
            opacity: peopleOpacity,
          }}
        >
          <View style={styles.personBadge}>
            <Ionicons name="person" size={26} color="#0A8F7D" />
          </View>
          <Text style={styles.personLabel}>Student</Text>
        </Animated.View>
      )}

      {/* Instructor (walks in from right) */}
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: heroHeight * 0.55,
            transform: [{ translateX: instructorX }],
            opacity: peopleOpacity,
          }}
        >
          <View style={[styles.personBadge, { backgroundColor: '#FFD166' }]}>
            <Ionicons name="person-circle" size={28} color="#0A8F7D" />
          </View>
          <Text style={styles.personLabel}>Instructor</Text>
        </Animated.View>
      )}

      {/* Wave emoji when they meet */}
      {w > 0 && (
        <Animated.Text
          style={{
            position: 'absolute',
            left: centerX - 10,
            top: heroHeight * 0.42,
            fontSize: 26,
            opacity: waveOpacity,
            transform: [{ translateY: waveBounce }],
          }}
        >
          👋
        </Animated.Text>
      )}

      {/* Oncoming car — passes during the drive */}
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: heroHeight * 0.78,
            opacity: oncomingOpacity,
            transform: [{ translateX: oncomingX }, { scaleX: -1 }],
          }}
        >
          <Ionicons name="car" size={34} color="#EF4444" />
        </Animated.View>
      )}

      {/* Main car — drives left → right with hills */}
      {w > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: heroHeight * 0.62,
            opacity: carOpacity,
            transform: [
              { translateX: carX },
              { translateY: Animated.add(carBob, carHill) },
            ],
          }}
        >
          <View style={styles.carShadow} />
          <Ionicons name="car-sport" size={48} color="#FFFFFF" />
        </Animated.View>
      )}

      {/* Graduation scene — student + instructor reappear at finish */}
      {w > 0 && (
        <>
          <Animated.View
            style={{
              position: 'absolute',
              top: heroHeight * 0.55,
              transform: [{ translateX: finalStudentX }],
              opacity: finalPeopleOpacity,
            }}
          >
            <View style={styles.personBadge}>
              <Ionicons name="person" size={26} color="#0A8F7D" />
            </View>
            <Text style={styles.personLabel}>Student</Text>
            {/* Grad cap above student */}
            <Animated.Text
              style={{
                position: 'absolute',
                top: -22,
                left: 10,
                fontSize: 24,
                opacity: capOpacity,
                transform: [{ scale: capScale }],
              }}
            >
              🎓
            </Animated.Text>
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute',
              top: heroHeight * 0.55,
              transform: [{ translateX: finalInstructorX }],
              opacity: finalPeopleOpacity,
            }}
          >
            <View style={[styles.personBadge, { backgroundColor: '#FFD166' }]}>
              <Ionicons name="person-circle" size={28} color="#0A8F7D" />
            </View>
            <Text style={styles.personLabel}>Instructor</Text>
          </Animated.View>

          {/* Certificate sliding from instructor → student */}
          <Animated.Text
            style={{
              position: 'absolute',
              top: heroHeight * 0.58,
              fontSize: 22,
              opacity: certOpacity,
              transform: [{ translateX: certX }, { translateY: certLift }],
            }}
          >
            📜
          </Animated.Text>

          {/* Certified! banner */}
          <Animated.View
            style={{
              position: 'absolute',
              top: heroHeight * 0.40,
              right: 30,
              opacity: certifiedOpacity,
            }}
          >
            <View style={styles.certifiedBadge}>
              <Ionicons name="ribbon" size={14} color="#0A8F7D" />
              <Text style={styles.certifiedText}>Certified!</Text>
            </View>
          </Animated.View>
        </>
      )}

      {/* Brand title at bottom */}
      <View style={styles.heroTextWrap}>
        <Text style={styles.heroBrand}>RoadReady</Text>
      </View>
    </View>
  );
}

// ─── Rotating tagline (cross-fades every 4s) ──────────────────────────────
function RotatingTagline({ color }: { color: string }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % TAGLINES.length);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [fade]);

  return (
    <Animated.Text style={[styles.taglineRot, { color, opacity: fade }]}>
      {TAGLINES[index]}
    </Animated.Text>
  );
}

// ─── Live stats counter ────────────────────────────────────────────────────
function StatsTicker({ color, target = 2431 }: { color: string; target?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 1400;
    const start = Date.now();
    let raf: any;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <View style={styles.statsRow}>
      <View style={styles.pulseDot} />
      <Text style={[styles.statsText, { color }]}>
        Join <Text style={styles.statsNumber}>{value.toLocaleString()}+</Text> learners driving with RoadReady
      </Text>
    </View>
  );
}

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
  const { width } = useWindowDimensions();
  const heroHeight = Platform.OS === 'web' ? (width > 900 ? 360 : 300) : 280;
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
  const [showPendingVerificationModal, setShowPendingVerificationModal] = useState(false);
  const [pendingVerificationDetail, setPendingVerificationDetail] = useState<any>(null);
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
      err.rawDetail = data.detail;
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

      // ── Pending verification guard ──────────────────────────────────────────
      if (error.httpStatus === 403 && error.rawDetail?.code === 'ACCOUNT_PENDING_VERIFICATION') {
        setPendingVerificationDetail(error.rawDetail);
        setShowPendingVerificationModal(true);
        return;
      }
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
        {/* Animated Road Hero */}
        <RoadHero heroHeight={heroHeight} />

        {/* Tagline + stats just under the hero */}
        <View style={styles.subHero}>
          <RotatingTagline color={colors.textSecondary} />
          <StatsTicker color={colors.textSecondary} />
        </View>

        {/* Login Card (floats up over the hero edge) */}
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

          <View style={styles.fieldRow}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.fieldIcon} />
            <View style={{ flex: 1 }}>
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
            </View>
          </View>

          <View style={[styles.fieldRow, styles.passwordRow]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.fieldIcon} />
            <View style={{ flex: 1 }}>
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
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.primary}
                />
              </Pressable>
            </View>
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

        {/* Register CTA — full-width outlined, equal weight to login */}
        <View style={styles.registerWrap}>
          <Text style={[styles.registerLabel, { color: colors.textSecondary }]}>
            New to RoadReady?
          </Text>
          <Button
            label="Create an account"
            variant="outline"
            onPress={() => navigation.navigate('RegisterChoice')}
            fullWidth
          />
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>Secure login</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="school-outline" size={14} color={colors.primary} />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>K53 ready</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.trustText, { color: colors.textSecondary }]}>Local instructors</Text>
          </View>
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

      {/* Pending Verification Modal — shown when instructor account is awaiting approval */}
      <ThemedModal
        visible={showPendingVerificationModal}
        onClose={() => setShowPendingVerificationModal(false)}
        title="Account Pending Verification"
        size="sm"
      >
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
          Your instructor account is currently being reviewed.
          {pendingVerificationDetail?.verification_status === 'pending_company'
            ? ' The driving school owner needs to approve your membership first.'
            : ' An administrator will approve your account shortly.'}
        </Text>
        {(pendingVerificationDetail?.admin_name ||
          pendingVerificationDetail?.admin_email ||
          pendingVerificationDetail?.admin_phone) && (
          <View
            style={{
              borderRadius: 8,
              padding: 12,
              backgroundColor: colors.backgroundSecondary,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
              CONTACT ADMINISTRATOR
            </Text>
            {pendingVerificationDetail?.admin_name ? (
              <Text style={{ color: colors.text, fontSize: 14, marginBottom: 2 }}>
                👤 {pendingVerificationDetail.admin_name}
              </Text>
            ) : null}
            {pendingVerificationDetail?.admin_email ? (
              <Text style={{ color: colors.text, fontSize: 14, marginBottom: 2 }}>
                ✉️ {pendingVerificationDetail.admin_email}
              </Text>
            ) : null}
            {pendingVerificationDetail?.admin_phone ? (
              <Text style={{ color: colors.text, fontSize: 14 }}>
                📞 {pendingVerificationDetail.admin_phone}
              </Text>
            ) : null}
          </View>
        )}
        <Button
          label="OK"
          onPress={() => setShowPendingVerificationModal(false)}
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
    paddingHorizontal: Platform.OS === 'web' ? '15%' : 0,
    paddingBottom: 40,
  },
  // ─── Hero ─────────────────────────────────────────────
  heroRoot: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    justifyContent: 'flex-end',
  },
  sun: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD166',
    opacity: 0.85,
    shadowColor: '#FFD166',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  cloud: {
    position: 'absolute',
    width: 60,
    height: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  roadBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 56,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roadStripesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 10,
  },
  roadStripeH: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  zebraBar: {
    width: 8,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  mountain: {
    position: 'absolute',
    width: 180,
    height: 70,
    borderTopLeftRadius: 90,
    borderTopRightRadius: 90,
    backgroundColor: 'rgba(14,92,73,0.55)',
  },
  trafficLightBox: {
    width: 18,
    height: 38,
    borderRadius: 4,
    backgroundColor: '#1F2937',
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trafficDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  trafficPole: {
    width: 3,
    height: 18,
    backgroundColor: '#374151',
  },
  stopSign: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  stopSignText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    transform: [{ rotate: '-45deg' }],
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  certifiedText: {
    color: '#0A8F7D',
    fontWeight: '800',
    fontSize: 12,
  },
  personBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  personLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  carShadow: {
    position: 'absolute',
    bottom: -6,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTextWrap: {
    alignItems: 'center',
    paddingBottom: 14,
  },
  heroBrand: {
    fontSize: Platform.OS === 'web' ? 36 : 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  // ─── Sub-hero (tagline + stats) ───────────────────────
  subHero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  taglineRot: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  statsText: {
    fontSize: 12,
  },
  statsNumber: {
    fontWeight: '700',
  },
  // ─── Form ─────────────────────────────────────────────
  formCard: {
    marginHorizontal: Platform.OS === 'web' ? 0 : 16,
    marginTop: 12,
    marginBottom: 16,
  },
  messageWrap: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldIcon: {
    marginTop: Platform.OS === 'web' ? 38 : 36,
    marginRight: 10,
    width: 18,
  },
  passwordRow: {
    position: 'relative',
  },
  togglePassword: {
    position: 'absolute',
    right: 8,
    top: Platform.OS === 'web' ? 34 : 32,
    padding: 6,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
    padding: 6,
  },
  forgotText: {
    fontSize: 13,
  },
  // ─── Register CTA ─────────────────────────────────────
  registerWrap: {
    marginHorizontal: Platform.OS === 'web' ? 0 : 16,
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  registerLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
  },
  // ─── Trust badges ─────────────────────────────────────
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
    paddingHorizontal: 16,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // ─── Debug ────────────────────────────────────────────
  debugBox: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // ─── Modals ───────────────────────────────────────────
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
