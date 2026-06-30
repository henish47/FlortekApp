import { useEffect, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCurrentUser, getUserProfile, checkEmailVerificationStatus, signOut } from '../../services/authService';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const isAdmin = role === 'admin';

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
          height: Platform.OS === 'ios' ? 64 + insets.bottom : 68,
          paddingBottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom : 8) : 10,
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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
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
              name={focused ? 'receipt' : 'receipt-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'cube' : 'cube-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-multiple' : 'account-multiple-outline'}
              size={focused ? 24 : 22}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="order-details"    options={{ href: null }} />
      <Tabs.Screen name="add-product"      options={{ href: null }} />
      <Tabs.Screen name="add-user"         options={{ href: null }} />
      <Tabs.Screen name="edit-user"        options={{ href: null }} />
      <Tabs.Screen name="company-profile"  options={{ href: null }} />
      <Tabs.Screen name="category-products" options={{ href: null }} />
      <Tabs.Screen name="subcategories"    options={{ href: null }} />
      <Tabs.Screen name="dropdown-fields"  options={{ href: null }} />
    </Tabs>
  );
}
