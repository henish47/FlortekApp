import { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  Easing,
  SafeAreaView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { getCurrentUser, getUserProfile, checkEmailVerificationStatus, signOut } from '../services/authService';

export default function Splash() {
  const { width } = useWindowDimensions();

  // Animation values
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoTranslateY = useRef(new Animated.Value(20)).current;
  const logoHoverAnim = useRef(new Animated.Value(0)).current;

  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    // 1. Entrance Animations Sequence
    Animated.parallel([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 30,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 900,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 900,
        delay: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start subtle logo float animation loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoHoverAnim, {
            toValue: -8,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(logoHoverAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 2. Check Session & Redirect
    const checkSession = async () => {
      const startTime = Date.now();
      let destination = '/login';

      try {
        const user = await getCurrentUser();
        if (user) {
          const isVerified = await checkEmailVerificationStatus();
          if (!isVerified) {
            destination = {
              pathname: '/(auth)/verify-email',
              params: { email: user.email, userId: user.id }
            };
          } else {
            const profile = await getUserProfile(user.id);
            if (profile) {
              const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
              if (staffRoles.includes(profile.role)) {
                destination = '/(admin)/dashboard';
              } else {
                destination = '/(tabs)/home';
              }
            }
          }
        }
      } catch (error) {
        console.log('Splash session check error:', error);
        try {
          await signOut();
        } catch (logoutErr) {
          console.error('Error signing out in splash catch:', logoutErr);
        }
      } finally {
        const duration = Date.now() - startTime;
        const minDuration = 3000; // 3 seconds branding hold time
        const delay = Math.max(0, minDuration - duration);

        setTimeout(() => {
          if (typeof destination === 'string') {
            router.replace(destination);
          } else {
            router.replace(destination);
          }
        }, delay);
      }
    };

    checkSession();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Brand Logo Container */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoFadeAnim,
              transform: [
                { scale: logoScaleAnim },
                { translateY: Animated.add(logoTranslateY, logoHoverAnim) },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/logo.png')}
            style={[styles.logo, { width: width > 400 ? 300 : 250 }]}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Company Name */}
        <Animated.View
          style={{
            opacity: contentFadeAnim,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          <Text style={styles.companyName}>
            Flortek Industries PVT. LTD.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Premium Pure White Theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 100, // Enlarge logo height from 75 to 100
  },
  companyName: {
    fontWeight: '800',
    color: '#1A237E', // Premium dark indigo
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 0.5,
    marginTop: 24,
    textShadowColor: 'rgba(26, 35, 126, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});