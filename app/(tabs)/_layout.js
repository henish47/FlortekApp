import { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, getUserProfile, checkEmailVerificationStatus, signOut } from '../../services/authService';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useCartStore from '../../store/cartStore';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Read cart items count dynamically
  const cartItemsCount = useCartStore((state) => state.items.length);

  useEffect(() => {
    async function fetchRole() {
      try {
        const user = await getCurrentUser();
        if (user) {
          const isVerified = await checkEmailVerificationStatus();
          if (!isVerified) {
            router.replace({
              pathname: '/(auth)/verify-email',
              params: { email: user.email, userId: user.id }
            });
            return;
          }

          const profile = await getUserProfile(user.id);
          if (profile) {
            setRole(profile.role);
            
            // Redirect staff roles to the admin dashboard
            const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
            if (staffRoles.includes(profile.role)) {
              router.replace('/(admin)/dashboard');
              return;
            }
          } else {
            router.replace('/(auth)/login');
          }
        } else {
          router.replace('/(auth)/login');
        }
      } catch (err) {
        console.error('Error fetching role in layout:', err);
        try {
          await signOut();
        } catch (logoutErr) {
          console.error('Error signing out in layout catch:', logoutErr);
        }
        router.replace('/(auth)/login');
      } finally {
        setLoading(false);
      }
    }
    fetchRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFBFC' }}>
        <ActivityIndicator size="large" color="#1A237E" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A237E',
        tabBarInactiveTintColor: '#78909C',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#ECEFF1',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartItemsCount > 0 ? cartItemsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#D32F2F',
            color: '#ffffff',
            fontSize: 10,
          },
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cart' : 'cart-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'clipboard-text' : 'clipboard-text-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
