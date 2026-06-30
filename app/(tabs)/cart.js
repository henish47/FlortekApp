import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Card, Text, Button, IconButton, ActivityIndicator, Snackbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { getUserProfile } from '../../services/authService';
import { createOrder } from '../../services/orderService';
import useCartStore from '../../store/cartStore';
import Topbar from '../../components/Topbar';

export default function CartTab() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const cartItems = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Toast / Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (params?.reorderSuccess === 'true') {
      setSnackbarMessage('Items added to cart successfully.');
      setSnackbarVisible(true);
      router.setParams({ reorderSuccess: undefined });
    }
  }, [params?.reorderSuccess]);

  useEffect(() => {
    loadUserProfile();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserProfile = async () => {
    try {
      setProfileLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setCustomerName(profile.full_name || '');
          setMobile(profile.mobile || '');
          
          // Formulate full address from profile fields
          const companyInfo = profile.company_name ? `${profile.company_name}, ` : '';
          const locationParts = [profile.address, profile.city, profile.state, profile.pincode]
            .map(part => part?.trim())
            .filter(Boolean);
          const fullAddress = `${companyInfo}${locationParts.join(', ')}`.trim();
          setAddress(fullAddress || profile.address || '');
        }
      }
    } catch (err) {
      console.warn('Failed to load user profile for autofill:', err);
    } finally {
      setProfileLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please select products to order.');
      return;
    }

    if (!customerName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Profile Info Missing', 'Could not load your name, mobile, or address. Please check your profile or log in again.');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Session Expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      // Combine all cart items into a single order row payload
      const combinedProductName = cartItems
        .map((item) => `${item.name} (${item.size}, ${item.color}, ${item.load_capacity}) x ${item.quantity}`)
        .join('\n');

      const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const combinedProductId = cartItems.map((item) => item.id).join(', ');

      const orderPayload = {
        user_id: user.id,
        product_id: combinedProductId,
        product_name: combinedProductName,
        quantity: totalQuantity,
        customer_name: customerName.trim(),
        customer_mobile: mobile.trim(),
        delivery_address: address.trim(),
        remarks: remarks.trim() || null,
        status: 'Confirmed',
      };

      await createOrder(orderPayload);

      if (Platform.OS === 'web') {
        alert('Your order has been placed successfully!');
        clearCart();
        router.replace('/(tabs)/orders');
      } else {
        Alert.alert(
          'Order Placed',
          'Your order has been placed successfully!',
          [
            {
              text: 'View Orders',
              onPress: () => {
                clearCart();
                router.replace('/(tabs)/orders');
              },
            },
          ]
        );
      }
    } catch (err) {
      console.error('Failed to create orders:', err);
      Alert.alert('Order Failed', err.message || 'An error occurred while placing your order.');
    } finally {
      setLoading(false);
    }
  };

  const incrementQty = (item) => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const decrementQty = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    } else {
      removeItem(item.id);
    }
  };

  if (profileLoading && !refreshing && cartItems.length > 0) {
    return (
      <View style={styles.centerContainer}>
        <Topbar title="My Cart" roleBadge="Customer" />
        <View style={styles.loaderBox}>
          <Card.Content>
            <ActivityIndicator size="large" color="#1A237E" />
            <Text style={styles.loadingText}>Loading checkout profiles...</Text>
          </Card.Content>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Topbar title="My Cart" roleBadge="Customer" />

        {cartItems.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <MaterialCommunityIcons name="cart-outline" size={72} color="#B0BEC5" />
            <Text variant="titleLarge" style={styles.emptyTitle}>Empty</Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Browse our dynamic product catalog on the Home screen to select and add items.
            </Text>
            <Button
              mode="contained"
              onPress={() => router.replace('/(tabs)/home')}
              style={styles.browseBtn}
              buttonColor="#1A237E"
            >
              Add Products
            </Button>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
            }
          >
            {/* Cart Items List */}
            <Text variant="titleMedium" style={styles.sectionTitle}>Selected Products ({cartItems.length})</Text>
            {cartItems.map((item) => (
              <Card key={item.id} style={styles.itemCard} elevation={1}>
                <Card.Content style={styles.itemCardContent}>
                  <View style={styles.itemMainRow}>
                    <View style={styles.itemInfo}>
                      <Text variant="titleMedium" style={styles.itemName}>{item.name}</Text>
                      
                      <View style={styles.specsRow}>
                        <View style={styles.specBadge}>
                          <Text style={styles.specText}>{item.size}</Text>
                        </View>
                        <View style={styles.specBadge}>
                          <Text style={styles.specText}>{item.color}</Text>
                        </View>
                        <View style={styles.specBadge}>
                          <Text style={styles.specText}>{item.load_capacity}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Quantity Selector controls */}
                    <View style={styles.qtyContainer}>
                      <IconButton
                        icon="minus-circle-outline"
                        size={22}
                        onPress={() => decrementQty(item)}
                        iconColor="#546E7A"
                      />
                      <Text style={styles.qtyValue}>{item.quantity}</Text>
                      <IconButton
                        icon="plus-circle-outline"
                        size={22}
                        onPress={() => incrementQty(item)}
                        iconColor="#1A237E"
                      />
                    </View>

                    <IconButton
                      icon="trash-can-outline"
                      size={20}
                      onPress={() => removeItem(item.id)}
                      iconColor="#EF5350"
                      style={styles.trashBtn}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))}

            <Button
              mode="contained"
              onPress={handlePlaceOrder}
              loading={loading}
              disabled={loading}
              style={styles.orderBtn}
              buttonColor="#1A237E"
              contentStyle={styles.orderBtnContent}
            >
              Confirm & Place Order
            </Button>
          </ScrollView>
        )}

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ backgroundColor: '#4CAF50' }}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
            textColor: '#ffffff',
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#263238',
    marginBottom: 10,
    paddingLeft: 2,
  },
  itemCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  itemCardContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1.2,
  },
  itemName: {
    fontWeight: '700',
    color: '#37474F',
    fontSize: 14,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  specBadge: {
    backgroundColor: '#E8EAF6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  specText: {
    color: '#1A237E',
    fontSize: 10,
    fontWeight: 'bold',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    paddingHorizontal: 2,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A237E',
    minWidth: 20,
    textAlign: 'center',
  },
  trashBtn: {
    margin: 0,
    marginLeft: 4,
  },

  orderBtn: {
    marginTop: 16,
    borderRadius: 10,
  },
  orderBtnContent: {
    height: 46,
  },
  emptyScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#546E7A',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 24,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
});
