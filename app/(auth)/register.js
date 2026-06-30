import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card, Text, Snackbar } from 'react-native-paper';
import { router } from 'expo-router';
import { signUp } from '../../services/authService';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Snackbar states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info'); // 'success' | 'error' | 'info'

  const showSnackbar = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleRegister = async () => {
    const fName = fullName.trim();
    const cName = companyName.trim();
    const addr = address.trim();
    const cty = city.trim();
    const st = state.trim();
    const pin = pincode.trim();
    const em = email.trim();
    const mob = mobile.trim();

    if (
      !fName ||
      !cName ||
      !addr ||
      !cty ||
      !st ||
      !pin ||
      !em ||
      !password ||
      !confirmPassword
    ) {
      showSnackbar('Please fill in all the registration fields.', 'error');
      return;
    }

    // Email pattern validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(em)) {
      showSnackbar('Please enter a valid email address.', 'error');
      return;
    }

    // Mobile validation: 10 digits
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mob)) {
      showSnackbar('Mobile number must be exactly 10 digits.', 'error');
      return;
    }

    // Pincode validation: 6 digits
    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(pin)) {
      showSnackbar('Pincode must be exactly 6 digits.', 'error');
      return;
    }

    // Password matches Confirm Password
    if (password !== confirmPassword) {
      showSnackbar('Password and Confirm Password do not match.', 'error');
      return;
    }

    try {
      setLoading(true);
      const data = await signUp({
        fullName: fName,
        companyName: cName,
        address: addr,
        city: cty,
        state: st,
        pincode: pin,
        email: em,
        mobile: mob,
        password,
      });

      // Navigate directly to verify-email, passing email and userId as route params
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: em, userId: data.user?.id },
      });
    } catch (error) {
      console.log('Registration error:', error);
      let errorMsg = error.message || 'Something went wrong. Please try again.';
      if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
        errorMsg = 'An account with this email address already exists.';
      } else if (
        errorMsg.toLowerCase().includes('network') ||
        errorMsg.toLowerCase().includes('fetch')
      ) {
        errorMsg = 'Network failure. Please check your internet connection.';
      }
      showSnackbar(errorMsg, 'error');
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
          {/* Registration Card */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineMedium" style={styles.heading}>
                Create Account
              </Text>
              <Text variant="bodyMedium" style={styles.subheading}>
                Register as a customer to start ordering FRP products
              </Text>

              {/* Inputs */}
              <TextInput
                label="Full Name"
                mode="outlined"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="John Doe"
                left={<TextInput.Icon icon="account-outline" color="#546E7A" />}
              />

              <TextInput
                label="Company Name"
                mode="outlined"
                value={companyName}
                onChangeText={setCompanyName}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="Flortek Industries"
                left={<TextInput.Icon icon="briefcase-outline" color="#546E7A" />}
              />

              <TextInput
                label="Address"
                mode="outlined"
                value={address}
                onChangeText={setAddress}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="123 Industrial Area"
                left={<TextInput.Icon icon="map-marker-outline" color="#546E7A" />}
              />

              <TextInput
                label="City"
                mode="outlined"
                value={city}
                onChangeText={setCity}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="Mumbai"
                left={<TextInput.Icon icon="city" color="#546E7A" />}
              />

              <TextInput
                label="State"
                mode="outlined"
                value={state}
                onChangeText={setState}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="Maharashtra"
                left={<TextInput.Icon icon="map-outline" color="#546E7A" />}
              />

              <TextInput
                label="Pincode"
                mode="outlined"
                keyboardType="numeric"
                value={pincode}
                onChangeText={setPincode}
                maxLength={6}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="400001"
                left={<TextInput.Icon icon="numeric" color="#546E7A" />}
              />

              <TextInput
                label="Mobile Number"
                mode="outlined"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                maxLength={10}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="9876543210"
                left={<TextInput.Icon icon="phone-outline" color="#546E7A" />}
              />

              <TextInput
                label="Email Address"
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="email@example.com"
                left={<TextInput.Icon icon="email-outline" color="#546E7A" />}
              />

              <TextInput
                label="Password"
                mode="outlined"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
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
                label="Confirm Password"
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                outlineColor="#CFD8DC"
                activeOutlineColor="#1A237E"
                placeholder="••••••••"
                left={<TextInput.Icon icon="lock-outline" color="#546E7A" />}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    color="#546E7A"
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
              />

              {/* Submit Button */}
              <Button
                mode="contained"
                loading={loading}
                disabled={loading}
                onPress={handleRegister}
                style={styles.button}
                buttonColor="#1A237E"
                contentStyle={styles.btnContent}
              >
                Register
              </Button>

              {/* Footer Login Link */}
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.footerLink}>Login</Text>
                </TouchableOpacity>
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
  button: {
    borderRadius: 12,
    elevation: 2,
    marginTop: 12,
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