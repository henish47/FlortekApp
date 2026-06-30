import { supabase } from './supabase';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dynamically load expo-notifications to prevent crashes in Expo Go (Expo SDK 53+)
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.warn('expo-notifications is not supported in this environment (e.g. Expo Go):', e.message);
}

/**
 * Notification type constants
 */
export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'NEW_ORDER',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PRODUCTION: 'ORDER_PRODUCTION',
  ORDER_DISPATCHED: 'ORDER_DISPATCHED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  SYSTEM: 'SYSTEM',
};

/**
 * Maps a notification type to a display icon and color
 */
export const getNotificationMeta = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.NEW_ORDER:
      return { icon: 'cart-plus', color: '#1A237E', bg: '#E8EAF6' };
    case NOTIFICATION_TYPES.ORDER_CONFIRMED:
      return { icon: 'thumb-up-outline', color: '#0D47A1', bg: '#E3F2FD' };
    case NOTIFICATION_TYPES.ORDER_PRODUCTION:
      return { icon: 'factory', color: '#6A1B9A', bg: '#F3E5F5' };
    case NOTIFICATION_TYPES.ORDER_DISPATCHED:
      return { icon: 'truck-delivery-outline', color: '#004D40', bg: '#E0F2F1' };
    case NOTIFICATION_TYPES.ORDER_DELIVERED:
      return { icon: 'check-circle-outline', color: '#1B5E20', bg: '#E8F5E9' };
    case NOTIFICATION_TYPES.SYSTEM:
    default:
      return { icon: 'bell-outline', color: '#E65100', bg: '#FFF3E0' };
  }
};

/**
 * Fetches all notifications for a user, ordered newest first.
 */
export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetches notifications with server-side date/type/read filters.
 * @param {string}      userId
 * @param {object}      options
 * @param {object|null} options.dateRange  - { from, to } or null
 * @param {string}      options.readFilter - 'all' | 'unread' | 'read'
 * @param {string[]}    options.types      - array of NOTIFICATION_TYPES values, [] for all
 */
export const getFilteredNotifications = async (userId, {
  dateRange = null,
  readFilter = 'all',
  types = [],
} = {}) => {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId);

  if (dateRange?.from) query = query.gte('created_at', dateRange.from);
  if (dateRange?.to)   query = query.lte('created_at', dateRange.to);

  if (readFilter === 'unread') query = query.eq('is_read', false);
  if (readFilter === 'read')   query = query.eq('is_read', true);

  if (types.length > 0) query = query.in('type', types);

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};



/**
 * Fetches all notifications for a user, ordered newest first.
 */
// export const getNotifications = async (userId) => {
//   const { data, error } = await supabase
//     .from('notifications')
//     .select('*')
//     .eq('user_id', userId)
//     .order('created_at', { ascending: false });

//   if (error) throw error;
//   return data || [];
// };

/**
 * Counts unread notifications for a user.
 */
export const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

/**
 * Marks a single notification as read.
 */
export const markAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

/**
 * Deletes a single notification.
 */
export const deleteNotification = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
};

/**
 * Marks all notifications as read for a user.
 */
export const markAllAsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
};

/**
 * Creates a new notification.
 */
export const createNotification = async ({ title, message, type, user_id }) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ title, message, type, user_id })
    .select()
    .maybeSingle();

  if (error) {
    // Non-fatal: log but don't break order flow
    console.warn('Failed to create notification:', error.message);
    return null;
  }
  return data;
};

/**
 * Subscribes to real-time notifications for a user.
 * Returns the channel so the caller can call channel.unsubscribe() on cleanup.
 *
 * @param {string} userId
 * @param {function} onNew - called with each new notification row
 * @returns {RealtimeChannel}
 */
