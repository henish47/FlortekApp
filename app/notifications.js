import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationMeta,
  deleteNotification,
} from '../services/notificationService';
import Topbar from '../components/Topbar';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState('customer');

  useEffect(() => {
    loadUserAndNotifications();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserAndNotifications(false);
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserAndNotifications = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Fetch role to know where to navigate on notification press
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserRole(profile.role);
        }

        const data = await getNotifications(user.id);
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserAndNotifications(false);
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      await markAllAsRead(userId);
      await loadUserAndNotifications(false);
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (item) => {
    try {
      // 1. Mark as read in database and update local state
      if (!item.is_read) {
        await markAsRead(item.id);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
        );
      }

      // 2. Parse order number (like FLT-0001) or order ID (like #12)
      const fltMatch = item.message.match(/FLT-\d+/i);
      const hashMatch = item.message.match(/#(\d+)/);
      let targetOrderId = null;

      if (fltMatch) {
        const orderNumber = fltMatch[0].toUpperCase();
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', orderNumber)
          .maybeSingle();
        if (!error && data) {
          targetOrderId = data.id;
        }
      } else if (hashMatch) {
        targetOrderId = parseInt(hashMatch[1], 10);
      }

      // 3. Navigate if order was matched
      if (targetOrderId !== null) {
        const staffRoles = ['admin', 'staff', 'sales', 'production', 'dispatch'];
        if (staffRoles.includes(userRole)) {
          router.push({
            pathname: '/(admin)/order-details',
            params: { id: targetOrderId },
          });
        } else {
          router.push({
            pathname: '/(customer)/order-details',
            params: { id: targetOrderId },
          });
        }
      }
    } catch (err) {
      console.error('Error handling notification press:', err);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      setLoading(true);
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      Alert.alert('Error', 'Failed to delete notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLongPress = (item) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteNotification(item.id),
        },
      ],
      { cancelable: true }
    );
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 6000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) {
      const hours = Math.floor(diffMins / 60);
      return `${hours}h ago`;
    }
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }) => {
    const meta = getNotificationMeta(item.type);
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.is_read && styles.unreadCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} />
        </View>

        <View style={styles.textContainer}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Topbar
        title="Notifications"
        showBack={true}
        onBack={() => router.back()}
        rightActions={
          notifications.some(n => !n.is_read)
            ? [
                {
                  icon: 'text-box-check-outline',
                  onPress: handleMarkAllRead,
                  color: '#1A237E',
                },
              ]
            : []
        }
      />

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A237E" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
          }
          ItemSeparatorComponent={() => <Divider style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="bell-off-outline" size={48} color="#90A4AE" />
              </View>
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                All caught up!
              </Text>
              <Text style={styles.emptySubtitle}>
                You have no notifications at the moment.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#F0F4FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#37474F',
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    color: '#1A237E',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#78909C',
  },
  messageText: {
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A237E',
    marginLeft: 8,
  },
  unreadText: {
    color: '#1A237E',
    fontWeight: '700',
  },
  separator: {
    backgroundColor: '#ECEFF1',
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#37474F',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#78909C',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
