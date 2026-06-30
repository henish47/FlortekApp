import { useState, useEffect, useRef } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card, Text } from 'react-native-paper';
import { supabase } from '../../services/supabase';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email', 'otp', 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timer for OTP resend
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Required Field', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) throw error;

      Alert.alert('Success', 'Verification OTP sent to your email.');
      setStep('otp');
      startResendTimer();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Required Field', 'Please enter the OTP code.');
      return;
    }

    const otpLen = otp.trim().length;
    if (otpLen !== 6 && otpLen !== 8) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6 or 8-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery',
      });

      if (error) throw error;

      Alert.alert('Success', 'OTP verified. Now you can set your new password.');
      setStep('reset');
    } catch (error) {
      Alert.alert('Verification Error', error.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert('Required Field', 'Please enter your new password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert('Success', 'Password reset successfully.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (step === 'otp') {
      setStep('email');
      setOtp('');
    } else if (step === 'reset') {
      Alert.alert(
        'Cancel Reset',
        'Are you sure you want to cancel password reset? You will need to request a new OTP.',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: () => router.replace('/login') }
        ]
      );
    } else {
      router.back();
    }
  };

  const getSubheading = () => {
    switch (step) {
      case 'otp':
        return `We have sent a verification OTP code to ${email}. Enter it below to verify.`;
      case 'reset':
        return 'Enter your new password below to update your login credentials.';
      default:
        return "Enter your registered email address, and we'll send you a verification code";
    }
  };

  const getHeading = () => {
    switch (step) {
      case 'otp':
        return 'Verify OTP';
      case 'reset':
        return 'New Password';
      default:
        return 'Reset Password';
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
          {/* Back button */}
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A237E" />
            <Text style={styles.backText}>
              {step === 'otp' ? 'Back to Email' : step === 'reset' ? 'Cancel' : 'Back to Login'}
            </Text>
          </TouchableOpacity>



          {/* Card */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineMedium" style={styles.heading}>
                {getHeading()}
              </Text>
              <Text variant="bodyMedium" style={styles.subheading}>
                {getSubheading()}
              </Text>

              {/* Step 1: Email Form */}
              {step === 'email' && (
                <>
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

                  <Button
                    mode="contained"
                    onPress={handleSendOtp}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    buttonColor="#1A237E"
                    contentStyle={styles.btnContent}
                  >
                    Send OTP Code
                  </Button>
                </>
              )}

              {/* Step 2: OTP Verification Form */}
              {step === 'otp' && (
                <>
                  <TextInput
                    label="OTP Verification Code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={8}
                    autoCapitalize="none"
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    placeholder="Enter OTP code"
                    left={<TextInput.Icon icon="key-outline" color="#546E7A" />}
                  />

                  <Button
                    mode="contained"
                    onPress={handleVerifyOtp}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    buttonColor="#1A237E"
                    contentStyle={styles.btnContent}
                  >
                    Verify OTP
                  </Button>

                  <View style={styles.timerRow}>
                    <TouchableOpacity
                      disabled={resendTimer > 0 || loading}
                      onPress={handleSendOtp}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timerLink, resendTimer > 0 && styles.disabledLink]}>
                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setStep('email');
                      setOtp('');
                    }}
                    style={styles.changeEmailBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeEmailText}>Change Email</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Step 3: Reset Password Form */}
              {step === 'reset' && (
                <>
                  <TextInput
                    label="New Password"
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

                  <TextInput
                    label="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    mode="outlined"
                    style={styles.input}
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    placeholder="••••••••"
                    left={<TextInput.Icon icon="lock-check-outline" color="#546E7A" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        color="#546E7A"
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    }
                  />

                  <Button
                    mode="contained"
                    onPress={handleUpdatePassword}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    buttonColor="#1A237E"
                    contentStyle={styles.btnContent}
                  >
                    Update Password
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
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
    position: 'relative',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: 20,
    marginTop: -20,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A237E',
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
    marginBottom: 24,
    backgroundColor: '#ffffff',
  },
  button: {
    borderRadius: 12,
    elevation: 2,
  },
  btnContent: {
    height: 48,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  timerLink: {
    color: '#1A237E',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledLink: {
    color: '#90A4AE',
  },
  changeEmailBtn: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  changeEmailText: {
    color: '#1A237E',
    fontWeight: '700',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});