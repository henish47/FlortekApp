import { useState } from 'react';
import {
  View,
  Alert,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  HelperText,
  Snackbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { signIn, getUserProfile, signOut, sendOTP } from '../../services/authService';
import { registerForPushNotificationsAsync, savePushToken } from '../../services/notificationService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for Notifications
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info'); // 'success' | 'error' | 'info'

  const showSnackbar = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showSnackbar('Please fill in both email and password.', 'error');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await signIn(email.trim(), password);

      if (error) {
        if (error.message && (
          error.message.toLowerCase().includes('confirm') ||
          error.message.toLowerCase().includes('verified') ||
          error.message.toLowerCase().includes('verify')
        )) {
          showSnackbar('Email not verified. Sending new verification OTP...', 'error');
          try {
            await sendOTP(email.trim());
          } catch (resendErr) {
            console.error('Error resending OTP on login:', resendErr);
          }
          setTimeout(() => {
            router.push({
              pathname: '/(auth)/verify-email',
              params: { email: email.trim() }
            });
          }, 1500);
        } else {
          showSnackbar(error.message || 'Something went wrong. Please try again.', 'error');
        }
        return;
      }

      // Check verification status
      const isVerified = !!(data.user?.email_confirmed_at || data.user?.user_metadata?.email_verified);
      if (!isVerified) {
        showSnackbar('Please verify your email before logging in.', 'error');
        await signOut();
        // Redirect to OTP verification screen after a brief delay
        setTimeout(() => {
          router.push({
            pathname: '/(auth)/verify-email',
            params: { email: email.trim(), userId: data.user.id }
          });
        }, 1000);
        return;
      }

      const profile = await getUserProfile(data.user.id);
      if (!profile) {
        showSnackbar('Something went wrong. Please try again.', 'error');
        await signOut();
        return;
      }

      showSnackbar('Login successful!', 'success');

      // Register push token upon successful login
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(data.user.id, token);
        }
      } catch (tokenErr) {
        console.error('Failed to register push token during login:', tokenErr);
      }

      const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
      setTimeout(() => {
        if (staffRoles.includes(profile.role)) {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)/home');
        }
      }, 500);
    } catch (error) {
      console.log('Login error:', error);
      showSnackbar(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Logo Section */}
          

          {/* Login Card */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineMedium" style={styles.heading}>
               Login
              </Text>
            

              {/* Inputs */}
              <TextInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="email@example.com"
                left={<TextInput.Icon icon="email-outline" color="#546E7A" />}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                mode="outlined"
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="••••••••"
                left={<TextInput.Icon icon="lock-outline" color="#546E7A" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    color="#546E7A"
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              {/* Forgot Password Link */}
              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  style={styles.forgotContainer}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#1A237E"
                contentStyle={styles.btnContent}
              >
                Login
              </Button>


              {/* Register Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.footerLink}>Register</Text>
                </Pressable>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* React Native Paper Status Notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{
          backgroundColor:
            snackbarType === 'success'
              ? '#2E7D32'
              : snackbarType === 'error'
              ? '#D32F2F'
              : '#37474F',
        }}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoHeaderContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    height: 60,
    width: 180,
  },
  appTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#90A4AE',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heading: {
    fontWeight: '800',
    color: '#1A237E',
    fontSize: 24,
    textAlign: 'center',
  },
  subheading: {
    color: '#78909C',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
    lineHeight: 18,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: -4,
    width: '100%',
  },
  forgotContainer: {},
  forgotText: {
    color: '#1A237E',
    fontWeight: '700',
    fontSize: 13,
  },
  button: {
    borderRadius: 12,
    elevation: 2,
  },
  btnContent: {
    height: 48,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerLabel: {
    color: '#78909C',
    fontSize: 13,
  },
  footerLink: {
    color: '#1A237E',
    fontWeight: '800',
    fontSize: 13,
  },
});
