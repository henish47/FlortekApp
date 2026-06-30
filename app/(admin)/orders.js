import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  TextInput,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Topbar from '../../components/Topbar';
import { getFilteredOrders } from '../../services/orderService';
import { supabase } from '../../services/supabase';
import { getUnreadCount, subscribeToNotifications } from '../../services/notificationService';


export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Status Filter State: 'All' | 'Confirmed' | 'Dispatched'
  const [statusFilter, setStatusFilter] = useState('All');

  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const count = await getUnreadCount(user.id);
        setUnreadCount(count);
      }
    } catch (err) {
      console.warn('Failed to get admin unread count:', err);
    }
  };

  // Reload on focus or filter changes
  useEffect(() => {
    const focusListener = () => {
      loadOrders();
      fetchUnreadCount();
    };
    const unsubscribe = navigation.addListener('focus', focusListener);
    fetchUnreadCount();
    return unsubscribe;
  }, [navigation, statusFilter, searchQuery]);

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

  const loadOrders = useCallback(async () => {
    try {
      const data = await getFilteredOrders({
        statuses: [statusFilter],
        search: searchQuery,
      });
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  // Debounced search trigger
  const searchTimer = useRef(null);
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadOrders();
    }, 400);
  };

  const getStatusColor = (status) => {
    const map = {
      Confirmed: '#0D47A1',
      Dispatched: '#004D40',
    };
    return map[status] || '#424242';
  };

  const getStatusBgColor = (status) => {
    const map = {
      Confirmed: '#E3F2FD',
      Dispatched: '#E0F2F1',
    };
    return map[status] || '#EEEEEE';
  };

  const getResponsiveColumns = () => {
    if (width > 900) return 3;
    if (width > 600) return 2;
    return 1;
  };

  const statusOptions = ['All', 'Confirmed', 'Dispatched'];

  return (
    <View style={styles.container}>
      <Topbar title="Order Management" showBack={false} roleBadge="Admin" showBell={true} unreadCount={unreadCount} />

      {/* Search Input (Full width background, centered contents) */}
      <View style={styles.searchContainer}>
        <View style={styles.innerWrapper}>
          <TextInput
            placeholder="Search by Order ID, Customer, Product..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => {
                    setSearchQuery('');
                    loadOrders();
                  }}
                />
              ) : null
            }
            style={styles.searchInput}
            outlineStyle={styles.searchOutline}
            activeOutlineColor="#1A237E"
          />
        </View>
      </View>

      {/* Simplified Status Chip Filters (Full width background, centered contents) */}
      <View style={styles.filterContainer}>
        <View style={styles.innerWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {statusOptions.map((opt) => {
              const isSelected = statusFilter === opt;
              return (
                <Chip
                  key={opt}
                  selected={isSelected}
                  onPress={() => setStatusFilter(opt)}
                  showSelectedOverlay
                  selectedColor="#ffffff"
                  style={[
                    styles.filterChip,
                    isSelected && { backgroundColor: '#1A237E' },
                  ]}
                  textStyle={[
                    styles.filterChipText,
                    isSelected && { color: '#ffffff', fontWeight: 'bold' },
                  ]}
                >
                  {opt}
                </Chip>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Orders List (Centered card container) */}
      <View style={styles.listWrapper}>
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1A237E" />
            <Text style={styles.loadingText}>Fetching orders...</Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            key={`${width}-${getResponsiveColumns()}`}
            numColumns={getResponsiveColumns()}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1A237E']}
              />
            }
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={getResponsiveColumns() > 1 ? styles.gridRow : null}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="clipboard-text-off-outline"
                  size={64}
                  color="#B0BEC5"
                />
                <Text variant="titleMedium" style={styles.emptyTitle}>
                  No Orders Found
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtitle}>
                  Try adjusting your search query or filters.
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Card
                style={[styles.card, { flex: 1 / getResponsiveColumns() }]}
                elevation={1}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text variant="titleMedium" style={styles.orderNumber}>
                      {item.order_number || `Order #${item.id}`}
                    </Text>
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

                  <View style={styles.dividerLine} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="cube-outline"
                      size={16}
                      color="#546E7A"
                      style={styles.infoIcon}
                    />
                    <View style={styles.infoTextGroup}>
                      <Text style={styles.infoLabel}>Product</Text>
                      <Text style={styles.infoValue}>{item.product_name}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color="#546E7A"
                      style={styles.infoIcon}
                    />
                    <View style={styles.infoTextGroup}>
                      <Text style={styles.infoLabel}>Customer</Text>
                      <Text style={styles.infoValue}>{item.customer_name}</Text>
                    </View>
                  </View>

                  <View style={styles.twoColumnRow}>
                    <View style={[styles.infoRow, { flex: 0.8 }]}>
                      <MaterialCommunityIcons
                        name="pound"
                        size={16}
                        color="#546E7A"
                        style={styles.infoIcon}
                      />
                      <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>Qty</Text>
                        <Text style={styles.infoValue}>{item.quantity}</Text>
                      </View>
                    </View>
                    <View style={[styles.infoRow, { flex: 1.2 }]}>
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={16}
                        color="#546E7A"
                        style={styles.infoIcon}
                      />
                      <View style={styles.infoTextGroup}>
                        <Text style={styles.infoLabel}>Mobile</Text>
                        <Text style={styles.infoValue} numberOfLines={1}>
                          {item.customer_mobile}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="calendar-outline"
                      size={16}
                      color="#546E7A"
                      style={styles.infoIcon}
                    />
                    <View style={styles.infoTextGroup}>
                      <Text style={styles.infoLabel}>Date</Text>
                      <Text style={styles.infoValue}>
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <Button
                    mode="contained-tonal"
                    style={styles.detailsBtn}
                    contentStyle={styles.detailsBtnContent}
                    labelStyle={styles.detailsBtnText}
                    onPress={() =>
                      router.push({
                        pathname: '/(admin)/order-details',
                        params: { id: item.id },
                      })
                    }
                    icon="pencil"
                    buttonColor="#E8EAF6"
                    textColor="#1A237E"
                  >
                    View & Edit
                  </Button>
                </Card.Content>
              </Card>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  listWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#546E7A',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#ffffff',
  },
  searchOutline: {
    borderRadius: 12,
    borderColor: '#E0E4EC',
  },
  filterContainer: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E4EC',
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    height: 34,
  },
  filterChipText: {
    fontSize: 12,
    color: '#546E7A',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  gridRow: {
    gap: 12,
  },
  card: {
    margin: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    overflow: 'hidden',
  },
  cardContent: {
    paddingVertical: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontWeight: 'bold',
    color: '#263238',
    flex: 1,
    marginRight: 8,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 10,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    color: '#90A4AE',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    color: '#37474F',
    fontWeight: '500',
    marginTop: 1,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsBtn: {
    marginTop: 8,
    borderRadius: 10,
  },
  detailsBtnContent: {
    height: 38,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#546E7A',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
    marginTop: 6,
  },
});