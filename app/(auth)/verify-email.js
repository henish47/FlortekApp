import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Button, Card, Text, TextInput, Snackbar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { verifyOTP, sendOTP, getUserProfile } from '../../services/authService';

export default function VerifyEmail() {
  const { email, userId } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (!email) {
      showSnackbar('Email address not found. Please log in again.', 'error');
      return;
    }

    if (otp.trim().length !== 8) {
      showSnackbar('Please enter a valid 8-digit code.', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await verifyOTP(email, otp.trim());
      showSnackbar('Email verified successfully! Logging you in...', 'success');
      
      console.log("[VerifyEmail] OTP verified successfully. Fetching user profile...");
      const profile = await getUserProfile(data.user.id);
      
      const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
      setTimeout(() => {
        if (profile && staffRoles.includes(profile.role)) {
          console.log("[VerifyEmail] Routing to Admin Dashboard...");
          router.replace('/(admin)/dashboard');
        } else {
          console.log("[VerifyEmail] Routing to Customer Home...");
          router.replace('/(tabs)/home');
        }
      }, 1500);
    } catch (err) {
      console.error('OTP Verification Error:', err);
      showSnackbar(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      showSnackbar('Email address not found. Please log in again.', 'error');
      return;
    }

    if (timer > 0) return;

    try {
      setLoading(true);
      await sendOTP(email);
      showSnackbar('Verification code resent successfully!', 'success');
      setTimer(60); // 60 seconds countdown
    } catch (err) {
      console.error('Error resending OTP:', err);
      showSnackbar(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.innerContainer}>


        <Card style={styles.card} elevation={4}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="shield-key-outline" size={64} color="#1A237E" />
            </View>

            <Text variant="headlineMedium" style={styles.heading}>
              Verify Email
            </Text>
            
            <Text variant="bodyMedium" style={styles.message}>
              We have sent an 8-digit OTP code to:{"\n"}
              <Text style={styles.emailHighlight}>{email || 'your inbox'}</Text>
              {"\n\n"}
              Please enter the code below to verify your email address.
            </Text>

            <TextInput
              label="OTP Verification Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              mode="outlined"
              style={styles.input}
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              placeholder="00000000"
              left={<TextInput.Icon icon="numeric" color="#546E7A" />}
            />

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={loading}
              disabled={loading}
              style={styles.primaryButton}
              buttonColor="#1A237E"
              contentStyle={styles.btnContent}
            >
              Verify OTP
            </Button>

            <Button
              mode="outlined"
              onPress={handleResend}
              loading={loading}
              disabled={loading || timer > 0}
              style={styles.secondaryButton}
              textColor="#1A237E"
              outlineColor="#CFD8DC"
              contentStyle={styles.btnContent}
            >
              {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
            </Button>

            <Button
              mode="text"
              onPress={() => router.replace('/(auth)/login')}
              disabled={loading}
              style={styles.textButton}
              textColor="#EF5350"
            >
              Back to Login
            </Button>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  innerContainer: {
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontWeight: '800',
    color: '#1A237E',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    color: '#546E7A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontSize: 15,
  },
  emailHighlight: {
    fontWeight: '700',
    color: '#1A237E',
  },
  input: {
    width: '100%',
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  textButton: {
    width: '100%',
  },
  btnContent: {
    height: 48,
  },
});