export const subscribeToNotifications = (userId, onNew) => {
  // Use a unique channel name to prevent "cannot add callbacks after subscribe()" errors
  // when multiple screens subscribe concurrently.
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const channelName = `notifications:${userId}:${randomSuffix}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNew(payload.new);
        }
      }
    )
    .subscribe();

  return channel;
};

/**
 * Requests push permission and returns the Expo Push Token.
 */
export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === 'web') return null;

  if (!Notifications) {
    console.log('Push notifications library is not loaded/supported in this environment (e.g. Expo Go)');
    return null;
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification: Permission not granted');
      return null;
    }

    // In Expo SDK 56, getExpoPushTokenAsync requires projectId in options
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('Expo Push Token retrieved:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

/**
 * Saves a user's Expo Push Token to their public profile in Supabase.
 */
export const savePushToken = async (userId, token) => {
  if (!userId || !token) return;
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('Error saving push token to database profiles:', error.message);
  } else {
    console.log('Push token saved to database for user:', userId);
  }
};

/**
 * Sends a push notification using Expo's Push API.
 */
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const resData = await response.json();
    console.log('Expo Push response:', resData);
  } catch (error) {
    console.error('Error sending push notification via Expo:', error);
  }
};

/**
 * Sends an email notification using the Supabase Edge Function send-email.
 */
export const sendEmailNotification = async (email, subject, body) => {
  // Disabled per user request - only send in-app and push notifications.
  return;
};

/**
 * Checks if the expected delivery date changed, and if so:
 * 1. Creates an in-app notification row.
 * 2. Sends an Expo Push Notification to the user if they have a push token.
 * 3. Sends an Email Notification to their registered email.
 * 4. Logs an entry in the activity_logs table.
 */
export const sendExpectedDeliveryUpdateNotification = async (order, oldDate, newDate) => {
  if (oldDate === newDate) return; // Notification should NOT be sent if the date remains unchanged.

  const orderRef = order.order_number || `#${order.id}`;

  // Formatting date helper for message: DD MMM YYYY (e.g. 25 June 2026)
  const formatMsgDate = (dateStr) => {
    if (!dateStr) return 'None';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formattedNewDate = formatMsgDate(newDate);

  // 1. Create in-app notification
  // Only send notification message if expected delivery date is newly added or changed (newDate is not null)
  if (newDate) {
    const notificationMessage = `Your order ${orderRef} is expected to be delivered on ${formattedNewDate}.`;
    await createNotification({
      title: 'Order Delivery Update',
      message: notificationMessage,
      type: NOTIFICATION_TYPES.SYSTEM,
      user_id: order.user_id,
    });

    // Fetch customer profile details
    const { data: customerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('expo_push_token, email')
      .eq('id', order.user_id)
      .maybeSingle();

    if (!profileError && customerProfile) {
      // 2. Send Expo Push Notification
      if (customerProfile.expo_push_token) {
        const pushTitle = 'Order Delivery Update';
        const pushBody = `Your order ${orderRef} is expected to be delivered on ${formattedNewDate}.`;
        await sendPushNotification(customerProfile.expo_push_token, pushTitle, pushBody, { orderId: order.id });
      }

      // 3. Send Email Notification
      if (customerProfile.email) {
        const emailSubject = 'Expected Delivery Date Updated';
        const emailBody = `Your order ${orderRef} is expected to be delivered on ${formattedNewDate}.`;
        await sendEmailNotification(customerProfile.email, emailSubject, emailBody);
      }
    }
  }

  // 4. Log Admin Activity Entry in activity_logs
  // "Expected delivery date updated from OLD_DATE to NEW_DATE"
  // E.g., Expected delivery date updated from None to 25 Jun 2026
  const formattedOldDate = formatMsgDate(oldDate);
  const activityMessage = `Expected delivery date updated from ${formattedOldDate} to ${newDate ? formattedNewDate : 'Removed'}`;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('activity_logs')
      .insert({
        order_id: order.id,
        user_id: user?.id || null,
        message: activityMessage,
      });
    console.log('Activity log saved:', activityMessage);
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
};

/**
 * Sends order status change notification (In-app, Push, Email).
 */
export const sendOrderStatusNotification = async (order, status) => {
  const orderRef = order.order_number || `#${order.id}`;

  const typeMap = {
    Confirmed:  NOTIFICATION_TYPES.ORDER_CONFIRMED,
    Production: NOTIFICATION_TYPES.ORDER_PRODUCTION,
    Dispatched: NOTIFICATION_TYPES.ORDER_DISPATCHED,
    Delivered:  NOTIFICATION_TYPES.ORDER_DELIVERED,
    Cancelled:  NOTIFICATION_TYPES.SYSTEM,
  };
  const notifType = typeMap[status] || NOTIFICATION_TYPES.SYSTEM;

  const messages = {
    Confirmed:  `Your order ${orderRef} has been confirmed.`,
    Production: `Your order ${orderRef} is now in production.`,
    Dispatched: `Your order ${orderRef} has been dispatched.${order.lr_number ? ` LR No: ${order.lr_number}` : ''}${order.transport_name ? ` via ${order.transport_name}` : ''}.`,
    Delivered:  `Your order ${orderRef} has been delivered. Thank you!`,
    Cancelled:  `Your order ${orderRef} has been cancelled.`,
  };
  const message = messages[status] || `Your order ${orderRef} status updated to ${status}.`;

  // 1. Create in-app notification
  await createNotification({
    title: `Order ${status}`,
    message,
    type: notifType,
    user_id: order.user_id,
  });

  // Fetch customer profile details
  const { data: customerProfile, error: profileError } = await supabase
    .from('profiles')
    .select('expo_push_token, email')
    .eq('id', order.user_id)
    .maybeSingle();

  if (!profileError && customerProfile) {
    // 2. Send Expo Push Notification
    if (customerProfile.expo_push_token) {
      await sendPushNotification(customerProfile.expo_push_token, `Order ${status}`, message, { orderId: order.id });
    }

    // 3. Send Email Notification
    if (customerProfile.email) {
      await sendEmailNotification(customerProfile.email, `Order Status: ${status}`, message);
    }
  }
};

/**
 * Sends a notification to all administrators when a new order is placed.
 * Creates an in-app notification, and sends Expo Push and Email notifications.
 */
export const sendNewOrderAdminNotification = async (order) => {
  const orderRef = order.order_number || `#${order.id}`;
  const message = `Order ${orderRef} placed by ${order.customer_name || 'a customer'}. Qty: ${order.quantity}.`;

  // 1. Fetch all admin profiles to get their IDs, emails, and push tokens
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, email, expo_push_token')
    .eq('role', 'admin');

  if (error || !admins) {
    console.warn('Failed to fetch admin profiles for notification:', error?.message);
    return;
  }

  // 2. Loop through all admins and send notifications
  await Promise.allSettled(
    admins.map(async (admin) => {
      // In-app Notification
      await createNotification({
        title: 'New Order Received',
        message: message,
        type: NOTIFICATION_TYPES.NEW_ORDER,
        user_id: admin.id,
      });

      // Expo Push Notification
      if (admin.expo_push_token) {
        await sendPushNotification(
          admin.expo_push_token,
          'New Order Received',
          message,
          { orderId: order.id }
        );
      }

      // Email Notification
      if (admin.email) {
        await sendEmailNotification(
          admin.email,
          `New Order Placed: ${orderRef}`,
          message
        );
      }
    })
  );
};

/**
 * Sends a notification to all administrators when a batch of new orders is placed.
 */
export const sendBulkOrdersAdminNotification = async (ordersBatch) => {
  if (!ordersBatch || ordersBatch.length === 0) return;

  const count = ordersBatch.length;
  const firstOrder = ordersBatch[0];
  const orderRef = firstOrder.order_number || `#${firstOrder.id}`;
  const firstCustomerName = firstOrder.customer_name || 'a customer';
  const message = `${count} new order(s) placed by ${firstCustomerName}. First order: ${orderRef}.`;

  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, email, expo_push_token')
    .eq('role', 'admin');

  if (error || !admins) {
    console.warn('Failed to fetch admin profiles for notification:', error?.message);
    return;
  }

  await Promise.allSettled(
    admins.map(async (admin) => {
      // In-app Notification
      await createNotification({
        title: 'New Orders Received',
        message: message,
        type: NOTIFICATION_TYPES.NEW_ORDER,
        user_id: admin.id,
      });

      // Expo Push Notification
      if (admin.expo_push_token) {
        await sendPushNotification(
          admin.expo_push_token,
          'New Orders Received',
          message,
          { orderId: firstOrder.id }
        );
      }

      // Email Notification
      if (admin.email) {
        await sendEmailNotification(
          admin.email,
          `New Bulk Orders Placed (${count})`,
          message
        );
      }
    })
  );
};
