import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getCurrentUser, checkEmailVerificationStatus, signOut } from '../../services/authService';

export default function CustomerLayout() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace('/(auth)/login');
          return;
        }

        const isVerified = await checkEmailVerificationStatus();
        if (!isVerified) {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: user.email, userId: user.id }
          });
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error in CustomerLayout guard:', err);
        try {
          await signOut();
        } catch (logoutErr) {
          console.error('Error signing out in customer layout catch:', logoutErr);
        }
        router.replace('/(auth)/login');
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFBFC' }}>
        <ActivityIndicator size="large" color="#1A237E" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
