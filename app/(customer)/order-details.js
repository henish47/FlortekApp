import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getOrderById } from '../../services/orderService';
import { getUserProfile } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Topbar from '../../components/Topbar';

const STATUS_RANK = {
  'Confirmed': 1,
  'Production': 2,
  'Dispatched': 3,
  'Delivered': 4,
};

const TIMELINE_STEPS = [
  { key: 'Confirmed', label: 'Confirmed', icon: 'clipboard-check-outline', desc: 'Your order has been confirmed.' },
  { key: 'Dispatched', label: 'Dispatched', icon: 'truck-delivery-outline', desc: 'Shipped from warehouse.' },
];

export default function CustomerOrderDetails() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [order, setOrder] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setOrder(data);
        try {
          const profileData = await getUserProfile(data.user_id);
          if (profileData) {
            setProfile(profileData);
          }
        } catch (profileErr) {
          console.warn('Failed to load profile for customer order details:', profileErr);
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
      companyName: parsed.companyName || (profile?.company_name?.trim() || undefined) || 'N/A',
      address: parsed.address || (profile?.address?.trim() || undefined) || order?.delivery_address || '',
      city: parsed.city || (profile?.city?.trim() || undefined) || 'N/A',
      state: parsed.state || (profile?.state?.trim() || undefined) || 'N/A',
      pincode: parsed.pincode || (profile?.pincode?.trim() || undefined) || 'N/A'
    };
  };

  const isLargeScreen = width > 768;
  const currentRank = STATUS_RANK[order?.status] || 1;

  // Render components
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

  const ShippingSection = () => {
    const details = getDisplayDetails();
    return (
      <Card style={styles.card} elevation={1}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionHeader}>
            Shipping & Contact
          </Text>
          <Divider style={styles.divider} />
          
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="account-outline" size={20} color="#546E7A" style={styles.detailIcon} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Deliver To
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
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={styles.label}>
                Contact Number
              </Text>
              <Text variant="bodyLarge" style={styles.value}>
                {order?.customer_mobile}
              </Text>
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
                Your Remarks
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

  const TimelineSection = () => (
    <Card style={styles.card} elevation={1}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.sectionHeader}>
          Fulfillment Timeline
        </Text>
        <Divider style={styles.divider} />

        <View style={styles.timelineContainer}>
          {TIMELINE_STEPS.map((step, idx) => {
            const stepRank = STATUS_RANK[step.key];
            const isCompleted = currentRank > stepRank;
            const isCurrent = currentRank === stepRank;
            const lineCompleted = currentRank > stepRank;

            let dotStyle = styles.dotUpcoming;
            let iconName = step.icon;
            let iconColor = '#90A4AE';

            if (isCompleted) {
              dotStyle = styles.dotCompleted;
              iconName = 'check';
              iconColor = '#ffffff';
            } else if (isCurrent) {
              dotStyle = styles.dotCurrent;
              iconColor = '#ffffff';
            }

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.timelineLeftColumn}>
                  <View style={[styles.timelineDot, dotStyle]}>
                    <MaterialCommunityIcons
                      name={iconName}
                      size={isCompleted ? 14 : 16}
                      color={iconColor}
                    />
                  </View>
                  {idx < TIMELINE_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        lineCompleted ? styles.lineCompleted : styles.lineUpcoming,
                      ]}
                    />
                  )}
                </View>

                <View style={styles.timelineRightColumn}>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.stepLabel,
                      isCompleted && styles.stepCompletedText,
                      isCurrent && styles.stepCurrentText,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text variant="bodySmall" style={styles.stepDesc}>
                    {step.desc}
                  </Text>

                  {/* Shipment Tracking details */}
                  {step.key === 'Dispatched' && (isCompleted || isCurrent) && (order?.lr_number || order?.transport_name) && (
                    <View style={{ gap: 6, marginTop: 6, alignItems: 'flex-start' }}>
                      {order?.lr_number && (
                        <View style={styles.shippingBadge}>
                          <MaterialCommunityIcons name="truck-delivery" size={14} color="#004D40" />
                          <Text style={styles.shippingBadgeText}>
                            LR No: {order.lr_number}
                          </Text>
                        </View>
                      )}
                      {order?.transport_name && (
                        <View style={[styles.shippingBadge, { backgroundColor: '#E3F2FD' }]}>
                          <MaterialCommunityIcons name="truck-outline" size={14} color="#0D47A1" />
                          <Text style={[styles.shippingBadgeText, { color: '#0D47A1' }]}>
                            Transport: {order.transport_name}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Delivery details remarks */}
                  {step.key === 'Dispatched' && (isCompleted || isCurrent) && order?.admin_remark && (
                    <Text variant="bodySmall" style={styles.remarksText}>
                      <Text style={{ fontWeight: 'bold' }}>Note: </Text>
                      {order.admin_remark}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card.Content>
    </Card>
  );

  const formatExpectedDeliveryDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getRemainingDaysText = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(dateStr);
    delivery.setHours(0, 0, 0, 0);

    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Delivery date has passed';
    } else if (diffDays === 0) {
      return 'Delivering today';
    } else if (diffDays === 1) {
      return '1 Day Remaining';
    } else {
      return `${diffDays} Days Remaining`;
    }
  };

  const DeliveryDateSection = () => {
    if (!order?.expected_delivery_date) return null;

    const formattedDate = formatExpectedDeliveryDate(order.expected_delivery_date);
    const remainingDaysText = getRemainingDaysText(order.expected_delivery_date);
    const isPassed = remainingDaysText === 'Delivery date has passed';
    const isToday = remainingDaysText === 'Delivering today';

    let bannerBg = '#E8F5E9'; // Light green for positive days
    let bannerTextColor = '#2E7D32';
    let bannerIcon = 'calendar-clock';

    if (isPassed) {
      bannerBg = '#FFEBEE'; // Light red for passed
      bannerTextColor = '#C62828';
      bannerIcon = 'calendar-remove';
    } else if (isToday) {
      bannerBg = '#E3F2FD'; // Light blue for today
      bannerTextColor = '#0D47A1';
      bannerIcon = 'calendar-check';
    }

    return (
      <Card style={[styles.card, styles.deliveryDateCard]} elevation={2}>
        <Card.Content style={styles.deliveryDateContent}>
          <View style={styles.deliveryHeaderRow}>
            <MaterialCommunityIcons name={bannerIcon} size={24} color="#1A237E" style={styles.deliveryHeaderIcon} />
            <View>
              <Text variant="bodySmall" style={styles.deliveryLabel}>
                Expected Delivery Date
              </Text>
              <Text variant="titleMedium" style={styles.deliveryDateText}>
                {formattedDate}
              </Text>
            </View>
          </View>

          <Divider style={styles.deliveryDivider} />

          <View style={[styles.remainingBanner, { backgroundColor: bannerBg }]}>
            <MaterialCommunityIcons
              name={isPassed ? "alert-circle-outline" : "clock-outline"}
              size={18}
              color={bannerTextColor}
            />
            <Text style={[styles.remainingText, { color: bannerTextColor }]}>
              {remainingDaysText}
            </Text>
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
        onBack={() => router.replace('/(tabs)/orders')}
        roleBadge="Customer"
      />

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <SummarySection />
        {DeliveryDateSection()}

        {isLargeScreen ? (
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <ProductSection />
              <ShippingSection />
            </View>
            <View style={styles.gridColumn}>
              <TimelineSection />
            </View>
          </View>
        ) : (
          <View>
            <ProductSection />
            <ShippingSection />
            <TimelineSection />
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
  timelineContainer: {
    paddingLeft: 4,
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  dotCompleted: {
    backgroundColor: '#2E7D32',
  },
  dotCurrent: {
    backgroundColor: '#1565C0',
    transform: [{ scale: 1.1 }],
  },
  dotUpcoming: {
    borderWidth: 1.5,
    borderColor: '#B0BEC5',
    backgroundColor: '#ffffff',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 2,
    zIndex: 1,
  },
  lineCompleted: {
    backgroundColor: '#2E7D32',
  },
  lineUpcoming: {
    backgroundColor: '#ECEFF1',
  },
  timelineRightColumn: {
    flex: 1,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78909C',
  },
  stepCompletedText: {
    color: '#2E7D32',
  },
  stepCurrentText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  stepDesc: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 1,
  },
  shippingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  shippingBadgeText: {
    color: '#004D40',
    fontSize: 11,
    fontWeight: '600',
  },
  remarksText: {
    color: '#E65100',
    fontSize: 11,
    marginTop: 6,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  gridColumn: {
    flex: 1,
  },
  deliveryDateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1A237E',
  },
  deliveryDateContent: {
    paddingVertical: 12,
  },
  deliveryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryHeaderIcon: {
    marginRight: 12,
  },
  deliveryLabel: {
    fontSize: 11,
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryDateText: {
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 2,
  },
  deliveryDivider: {
    marginVertical: 10,
    backgroundColor: '#ECEFF1',
  },
  remainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
