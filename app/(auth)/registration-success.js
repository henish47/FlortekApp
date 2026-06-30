import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Button, Card, Text, Snackbar } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendOTP } from '../../services/authService';

export default function RegistrationSuccess() {
  const { email, userId } = useLocalSearchParams();
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

  const handleResend = async () => {
    if (!email) {
      showSnackbar('Email address not found. Please try logging in to verify.', 'error');
      return;
    }

    if (timer > 0) return;

    try {
      setLoading(true);
      await sendOTP(email);
      showSnackbar('Verification code sent successfully!', 'success');
      setTimer(60); // 60 seconds countdown
    } catch (err) {
      console.error('Error resending OTP:', err);
      showSnackbar(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToVerify = () => {
    router.push({
      pathname: '/(auth)/verify-email',
      params: { email, userId }
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.innerContainer}>


        <Card style={styles.card} elevation={4}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="email-check-outline" size={64} color="#1A237E" />
            </View>

            <Text variant="headlineMedium" style={styles.heading}>
              Registration Successful
            </Text>
            
            <Text variant="bodyMedium" style={styles.message}>
              Please verify your email before logging in. We have sent an 8-digit OTP code to:{"\n"}
              <Text style={styles.emailHighlight}>{email || 'your inbox'}</Text>
            </Text>

            <Button
              mode="contained"
              onPress={handleGoToVerify}
              style={styles.primaryButton}
              buttonColor="#1A237E"
              contentStyle={styles.btnContent}
            >
              Verify Email
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
              {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend Verification OTP'}
            </Button>
          </Card.Content>
        </Card>
      </View>

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
  },
  btnContent: {
    height: 48,
  },
});
