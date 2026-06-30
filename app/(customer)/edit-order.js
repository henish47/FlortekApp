import { useEffect, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native-paper';
import {
  useLocalSearchParams,
  router,
} from 'expo-router';
import { getOrderById, updateOrder } from '../../services/orderService';
import Topbar from '../../components/Topbar';

export default function EditOrder() {
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);

  // Form states
  const [quantity, setQuantity] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    } else {
      Alert.alert('Error', 'Order ID is missing', [
        { text: 'Back', onPress: () => router.back() }
      ]);
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await getOrderById(id);
      if (data) {
        if (data.status !== 'Confirmed') {
          Alert.alert('Access Denied', 'Only orders in "Confirmed" phase can be edited.', [
            { text: 'Back', onPress: () => router.back() }
          ]);
          return;
        }
        setOrder(data);
        setQuantity(String(data.quantity || ''));
        setCustomerName(data.customer_name || '');
        setMobile(data.customer_mobile || '');
        setAddress(data.delivery_address || '');
        setRemarks(data.remarks || '');
      } else {
        Alert.alert('Error', 'Order not found', [
          { text: 'Back', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve order details: ' + error.message, [
        { text: 'Back', onPress: () => router.back() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const qtyNum = Number(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity greater than zero');
      return;
    }
    if (!customerName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert('Error', 'Please fill all required fields (Name, Mobile, Address)');
      return;
    }

    try {
      setSaving(true);
      
      const updatedData = {
        quantity: qtyNum,
        customer_name: customerName.trim(),
        customer_mobile: mobile.trim(),
        delivery_address: address.trim(),
        remarks: remarks.trim() || null,
      };

      // Also construct updated product_name string if needed, but usually quantity is enough
      // since product_name contains "Product x Qty".
      // Let's check how the original product name line is structured.
      // If product_name string contains "Product x Quantity", let's update it accordingly.
      if (order.product_name) {
        // e.g. "Manhole Cover (600x600, Grey, A15) x 5"
        // Let's replace the last "x Qty" with the new quantity
        const nameLines = order.product_name.split('\n');
        const updatedLines = nameLines.map(line => {
          const qtyMatch = line.match(/(.*)x\s*(\d+)$/i);
          if (qtyMatch) {
            return `${qtyMatch[1].trim()} x ${qtyNum}`;
          }
          return line;
        });
        updatedData.product_name = updatedLines.join('\n');
      }

      await updateOrder(id, updatedData);

      Alert.alert('Success', 'Order updated successfully', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/orders'),
        },
      ]);
    } catch (error) {
      console.error('[EditOrder] Failed to update order:', error);
      Alert.alert('Error', 'Failed to update order: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
      <Topbar title="Edit Order" showBack={true} roleBadge="Customer" />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Order Information
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Order Number: <Text style={{ fontWeight: 'bold' }}>{order?.order_number || `ORD-${order?.id}`}</Text>
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Products: <Text style={{ fontWeight: 'bold' }}>{order?.product_name?.replace(/\s*x\s*\d+$/i, '') || 'N/A'}</Text>
            </Text>
          </Card.Content>
        </Card>

        <TextInput
          label="Quantity"
          keyboardType="numeric"
          value={quantity}
          onChangeText={setQuantity}
          style={styles.input}
          mode="outlined"
          outlineColor="#CFD8DC"
          activeOutlineColor="#1A237E"
        />

        <TextInput
          label="Customer Name"
          value={customerName}
          onChangeText={setCustomerName}
          style={styles.input}
          mode="outlined"
          outlineColor="#CFD8DC"
          activeOutlineColor="#1A237E"
        />

        <TextInput
          label="Mobile Number"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
          style={styles.input}
          mode="outlined"
          outlineColor="#CFD8DC"
          activeOutlineColor="#1A237E"
        />

        <TextInput
          label="Delivery Address"
          multiline
          numberOfLines={3}
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          mode="outlined"
          outlineColor="#CFD8DC"
          activeOutlineColor="#1A237E"
        />

        <TextInput
          label="Remarks (Optional)"
          multiline
          numberOfLines={3}
          value={remarks}
          onChangeText={setRemarks}
          style={styles.input}
          mode="outlined"
          outlineColor="#CFD8DC"
          activeOutlineColor="#1A237E"
        />

        <Button
          mode="contained"
          onPress={handleUpdate}
          loading={saving}
          disabled={saving}
          style={styles.button}
          buttonColor="#1A237E"
          contentStyle={{ height: 48 }}
        >
          Save Changes
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 8,
  },
  infoText: {
    color: '#546E7A',
    marginTop: 4,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
  },
});
