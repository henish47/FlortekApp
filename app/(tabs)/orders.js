import { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  ActivityIndicator,
  Chip,
  IconButton,
  Divider,
  Button,
} from 'react-native-paper';
import { getOrders } from '../../services/orderService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Topbar from '../../components/Topbar';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { getUnreadCount, subscribeToNotifications } from '../../services/notificationService';


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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const count = await getUnreadCount(user.id);
        setUnreadCount(count);
      }
    } catch (err) {
      console.warn('Failed to get unread count:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      fetchUnreadCount();
    }, [])
  );

  useEffect(() => {
    let channel;
    
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        channel = subscribeToNotifications(user.id, () => {
          fetchUnreadCount();
        });
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load customer orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#0D47A1';
      case 'Dispatched':
        return '#004D40';
      default:
        return '#424242';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#E3F2FD';
      case 'Dispatched':
        return '#E0F2F1';
      default:
        return '#EEEEEE';
    }
  };

  const getResponsiveColumns = () => {
    if (width > 900) return 3;
    if (width > 600) return 2;
    return 1;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Topbar title="My Orders" roleBadge="Customer" showBell={true} unreadCount={unreadCount} />

      {/* Orders List */}
      <FlatList
        data={orders}
        key={`${width}-${getResponsiveColumns()}`}
        numColumns={getResponsiveColumns()}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
        }
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={
          getResponsiveColumns() > 1 ? styles.gridRow : null
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-outline" size={64} color="#B0BEC5" />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No Orders Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              You haven't placed any orders yet. Go to Home to browse FRP products.
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          return (
            <Card
              style={[
                styles.card,
                { flex: 1 / getResponsiveColumns() }
              ]}
              elevation={2}
            >
              {/* Card Header styling */}
              <View style={[styles.cardHeader, { borderLeftColor: getStatusColor(item.status) }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.orderNumber}>
                    {item.order_number || `Order #${item.id}`}
                  </Text>
                  <Text variant="bodySmall" style={styles.dateText}>
                    Placed on {new Date(item.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.headerRight}>
                  <Chip
                    style={{ backgroundColor: getStatusBgColor(item.status) }}
                    textStyle={{
                      color: getStatusColor(item.status),
                      fontWeight: 'bold',
                      fontSize: 11,
                    }}
                    compact
                  >
                    {item.status}
                  </Chip>
                </View>
              </View>

              <Card.Content style={styles.cardContent}>
                {/* Summary Details */}
                <View style={styles.orderItemsBox}>
                  <Text variant="labelMedium" style={styles.itemsTitle}>Items Ordered</Text>
                  {item.product_name.split('\n').map((line, idx) => (
                    <View key={idx} style={styles.productLineRow}>
                      <MaterialCommunityIcons name="circle-medium" size={18} color="#1A237E" style={{ marginRight: 4 }} />
                      <Text variant="bodyMedium" style={styles.productLineText}>
                        {line}
                      </Text>
                    </View>
                  ))}
                  
                  <View style={styles.totalQtyRow}>
                    <Text variant="bodySmall" style={styles.totalQtyLabel}>Total Quantity:</Text>
                    <Text variant="bodyMedium" style={styles.totalQtyValue}>{item.quantity}</Text>
                  </View>
                </View>

                {/* Status Banners for LR or Remarks */}
                <>
                  {item.lr_number ? (
                    <View style={styles.lrBox}>
                      <MaterialCommunityIcons name="truck-delivery-outline" size={16} color="#004D40" />
                      <Text variant="bodySmall" style={styles.lrText}>
                        LR Number: <Text style={{ fontWeight: 'bold' }}>{item.lr_number}</Text>
                      </Text>
                    </View>
                  ) : null}
                  {item.transport_name ? (
                    <View style={[styles.lrBox, { backgroundColor: '#E3F2FD', marginTop: 6 }]}>
                      <MaterialCommunityIcons name="truck-outline" size={16} color="#0D47A1" />
                      <Text variant="bodySmall" style={[styles.lrText, { color: '#0D47A1' }]}>
                        Transport: <Text style={{ fontWeight: 'bold' }}>{item.transport_name}</Text>
                      </Text>
                    </View>
                  ) : null}
                  {item.admin_remark ? (
                    <View style={styles.remarkBox}>
                      <MaterialCommunityIcons name="comment-outline" size={14} color="#E65100" />
                      <Text variant="bodySmall" style={styles.remarkText}>
                        Admin Note: {item.admin_remark}
                      </Text>
                    </View>
                  ) : null}
                </>

                <Divider style={styles.divider} />
                <View style={styles.cardActionsRow}>
                  <Button
                    mode="outlined"
                    style={[styles.actionBtn, { flex: 1 }]}
                    contentStyle={{ height: 38 }}
                    labelStyle={{ fontSize: 12, fontWeight: '700' }}
                    onPress={() =>
                      router.push({
                        pathname: '/(customer)/order-details',
                        params: { id: item.id },
                      })
                    }
                    icon="eye-outline"
                    textColor="#1A237E"
                  >
                    View Details
                  </Button>
                  
                  {item.status === 'Confirmed' && (
                    <Button
                      mode="contained"
                      style={[styles.actionBtn, { flex: 1 }]}
                      contentStyle={{ height: 38 }}
                      labelStyle={{ fontSize: 12, fontWeight: '700' }}
                      onPress={() =>
                        router.push({
                          pathname: '/(customer)/edit-order',
                          params: { id: item.id },
                        })
                      }
                      icon="pencil-outline"
                      buttonColor="#1A237E"
                      textColor="#ffffff"
                    >
                      Edit Order
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  listContainer: {
    padding: 8,
    paddingBottom: 32,
  },
  gridRow: {
    gap: 8,
  },
  card: {
    margin: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderLeftWidth: 4,
  },
  orderNumber: {
    fontWeight: 'bold',
    color: '#263238',
  },
  dateText: {
    fontSize: 11,
    color: '#90A4AE',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronIcon: {
    margin: 0,
    marginLeft: 4,
  },
  cardContent: {
    paddingVertical: 10,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#FAFBFC',
    padding: 10,
    borderRadius: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  productText: {
    color: '#37474F',
    fontWeight: '600',
    fontSize: 13,
  },
  summaryText: {
    color: '#546E7A',
    fontSize: 13,
  },
  expandedContent: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: '#ECEFF1',
  },
  innerDivider: {
    marginVertical: 12,
    backgroundColor: '#ECEFF1',
  },
  timelineHeading: {
    fontWeight: 'bold',
    color: '#37474F',
    fontSize: 14,
    marginBottom: 12,
  },
  subHeading: {
    fontWeight: 'bold',
    color: '#37474F',
    fontSize: 13,
    marginBottom: 8,
  },
  timelineContainer: {
    paddingLeft: 4,
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
  deliveryDetails: {
    backgroundColor: '#FAFBFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  shipInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  shippingText: {
    color: '#546E7A',
    fontSize: 12,
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    borderRadius: 10,
    borderColor: '#1A237E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontWeight: 'bold',
    color: '#546E7A',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
    marginTop: 6,
  },

  // Cancelled Banner styles
  cancelledBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#C62828',
    marginVertical: 4,
  },
  cancelledTitle: {
    color: '#C62828',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelledDesc: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  cancelledRemark: {
    color: '#B71C1C',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  orderItemsBox: {
    backgroundColor: '#FAFBFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    padding: 12,
    marginTop: 6,
  },
  itemsTitle: {
    fontWeight: '700',
    color: '#78909C',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  productLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 10,
  },
  productLineText: {
    color: '#37474F',
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  totalQtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  totalQtyLabel: {
    color: '#78909C',
    fontSize: 12,
  },
  totalQtyValue: {
    color: '#1A237E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  lrText: {
    color: '#004D40',
    fontSize: 12,
  },
  remarkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  remarkText: {
    color: '#E65100',
    fontSize: 12,
  },
  cancelledShortBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  cancelledShortText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
  },
});