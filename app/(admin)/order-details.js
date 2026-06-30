import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  Linking,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider,
  Menu,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getOrderById, updateOrderStatus, deleteOrder, updateLRNumber } from '../../services/orderService';
import { getCurrentUser, getUserProfile } from '../../services/authService';
import { getProductById } from '../../services/productService';
import { generateSingleOrderPDF, downloadPDF, sharePDF, savePDFToCustomFolder } from '../../services/pdfService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Topbar from '../../components/Topbar';
import DateTimePicker from '@react-native-community/datetimepicker';

const STATUSES = ['Confirmed', 'Dispatched'];

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [order, setOrder] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [role, setRole] = useState(null);

  // Editable fields
  const [status, setStatus] = useState('Confirmed');
  const [lrNumber, setLrNumber] = useState('');
  const [transportName, setTransportName] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser();
        if (user) {
          const profile = await getUserProfile(user.id);
          if (profile) {
            setRole(profile.role);
          }
        }
      } catch (err) {
        console.error('Failed to init role in order details:', err);
      }
    }
    init();

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
      setOrder(data);
      if (data) {
        setStatus(data.status || 'Confirmed');
        setLrNumber(data.lr_number || '');
        setTransportName(data.transport_name || '');
        setAdminRemarks(data.admin_remark || '');
        setExpectedDeliveryDate(data.expected_delivery_date || null);
        
        try {
          const profileData = await getUserProfile(data.user_id);
          if (profileData) {
            setCustomerProfile(profileData);
          }
        } catch (profileErr) {
          console.warn('Failed to load profile for admin order details view:', profileErr);
        }

        if (data.product_id) {
          try {
            const productData = await getProductById(data.product_id);
            setProduct(productData);
          } catch (productErr) {
            console.warn('Failed to load product details for admin order details view:', productErr);
          }
        }
      } else {
        Alert.alert('Error', 'Order not found or access denied', [
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

  const handleCall = () => {
    if (order?.customer_mobile) {
      Linking.openURL(`tel:${order.customer_mobile}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate call on this device');
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedOrder = await updateLRNumber(id, lrNumber, status, adminRemarks, null, transportName);
      if (updatedOrder) {
        setOrder(updatedOrder);
        setStatus(updatedOrder.status || 'Confirmed');
        setLrNumber(updatedOrder.lr_number || '');
        setTransportName(updatedOrder.transport_name || '');
        setAdminRemarks(updatedOrder.admin_remark || '');
        setExpectedDeliveryDate(null);
        Alert.alert('Success', 'Order updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update order: Order not found or access denied');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update order: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setPdfLoading(true);
      const orderNumber = order?.order_number || `ORD-${order?.id}`;
      const filename = `FLORTEK_ORDER_${orderNumber}.pdf`;
      
      console.log('[OrderDetails] Generating single order PDF...');
      const tempUri = await generateSingleOrderPDF(order, customerProfile, product);
      
      if (Platform.OS === 'android') {
        setPdfLoading(false); // Hide loader so Alert isn't blocked/overlapped on Android
        Alert.alert(
          'Download PDF',
          'Choose how you want to save the PDF file:',
          [
            {
              text: 'Save/Share via Menu',
              onPress: async () => {
                try {
                  setPdfLoading(true);
                  const savedUri = await downloadPDF(tempUri, filename);
                  console.log('[OrderDetails] Android direct share sheet download complete:', savedUri);
                } catch (err) {
                  console.error('[OrderDetails] Failed to save/share PDF:', err);
                  Alert.alert('Error', 'Failed to save PDF: ' + err.message);
                } finally {
                  setPdfLoading(false);
                }
              }
            },
            {
              text: 'Save to Custom Folder',
              onPress: async () => {
                try {
                  setPdfLoading(true);
                  const savedUri = await savePDFToCustomFolder(tempUri, filename);
                  if (savedUri) {
                    Alert.alert('Success', 'PDF saved to custom folder successfully!');
                  }
                } catch (err) {
                  console.error('[OrderDetails] Failed to save to custom folder:', err);
                  if (err.message && err.message.includes('not granted')) {
                    Alert.alert('Cancelled', 'Folder permission not granted. PDF was not saved.');
                  } else {
                    Alert.alert('Error', 'Failed to save PDF to folder: ' + err.message);
                  }
                } finally {
                  setPdfLoading(false);
                }
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        // iOS or other: direct download (copies to sandboxed folder and calls Share Sheet to "Save to Files")
        const savedUri = await downloadPDF(tempUri, filename);
        console.log('[OrderDetails] iOS/Other download completed: ', savedUri);
      }
    } catch (err) {
      console.error('[OrderDetails] Failed to download PDF:', err);
      Alert.alert('Error', 'Failed to generate PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSharePDF = async () => {
    try {
      setPdfLoading(true);
      const orderNumber = order?.order_number || `ORD-${order?.id}`;
      const filename = `FLORTEK_ORDER_${orderNumber}.pdf`;
      
      console.log('[OrderDetails] Generating single order PDF for sharing...');
      const tempUri = await generateSingleOrderPDF(order, customerProfile, product);
      
      console.log('[OrderDetails] Sharing PDF...');
      await sharePDF(tempUri, filename);
    } catch (err) {
      console.error('[OrderDetails] Failed to share PDF:', err);
      Alert.alert('Error', 'Failed to share PDF: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  };


  const getStatusColor = (statusName) => {
    switch (statusName) {
      case 'Confirmed':
        return '#0D47A1';
      case 'Dispatched':
        return '#004D40';
      default:
        return '#424242';
    }
  };

  const getStatusBgColor = (statusName) => {
    switch (statusName) {
      case 'Confirmed':
        return '#E3F2FD';
      case 'Dispatched':
        return '#E0F2F1';
      default:
        return '#EEEEEE';
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

  const getDisplayDetails = () => {
    const defaultDetails = {
      companyName: 'N/A',
      address: order?.delivery_address || '',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A'
    };

    // Parse order.delivery_address if possible
    let parsed = {};
    if (order?.delivery_address) {
      const parts = order.delivery_address.split(',').map(p => p.trim());
      if (parts.length >= 5) {
        parsed = {
          companyName: parts[0],
          address: parts.slice(1, parts.length - 3).join(', '),
          city: parts[parts.length - 3],
          state: parts[parts.length - 2],
          pincode: parts[parts.length - 1]
        };
      } else if (parts.length === 4) {
        parsed = {
          address: parts[0],
          city: parts[1],
          state: parts[2],
          pincode: parts[3]
        };
      }
    }

    // Merge parsed details with profile details, fallback to 'N/A'
    return {
      companyName: parsed.companyName || (customerProfile?.company_name?.trim() || undefined) || 'N/A',
      address: parsed.address || (customerProfile?.address?.trim() || undefined) || order?.delivery_address || '',
      city: parsed.city || (customerProfile?.city?.trim() || undefined) || 'N/A',
      state: parsed.state || (customerProfile?.state?.trim() || undefined) || 'N/A',
      pincode: parsed.pincode || (customerProfile?.pincode?.trim() || undefined) || 'N/A'
    };
  };

  const isLargeScreen = width > 768;

  // Components to render
  const SummarySection = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <View style={styles.summaryRow}>
          <View>
            <Text variant="bodySmall" style={styles.label}>
              Order Number
            </Text>
            <Text variant="titleLarge" style={styles.orderTitle}>
              {order?.order_number || `Order #${order?.id}`}
            </Text>
            <Text variant="bodySmall" style={styles.dateText}>
              Placed on {new Date(order?.created_at).toLocaleString()}
            </Text>
          </View>
          <Chip
            style={{ backgroundColor: getStatusBgColor(order?.status) }}
            textStyle={{
              color: getStatusColor(order?.status),
              fontWeight: 'bold',
            }}
          >
            {order?.status}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const ProductSection = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Product Details
        </Text>
        <Divider style={styles.divider} />
        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="cube-outline" size={20} color="#546E7A" style={styles.detailIcon} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={styles.label}>
              Product Name
            </Text>
            <Text variant="bodyLarge" style={styles.value}>
              {order?.product_name}
            </Text>
          </View>
        </View>

        {product && (
          <>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="tag-outline" size={20} color="#546E7A" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.label}>
                  Category
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {product.category || 'N/A'}
                </Text>
              </View>
            </View>
            {product.sub_category ? (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="tag-multiple-outline" size={20} color="#546E7A" style={styles.detailIcon} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={styles.label}>
                    Sub Category
                  </Text>
                  <Text variant="bodyLarge" style={styles.value}>
                    {product.sub_category}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="arrow-expand-all" size={20} color="#546E7A" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.label}>
                  Size
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {product.size || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="weight" size={20} color="#546E7A" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.label}>
                  Load Capacity
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {product.weight ? `${product.weight} ${product.unit || 'KG'}`.trim() : 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="palette-outline" size={20} color="#546E7A" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.label}>
                  Color
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {product.color || 'Standard'}
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.detailItem}>
          <MaterialCommunityIcons name="pound" size={20} color="#546E7A" style={styles.detailIcon} />
          <View style={{ flex: 1 }}>
            <Text variant="bodySmall" style={styles.label}>
              Quantity
            </Text>
            <Text variant="bodyLarge" style={styles.value}>
              {order?.quantity}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const CustomerSection = () => {
    const details = getDisplayDetails();
    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Customer Details
          </Text>
          <Divider style={styles.divider} />
          
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Name
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order?.customer_name}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="briefcase-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Company Name
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {details.companyName}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={styles.customerPhoneRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.label}>
                  Mobile Number
                </Text>
                <Text variant="bodyLarge" style={styles.value}>
                  {order?.customer_mobile}
                </Text>
              </View>
              <IconButton
                icon="phone"
                mode="contained"
                containerColor="#E8F5E9"
                iconColor="#2E7D32"
                size={20}
                onPress={handleCall}
                style={styles.phoneBtn}
              />
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Delivery Address
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {details.address}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="city" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                City
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {details.city}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="map-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                State
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {details.state}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="numeric" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Zip Code / Pincode
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {details.pincode}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="comment-text-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Customer Remarks
              </Text>
              <Text variant="bodyLarge" style={[styles.value, !order?.remarks && styles.italicText]}>
                {order?.remarks || 'No remarks provided'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const formatExpectedDeliveryDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate && event.type !== 'dismissed') {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      setExpectedDeliveryDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const EditSection = () => {
    const isStatusEditable = role === 'admin' || role === 'production' || role === 'dispatch';

    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Update Fulfillment Status
          </Text>
          <Divider style={styles.divider} />

          {/* Status Dropdown */}
          <Text variant="bodySmall" style={styles.inputLabel}>
            Fulfillment Phase (Status)
          </Text>
          <View style={{ marginBottom: 16 }}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => {
                    if (isStatusEditable) {
                      setMenuVisible(true);
                    }
                  }}
                  disabled={!isStatusEditable}
                  activeOpacity={0.7}
                >
                  <TextInput
                    label="Order Status"
                    value={status}
                    editable={false}
                    mode="outlined"
                    right={
                      isStatusEditable ? (
                        <TextInput.Icon icon="menu-down" onPress={() => setMenuVisible(true)} />
                      ) : null
                    }
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                </TouchableOpacity>
              }
            >
              {STATUSES.map((statusName) => (
                <Menu.Item
                  key={statusName}
                  onPress={() => {
                    setStatus(statusName);
                    setMenuVisible(false);
                  }}
                  title={statusName}
                  titleStyle={{
                    color: status === statusName ? '#1A237E' : '#263238',
                    fontWeight: status === statusName ? 'bold' : 'normal',
                  }}
                />
              ))}
            </Menu>
          </View>

          {/* LR Number */}
          <TextInput
            label="LR Number / Tracking ID"
            value={lrNumber}
            onChangeText={(text) => setLrNumber(text)}
            mode="outlined"
            placeholder="e.g. LR-98319"
            style={styles.input}
            left={<TextInput.Icon icon="truck-delivery" color="#546E7A" />}
            outlineColor="#CFD8DC"
            activeOutlineColor="#1A237E"
          />

          {/* Transport Name */}
          <TextInput
            label="Transport Name"
            value={transportName}
            onChangeText={(text) => setTransportName(text)}
            mode="outlined"
            placeholder="e.g. VRL Logistics"
            style={styles.input}
            left={<TextInput.Icon icon="truck-outline" color="#546E7A" />}
            outlineColor="#CFD8DC"
            activeOutlineColor="#1A237E"
          />

          {/* Admin Remarks */}
          <TextInput
            label="Admin Remarks"
            value={adminRemarks}
            onChangeText={setAdminRemarks}
            mode="outlined"
            placeholder="Internal fulfillment notes"
            multiline
            numberOfLines={3}
            style={styles.input}
            left={<TextInput.Icon icon="clipboard-edit-outline" color="#546E7A" />}
            outlineColor="#CFD8DC"
            activeOutlineColor="#1A237E"
          />

          {/* Actions */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
            contentStyle={styles.btnContent}
            icon="content-save"
            buttonColor="#1A237E"
          >
            Save Changes
          </Button>

        </Card.Content>
      </Card>
    );
  };

  const PdfActionsSection = () => {
    if (role !== 'admin') return null;

    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Order Document Controls
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.pdfActionsRow}>
            <Button
              mode="contained"
              onPress={handleDownloadPDF}
              loading={pdfLoading}
              disabled={pdfLoading}
              icon="file-download-outline"
              style={styles.pdfBtn}
              buttonColor="#1A237E"
              contentStyle={styles.btnContent}
            >
              Download PDF
            </Button>
            <Button
              mode="outlined"
              onPress={handleSharePDF}
              loading={pdfLoading}
              disabled={pdfLoading}
              icon="share-variant-outline"
              style={styles.pdfBtn}
              textColor="#1A237E"
              borderColor="#1A237E"
              contentStyle={styles.btnContent}
            >
              Share PDF
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Topbar
        title="Order Details"
        showBack={true}
        onBack={() => router.replace('/(admin)/orders')}
        roleBadge={role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff'}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Order Info Summary */}
        {SummarySection()}

        {PdfActionsSection()}

        {isLargeScreen ? (
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>{CustomerSection()}{ProductSection()}</View>
            <View style={styles.gridColumn}>{EditSection()}</View>
          </View>
        ) : (
          <View>
            {CustomerSection()}
            {ProductSection()}
            {EditSection()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  backBtn: {
    margin: 0,
    marginRight: 8,
  },
  heading: {
    fontWeight: 'bold',
    color: '#1A237E',
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderTitle: {
    fontWeight: 'bold',
    color: '#263238',
  },
  dateText: {
    color: '#78909C',
    marginTop: 4,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#37474F',
    fontSize: 16,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#ECEFF1',
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    color: '#90A4AE',
    textTransform: 'uppercase',
  },
  value: {
    color: '#37474F',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  italicText: {
    fontStyle: 'italic',
    color: '#90A4AE',
  },
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phoneBtn: {
    margin: 0,
  },
  inputLabel: {
    color: '#90A4AE',
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    height: 32,
    borderRadius: 16,
  },
  input: {
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 10,
  },
  deleteBtn: {
    marginTop: 12,
    borderRadius: 10,
  },
  btnContent: {
    height: 48,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  gridColumn: {
    flex: 1,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFD8DC',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FAFBFC',
    marginBottom: 16,
    marginTop: 2,
  },
  dateValueText: {
    color: '#263238',
    fontWeight: '500',
    fontSize: 14,
  },
  iosModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iosModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  iosModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iosModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pdfBtn: {
    flex: 1,
    borderRadius: 10,
  },
});
