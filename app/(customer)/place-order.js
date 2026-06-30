import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  Text,
  TextInput,
  Button,
  Card,
} from 'react-native-paper';

import {
  useLocalSearchParams,
  router,
} from 'expo-router';

import { supabase } from '../../services/supabase';
import { createOrder } from '../../services/orderService';
import Topbar from '../../components/Topbar';

export default function PlaceOrder() {
  const params = useLocalSearchParams();

  const [quantity, setQuantity] = useState('');
  const [customerName, setCustomerName] =
    useState('');

  const [mobile, setMobile] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [remarks, setRemarks] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleOrder = async () => {
    if (
      !quantity ||
      !customerName ||
      !mobile ||
      !address
    ) {
      Alert.alert(
        'Error',
        'Please fill all required fields'
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Error',
          'Please login again'
        );
        return;
      }

      const placedOrder = await createOrder({
        user_id: user.id,
        product_id: params.product_id,
        product_name: params.name,
        quantity: Number(quantity),
        customer_name: customerName,
        customer_mobile: mobile,
        delivery_address: address,
        remarks,
        status: 'Confirmed',
      });

      const orderNumber = placedOrder?.order_number || `Order #${placedOrder?.id}`;

      if (Platform.OS === 'web') {
        alert(`Order Placed Successfully\n\nOrder No: ${orderNumber}`);
        router.replace('/(tabs)/orders');
      } else {
        Alert.alert(
          'Success',
          `Order Placed Successfully\n\nOrder No: ${orderNumber}`,
          [
            {
              text: 'OK',
              onPress: () =>
                router.replace(
                  '/(tabs)/orders'
                ),
            },
          ]
        );
      }

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Error',
        error.message
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <Topbar title="Place Order" showBack={true} roleBadge="Customer" />
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.contentWrapper}>
        <Card style={styles.card}>
          <Card.Content>

          <Text
            variant="headlineSmall"
            style={styles.title}
          >
            {params.name}
          </Text>

          <Text>
            Product ID:
            {' '}
            {params.product_id}
          </Text>

          <Text>
            Category:
            {' '}
            {params.category}
          </Text>

          <Text>
            Size:
            {' '}
            {params.size}
          </Text>

          <Text>
            Weight:
            {' '}
            {params.weight}
            {' '}
            {params.unit}
          </Text>

        </Card.Content>
      </Card>

      <TextInput
        label="Quantity"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
        style={styles.input}
      />

      <TextInput
        label="Customer Name"
        value={customerName}
        onChangeText={
          setCustomerName
        }
        style={styles.input}
      />

      <TextInput
        label="Mobile Number"
        keyboardType="phone-pad"
        value={mobile}
        onChangeText={setMobile}
        style={styles.input}
      />

      <TextInput
        label="Delivery Address"
        multiline
        numberOfLines={3}
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <TextInput
        label="Remarks (Optional)"
        multiline
        numberOfLines={3}
        value={remarks}
        onChangeText={setRemarks}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleOrder}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Confirm Order
      </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },

  card: {
    marginBottom: 15,
  },

  title: {
    marginBottom: 10,
    fontWeight: 'bold',
  },

  input: {
    marginBottom: 12,
  },

  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
});