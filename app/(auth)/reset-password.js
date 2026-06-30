import { useState } from 'react';
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

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = async () => {
    if (!password) {
      Alert.alert('Required Field', 'Please enter your new password.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => router.replace('/login') }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password.');
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
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.replace('/login')}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1A237E" />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>



          {/* Card */}
          <Card style={styles.card} elevation={4}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineMedium" style={styles.heading}>
                New Password
              </Text>
              <Text variant="bodyMedium" style={styles.subheading}>
                Enter your new password below to update your credentials
              </Text>

              {/* Password Input */}
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

              {/* Reset button */}
              <Button
                mode="contained"
                onPress={handleUpdate}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#1A237E"
                contentStyle={styles.btnContent}
              >
                Update Password
              </Button>
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
});