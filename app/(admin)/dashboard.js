import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Card, Text, ActivityIndicator, Menu, Button, Divider, Portal, Dialog } from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { supabase } from '../../services/supabase';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getUnreadCount, subscribeToNotifications } from '../../services/notificationService';
import { getDashboardData, getUserStats } from '../../services/dashboardService';
import { getDateRange, buildFilterSummary, DATE_PRESETS, getDateRangeLabel } from '../../utils/dateFilters';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [role, setRole] = useState(null);
  const [adminName, setAdminName] = useState('Staff');

  // Order Counts (driven by dashboardService)
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [confirmedOrders, setConfirmedOrders] = useState(0);
  const [dispatchedOrders, setDispatchedOrders] = useState(0);


  const [currentUserId, setCurrentUserId] = useState(null);
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

    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
    });

    fetchUnreadCount();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      unsubscribe();
    };
  }, [navigation]);

  // Dashboard date filter
  const [dashDatePreset, setDashDatePreset] = useState('All Time');
  const [dashCustomFrom, setDashCustomFrom] = useState(null);
  const [dashCustomTo, setDashCustomTo] = useState(null);

  // Dropdown / Custom Datepicker state
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [showCustomRangeDialog, setShowCustomRangeDialog] = useState(false);
  const [pickerStep, setPickerStep] = useState('from'); // 'from' | 'to'
  const [tempFrom, setTempFrom] = useState(new Date());
  const [tempTo, setTempTo] = useState(new Date());

  const formatDate = (date) =>
    date
      ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Pick date';

  const { width } = useWindowDimensions();

  useEffect(() => {
    loadDashboard();
  }, [dashDatePreset, dashCustomFrom, dashCustomTo]);



  const loadDashboard = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);

      // 1. Fetch current user & role (only once; role doesn't change per filter)
      const { data: { user } } = await supabase.auth.getUser();
      let userRole = role || 'staff';

      if (user && !role) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (profile) {
          userRole = profile.role;
          setRole(profile.role);
          setAdminName(profile.full_name || 'Staff');
        }

      }

      // 2. Build date range from current preset
      const dateRange = getDateRange(dashDatePreset, dashCustomFrom, dashCustomTo);

      // 3. Fetch dashboard stats via dashboardService (parallel queries)
      const { orders, productCount } = await getDashboardData(dateRange);

      setTotalOrders(orders.total);
      setConfirmedOrders(orders.confirmed);
      setDispatchedOrders(orders.dispatched);
      setTotalProducts(productCount);


    } catch (error) {
      console.log('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const isWide = width > 600;

  return (
    <View style={styles.container}>
      {/* Topbar Header */}
      <Topbar
        title="Dashboard"
        dark={true}
        showMenu={false}
        showLogout={true}
        showBell={true}
        unreadCount={unreadCount}
      />

      {/* Dashboard Date Dropdown Filter */}
      <View style={styles.filterBarContainer}>
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setFilterMenuVisible(true)}
              icon="calendar"
              style={styles.dropdownBtn}
              contentStyle={styles.dropdownBtnContent}
              textColor="#1A237E"
            >
              {getDateRangeLabel(dashDatePreset, dashCustomFrom, dashCustomTo)}
            </Button>
          }
        >
          {DATE_PRESETS.map((preset) => (
            <Menu.Item
              key={preset}
              onPress={() => {
                setFilterMenuVisible(false);
                if (preset === 'Custom Range') {
                  setTempFrom(dashCustomFrom || new Date());
                  setTempTo(dashCustomTo || new Date());
                  setPickerStep('from');
                  setShowCustomRangeDialog(true);
                } else {
                  setDashDatePreset(preset);
                  setDashCustomFrom(null);
                  setDashCustomTo(null);
                }
              }}
              title={preset}
              titleStyle={{
                color: dashDatePreset === preset ? '#1A237E' : '#37474F',
                fontWeight: dashDatePreset === preset ? 'bold' : 'normal',
              }}
            />
          ))}
        </Menu>

        {dashDatePreset !== 'All Time' && (
          <TouchableOpacity
            onPress={() => {
              setDashDatePreset('All Time');
              setDashCustomFrom(null);
              setDashCustomTo(null);
            }}
            style={styles.clearFilterBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color="#EF5350" style={{ marginRight: 3 }} />
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        bounces={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" colors={['#1A237E']} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.profileRow}>
            {/* Avatar with Crown Badge */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account" size={32} color="#ffffff" />
              </View>
              {role === 'admin' && (
                <View style={styles.crownBadge}>
                  <MaterialCommunityIcons name="crown" size={10} color="#ffffff" />
                </View>
              )}
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.profileName}>{adminName}</Text>
              <Text style={styles.profileSubtitle}>
                Role: {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff'}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Container (Card Overlay) */}
        <View style={styles.contentCard}>
          
          {/* Order Metrics Section */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Order Status Summary
          </Text>
          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={styles.gridRow}>
              {/* Total Orders */}
              <TouchableOpacity
                style={styles.metricCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/orders', params: { status: 'All' } })}
              >
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#ECEFF1' }]}>
                    <MaterialCommunityIcons name="clipboard-list-outline" size={24} color="#37474F" />
                  </View>
                  <View style={styles.metricValueWrapper}>
                    <Text style={styles.metricLabel}>Total Orders</Text>
                    <Text style={styles.metricValue}>{totalOrders}</Text>
                  </View>
                </View>
                <View style={styles.metricCardFooter}>
                  <Text style={[styles.metricLinkText, { color: '#37474F' }]}>All orders</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#37474F" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.gridRow}>
              {/* Confirmed Orders */}
              <TouchableOpacity
                style={styles.metricCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/orders', params: { status: 'Confirmed' } })}
              >
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <MaterialCommunityIcons name="thumb-up-outline" size={24} color="#1A237E" />
                  </View>
                  <View style={styles.metricValueWrapper}>
                    <Text style={styles.metricLabel}>Confirmed</Text>
                    <Text style={styles.metricValue}>{confirmedOrders}</Text>
                  </View>
                </View>
                <View style={styles.metricCardFooter}>
                  <Text style={[styles.metricLinkText, { color: '#1A237E' }]}>Verified</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#1A237E" />
                </View>
              </TouchableOpacity>

              {/* Dispatched Orders */}
              <TouchableOpacity
                style={styles.metricCard}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(admin)/orders', params: { status: 'Dispatched' } })}
              >
                <View style={styles.metricCardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#E0F2F1' }]}>
                    <MaterialCommunityIcons name="truck-delivery-outline" size={24} color="#009688" />
                  </View>
                  <View style={styles.metricValueWrapper}>
                    <Text style={styles.metricLabel}>Dispatched</Text>
                    <Text style={styles.metricValue}>{dispatchedOrders}</Text>
                  </View>
                </View>
                <View style={styles.metricCardFooter}>
                  <Text style={[styles.metricLinkText, { color: '#009688' }]}>On the way</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#009688" />
                </View>
              </TouchableOpacity>
            </View>
          </View>





          {/* Quick Actions List */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.actionsContainer}>
            {/* Manage Orders (All Staff) */}
            <TouchableOpacity
              style={styles.actionBtnSolid}
              activeOpacity={0.8}
              onPress={() => router.push('/(admin)/orders')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#ffffff" style={styles.actionIcon} />
                <Text style={styles.actionTextSolid}>Manage Orders</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" />
            </TouchableOpacity>

            {/* Manage Products (Admin Only) */}
            {role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtnSolid}
                activeOpacity={0.8}
                onPress={() => router.push('/(admin)/products')}
              >
                <View style={styles.actionLeft}>
                  <MaterialCommunityIcons name="cube-outline" size={20} color="#ffffff" style={styles.actionIcon} />
                  <Text style={styles.actionTextSolid}>Manage Products</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}

            {/* Manage Users (Admin Only) */}
            {role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtnSolid}
                activeOpacity={0.8}
                onPress={() => router.push('/(admin)/users')}
              >
                <View style={styles.actionLeft}>
                  <MaterialCommunityIcons name="account-multiple-outline" size={20} color="#ffffff" style={styles.actionIcon} />
                  <Text style={styles.actionTextSolid}>Manage Users</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            
            {/* Manage Subcategories (Admin Only) */}
            {role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtnSolid}
                activeOpacity={0.8}
                onPress={() => router.push('/(admin)/products')}
              >
                <View style={styles.actionLeft}>
                  <MaterialCommunityIcons name="file-tree" size={20} color="#ffffff" style={styles.actionIcon} />
                  <Text style={styles.actionTextSolid}>Manage Subcategories</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}

            {/* Dropdown Field Ordering (Admin Only) */}
            {role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtnSolid}
                activeOpacity={0.8}
                onPress={() => router.push('/(admin)/products')}
              >
                <View style={styles.actionLeft}>
                  <MaterialCommunityIcons name="format-list-bulleted-reorder" size={20} color="#ffffff" style={styles.actionIcon} />
                  <Text style={styles.actionTextSolid}>Dropdown Field Ordering</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}

            {/* Company Profile (Admin Only) */}
            {role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtnOutlined}
                activeOpacity={0.8}
                onPress={() => router.push('/(admin)/company-profile')}
              >
                <View style={styles.actionLeft}>
                  <MaterialCommunityIcons name="office-building-outline" size={20} color="#1A237E" style={styles.actionIcon} />
                  <Text style={styles.actionTextOutlined}>Company Profile</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#1A237E" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button → Company Profile */}
      {role === 'admin' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => router.push('/(admin)/company-profile')}
        >
          <MaterialCommunityIcons name="office-building-cog" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}
      {/* Custom Date Range Dialog */}
      <Portal>
        <Dialog visible={showCustomRangeDialog} onDismiss={() => setShowCustomRangeDialog(false)} style={styles.dialogCard}>
          <Dialog.Title style={styles.dialogTitle}>Custom Date Range</Dialog.Title>
          <Dialog.Content>
            {/* FROM date */}
            <TouchableOpacity
              style={[styles.dateRow, pickerStep === 'from' && styles.dateRowActive]}
              onPress={() => setPickerStep('from')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-start" size={20} color="#1A237E" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dateLabel}>From Date</Text>
                <Text style={styles.dateValue}>{formatDate(tempFrom)}</Text>
              </View>
              {pickerStep === 'from' && <View style={styles.activeDot} />}
            </TouchableOpacity>

            {/* TO date */}
            <TouchableOpacity
              style={[styles.dateRow, pickerStep === 'to' && styles.dateRowActive]}
              onPress={() => setPickerStep('to')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="calendar-end" size={20} color="#1A237E" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dateLabel}>To Date</Text>
                <Text style={styles.dateValue}>{formatDate(tempTo)}</Text>
              </View>
              {pickerStep === 'to' && <View style={styles.activeDot} />}
            </TouchableOpacity>

            <DateTimePicker
              value={pickerStep === 'from' ? tempFrom : tempTo}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(event, date) => {
                if (!date) return;
                if (pickerStep === 'from') {
                  setTempFrom(date);
                  if (Platform.OS === 'android') setPickerStep('to');
                } else {
                  setTempTo(date);
                }
              }}
              style={styles.datePicker}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowCustomRangeDialog(false)} textColor="#757575">Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#1A237E"
              onPress={() => {
                if (tempFrom > tempTo) {
                  Alert.alert('Invalid Range', 'Start date must be before or equal to end date.');
                  return;
                }
                setDashCustomFrom(tempFrom);
                setDashCustomTo(tempTo);
                setDashDatePreset('Custom Range');
                setShowCustomRangeDialog(false);
              }}
            >
              Apply Range
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A237E', // Background matches Topbar dark theme
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#1A237E',
  },
  welcomeSection: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3F51B5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  crownBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A237E',
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: '#E8EAF6',
    opacity: 0.85,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 1,
  },
  profileSubtitle: {
    fontSize: 11,
    color: '#C5CAE9',
    marginTop: 2,
    opacity: 0.9,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF5350',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    marginTop: -8,
  },
  grid: {
    gap: 12,
    marginBottom: 24,
  },
  gridWide: {
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1.5 },
    justifyContent: 'space-between',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValueWrapper: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    marginTop: 1,
  },
  metricCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA',
    paddingTop: 8,
  },
  metricLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sparkline: {
    marginTop: -4,
  },
  actionsContainer: {
    gap: 12,
  },
  actionBtnSolid: {
    backgroundColor: '#5C6BC0', // Indigo accent
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1.5 },
  },
  actionBtnOutlined: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E8EAF6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 12,
  },
  actionTextSolid: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionTextOutlined: {
    color: '#1A237E',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A237E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    marginTop: 16,
    marginBottom: 12,
    paddingLeft: 4,
  },
  filterBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    justifyContent: 'space-between',
  },
  dropdownBtn: {
    borderRadius: 8,
    borderColor: '#C5CAE9',
    backgroundColor: '#FAFBFC',
  },
  dropdownBtnContent: {
    height: 40,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#EF5350',
    fontWeight: '700',
  },
  dialogCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  dialogTitle: {
    color: '#1A237E',
    fontWeight: 'bold',
    fontSize: 18,
  },
  dialogActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    marginBottom: 8,
    position: 'relative',
  },
  dateRowActive: {
    borderColor: '#1A237E',
    backgroundColor: '#F0F4FF',
  },
  dateLabel: {
    fontSize: 10,
    color: '#78909C',
    textTransform: 'uppercase',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginTop: 1,
  },
  activeDot: {
    position: 'absolute',
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1A237E',
  },
  datePicker: {
    marginVertical: 8,
    alignSelf: 'center',
  },
});