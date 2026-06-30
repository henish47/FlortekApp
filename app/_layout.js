import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../services/supabase';
import { getUserProfile } from '../services/authService';
import { registerForPushNotificationsAsync, savePushToken } from '../services/notificationService';
import { Platform, View, StyleSheet } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1A237E',
    secondary: '#303F9F',
    accent: '#0D47A1',
  },
};

export default function RootLayout() {
  useEffect(() => {
    // Register PWA service worker on Web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered successfully:', reg.scope))
          .catch(err => console.error('SW registration failed:', err));
      });
    }

    // Process deep link URL if it contains auth tokens
    const processAuthUrl = async (url) => {
      try {
        console.log('[DeepLink] Processing incoming URL:', url);
        // Extract parameters from hash fragment (#) or query parameters (?)
        let paramsString = '';
        if (url.includes('#')) {
          paramsString = url.split('#')[1];
        } else if (url.includes('?')) {
          paramsString = url.split('?')[1];
        } else {
          return; // No query/hash params to process
        }

        const params = {};
        const pairs = paramsString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        }

        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          console.log('[DeepLink] Magic link / recovery tokens detected. Setting session...');
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) throw sessionError;

          const user = sessionData?.user;
          if (user) {
            console.log('Session established. Checking profile for user ID:', user.id);
            
            // Check profiles table for user
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

            let userRole = 'customer';

            if (!profile) {
              console.log('Profile missing. Creating default customer profile...');
              const newProfile = {
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
                role: 'customer',
                created_at: new Date().toISOString(),
              };

              const { data: insertedData, error: insertError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .maybeSingle();

              if (insertError) {
                console.error('Error creating profile from layout:', insertError);
              } else if (insertedData) {
                userRole = insertedData.role;
              }
            } else {
              userRole = profile.role;
            }

            console.log('Navigating to screen based on role:', userRole);
            
            // Navigate to appropriate screen based on user role
            const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
            if (staffRoles.includes(userRole)) {
              router.replace('/(admin)/dashboard');
            } else {
              router.replace('/(tabs)/home');
            }
          }
        }
      } catch (err) {
        console.error('[DeepLink] Error processing deep link:', err);
      }
    };

    // Handle deep links when the app is already open in background
    const handleDeepLink = (event) => {
      if (event.url) {
        processAuthUrl(event.url);
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep links when the app is launched from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        processAuthUrl(url);
      }
    });

    // Listen for auth state changes to register push notifications
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
              await savePushToken(session.user.id, token);
            }
          } catch (err) {
            console.error('Failed to register push token on auth change:', err);
          }
        }
      }
    );

    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </PaperProvider>
  );
}