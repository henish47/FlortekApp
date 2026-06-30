import { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  Searchbar,
  FAB,
  IconButton,
  Divider,
  Chip,
  Menu,
} from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { getUsers, deleteUser, getFilteredCustomers } from '../../services/userService';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { getUnreadCount, subscribeToNotifications } from '../../services/notificationService';


export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering states
  const [selectedRole, setSelectedRole] = useState('All'); // 'All' | 'Customer' | 'Admin'
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all' | 'orders_today' | 'orders_month' | 'top_customers'

  // Dropdown visibility states
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [customerFilterMenuVisible, setCustomerFilterMenuVisible] = useState(false);

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
    const focusListener = () => {
      loadUsers();
      fetchUnreadCount();
    };

    const unsubscribe = navigation.addListener('focus', focusListener);
    fetchUnreadCount();

    return unsubscribe;
  }, [navigation, selectedRole, customerFilter]);

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

  const loadUsers = async () => {
    try {
      if (selectedRole === 'Customer') {
        const data = await getFilteredCustomers(customerFilter);
        setUsers(data || []);
      } else {
        const data = await getUsers();
        if (selectedRole !== 'All') {
          setUsers((data || []).filter(u => u.role?.toLowerCase() === selectedRole.toLowerCase()));
        } else {
          setUsers(data || []);
        }
      }
    } catch (error) {
      console.error('loadUsers error:', error);
      Alert.alert('Error', 'Failed to fetch users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleDelete = (id, fullName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${fullName || 'this user'}? This will delete their authentication credentials and profile permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteUser(id);
              Alert.alert('Success', 'User deleted successfully.');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to delete user.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeDetails = (role) => {
    const r = (role || '').toLowerCase();
    switch (r) {
      case 'admin':
        return { text: '#D32F2F', bg: '#FFEBEE', label: 'Admin' };
      case 'sales':
        return { text: '#1976D2', bg: '#E3F2FD', label: 'Sales' };
      case 'production':
        return { text: '#7B1FA2', bg: '#F3E5F5', label: 'Production' };
      case 'dispatch':
        return { text: '#F57C00', bg: '#FFF3E0', label: 'Dispatch' };
      case 'customer':
        return { text: '#388E3C', bg: '#E8F5E9', label: 'Customer' };
      default:
        return {
          text: '#0097A7',
          bg: '#E0F7FA',
          label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Staff',
        };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredUsers = users.filter((u) => {
    const name = (u.full_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const mobile = (u.mobile || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || mobile.includes(query);
  });

  const handleClearFilters = () => {
    setSelectedRole('All');
    setCustomerFilter('all');
    setSearchQuery('');
  };

  const getCustomerFilterLabel = () => {
    const map = {
      all: 'All Customers',
      orders_today: 'Orders Today',
      orders_month: 'Orders This Month',
      top_customers: 'Top Customers',
    };
    return map[customerFilter] || 'All Customers';
  };

  const hasActiveFilters = selectedRole !== 'All' || customerFilter !== 'all' || searchQuery.trim().length > 0;

  if (loading && !refreshing) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#1A237E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Topbar title="User Management" showBack={false} roleBadge="Admin" showBell={true} unreadCount={unreadCount} />

      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, email, mobile..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          placeholderTextColor="#78909C"
          iconColor="#1A237E"
        />
      </View>

      {/* FILTER CONTROLS */}
      <View style={styles.filterSection}>
        <View style={styles.dropdownRow}>
          {/* Role Dropdown */}
          <Menu
            visible={roleMenuVisible}
            onDismiss={() => setRoleMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setRoleMenuVisible(true)}
                icon="account-outline"
                style={styles.dropdownBtn}
                contentStyle={styles.dropdownBtnContent}
                textColor="#1A237E"
                labelStyle={styles.btnLabel}
              >
                {`Role: ${selectedRole}`}
              </Button>
            }
          >
            {['All', 'Customer', 'Admin'].map((role) => (
              <Menu.Item
                key={role}
                onPress={() => {
                  setSelectedRole(role);
                  setCustomerFilter('all');
                  setRoleMenuVisible(false);
                }}
                title={role}
                titleStyle={[
                  styles.menuItemText,
                  selectedRole === role && styles.menuItemActiveText,
                ]}
              />
            ))}
          </Menu>

          {/* Customer filter dropdown */}
          {selectedRole === 'Customer' && (
            <Menu
              visible={customerFilterMenuVisible}
              onDismiss={() => setCustomerFilterMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCustomerFilterMenuVisible(true)}
                  icon="trophy-outline"
                  style={styles.dropdownBtn}
                  contentStyle={styles.dropdownBtnContent}
                  textColor="#1A237E"
                  labelStyle={styles.btnLabel}
                >
                  {getCustomerFilterLabel()}
                </Button>
              }
            >
              {[
                { label: 'All Customers', val: 'all' },
                { label: 'Orders Today', val: 'orders_today' },
                { label: 'Orders This Month', val: 'orders_month' },
                { label: 'Top Customers', val: 'top_customers' },
              ].map((filter) => (
                <Menu.Item
                  key={filter.val}
                  onPress={() => {
                    setCustomerFilter(filter.val);
                    setCustomerFilterMenuVisible(false);
                  }}
                  title={filter.label}
                  titleStyle={[
                    styles.menuItemText,
                    customerFilter === filter.val && styles.menuItemActiveText,
                  ]}
                />
              ))}
            </Menu>
          )}
        </View>
      </View>

      {/* STATS HEADER */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <Chip icon="account-circle" style={styles.countChip}>
            {filteredUsers.length} Users
          </Chip>
          {hasActiveFilters && (
            <TouchableOpacity onPress={handleClearFilters} style={styles.clearBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#EF5350" />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.container}>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
          }
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const badge = getRoleBadgeDetails(item.role);
            const orderCount = item.orders?.[0]?.count;
            return (
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfoCol}>
                      <Text variant="titleMedium" style={styles.userName}>
                        {item.full_name}
                      </Text>
                      <Text variant="bodyMedium" style={styles.userEmail}>
                        {item.email}
                      </Text>
                    </View>
                    <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <IconButton icon="phone" size={16} iconColor="#546E7A" style={styles.iconStyle} />
                      <Text variant="bodySmall" style={styles.detailText}>
                        {item.mobile || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <IconButton icon="calendar" size={16} iconColor="#546E7A" style={styles.iconStyle} />
                      <Text variant="bodySmall" style={styles.detailText}>
                        Joined: {formatDate(item.created_at)}
                      </Text>
                    </View>
                  </View>

                  {/* Order count badge for customers when sorting by Top Customers */}
                  {orderCount !== undefined && (
                    <View style={styles.orderCountContainer}>
                      <MaterialCommunityIcons name="package-variant-closed" size={16} color="#388E3C" />
                      <Text style={styles.orderCountText}>
                        Orders Placed: <Text style={styles.orderCountBold}>{orderCount}</Text>
                      </Text>
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Button
                      mode="outlined"
                      icon="pencil"
                      textColor="#1A237E"
                      style={styles.actionButton}
                      contentStyle={styles.buttonContent}
                      labelStyle={styles.buttonLabel}
                      onPress={() =>
                        router.push({
                          pathname: '/(admin)/edit-user',
                          params: { id: item.id },
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      mode="contained"
                      icon="delete"
                      buttonColor="#D32F2F"
                      textColor="#ffffff"
                      style={styles.actionButton}
                      contentStyle={styles.buttonContent}
                      labelStyle={styles.buttonLabel}
                      onPress={() => handleDelete(item.id, item.full_name)}
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <IconButton icon="account-off-outline" size={48} iconColor="#90A4AE" />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No Users Found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search criteria.' : 'No users match this filter.'}
              </Text>
            </View>
          )}
        />
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        color="#ffffff"
        onPress={() => router.push('/(admin)/add-user')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  filterSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    paddingBottom: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  dropdownBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#C5CAE9',
    backgroundColor: '#FAFBFC',
  },
  dropdownBtnContent: {
    height: 38,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuItemText: {
    fontSize: 14,
    color: '#37474F',
  },
  menuItemActiveText: {
    color: '#1A237E',
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  clearText: {
    fontSize: 11,
    color: '#EF5350',
    fontWeight: '700',
  },
  countChip: {
    backgroundColor: '#E8EAF6',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  listContainer: {
    paddingBottom: 84, // Extra space for FAB
  },
  card: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  userName: {
    fontWeight: 'bold',
    color: '#263238',
  },
  userEmail: {
    color: '#78909C',
    marginTop: 2,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    paddingTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  iconStyle: {
    margin: 0,
    padding: 0,
  },
  detailText: {
    color: '#546E7A',
    marginLeft: -4,
  },
  orderCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  orderCountText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  orderCountBold: {
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    paddingTop: 12,
  },
  actionButton: {
    marginLeft: 8,
    borderRadius: 8,
    height: 36,
  },
  buttonContent: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1A237E',
    borderRadius: 28,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#37474F',
    fontWeight: 'bold',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
    marginTop: 4,
  },
});
