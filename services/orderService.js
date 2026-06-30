import { supabase } from './supabase';
import { createNotification, NOTIFICATION_TYPES, sendExpectedDeliveryUpdateNotification, sendOrderStatusNotification, sendNewOrderAdminNotification, sendBulkOrdersAdminNotification } from './notificationService';

/**
 * Fetches the admin user IDs to send notifications to.
 * Returns an array of admin profile IDs.
 */
const getAdminUserIds = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');
  if (error) return [];
  return (data || []).map((p) => p.id);
};

/**
 * Helper: applies date range to a Supabase query builder.
 * @param {object} query - Supabase query builder
 * @param {object|null} dateRange - { from: ISO, to: ISO } or null
 */
const applyDateRange = (query, dateRange) => {
  if (dateRange?.from) query = query.gte('created_at', dateRange.from);
  if (dateRange?.to)   query = query.lte('created_at', dateRange.to);
  return query;
};

/**
 * Fetches the admin user IDs to send notifications to.
 * Returns an array of admin profile IDs.
 */
// const getAdminUserIds = async () => {
//   const { data, error } = await supabase
//     .from('profiles')
//     .select('id')
//     .eq('role', 'admin');
//   if (error) return [];
//   return (data || []).map((p) => p.id);
// };

/**
 * Validates and logs order ID type and value.
 */
const validateAndLogOrderId = (orderId) => {
  console.log('Order ID:', orderId);
  if (orderId === undefined) {
    console.log('Check: orderId is undefined');
  } else if (typeof orderId === 'string') {
    console.log('Check: orderId is a string');
  } else if (typeof orderId === 'number') {
    console.log('Check: orderId is a number');
  } else {
    console.log('Check: orderId is of type', typeof orderId);
  }
  return Number(orderId);
};

/**
 * Places a new order (used by customers).
 */
export const createOrder = async (orderData) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .maybeSingle();

  console.log('Order Data:', data);
  console.log('Supabase Error:', error);

  if (error) throw error;

  // Notify all admins of the new order (In-app, Push, Email)
  if (data) {
    await sendNewOrderAdminNotification(data);
  }

  return data;
};

/**
 * Fetches all orders belonging to the currently authenticated customer.
 */
export const getOrders = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};

/**
 * Fetches all orders in the system (used by administrators).
 */
export const getAllOrders = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
};

/**
 * Fetches orders with advanced server-side filters (admin use).
 *
 * @param {object} options
 * @param {object|null} options.dateRange  - { from: ISO, to: ISO } from dateFilters.js, or null
 * @param {string[]}    options.statuses   - e.g. ['Confirmed','Dispatched'], or ['All'] / [] for all
 * @param {string}      options.search     - text search against order_number / customer_name
 * @param {string}      options.role       - current user role (for permission scoping)
 * @returns {Array} filtered orders
 */
export const getFilteredOrders = async ({
  dateRange = null,
  statuses = [],
  search = '',
  role = null,
} = {}) => {
  let query = supabase.from('orders').select('*');

  // Date range
  query = applyDateRange(query, dateRange);

  // Status filter — skip if 'All' or empty
  if (statuses.length > 0 && !statuses.includes('All')) {
    query = query.in('status', statuses);
  }

  // Role-based scoping (mirrors existing orders.js logic)
  if (role === 'production') {
    query = query.eq('status', 'Production');
  } else if (role === 'dispatch') {
    query = query.eq('status', 'Dispatched');
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  // Optional lightweight text search (applied after fetch; Supabase FTS can be added later)
  if (search.trim()) {
    const q = search.toLowerCase();
    return (data || []).filter(
      (o) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.product_name?.toLowerCase().includes(q) ||
        o.customer_mobile?.includes(q)
    );
  }

  return data || [];
};

/**
 * Fetches orders for the current customer with date filter.
 */
export const getCustomerFilteredOrders = async ({ dateRange = null, statuses = [] } = {}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id);

  query = applyDateRange(query, dateRange);

  if (statuses.length > 0 && !statuses.includes('All')) {
    query = query.in('status', statuses);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return data || [];
};

/**
 * Fetches details of a single order.
 */
export const getOrderById = async (orderId) => {
  const numericId = validateAndLogOrderId(orderId);
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', numericId)
    .maybeSingle();

  console.log('Order Data:', data);
  console.log('Supabase Error:', error);

  if (error) throw error;

  if (!data) {
    console.log('Order not found');
    return null;
  }

  return data;
};

/**
 * Updates an order's status, LR number, and admin remarks.
 */
export const updateOrderStatus = async (
  orderId,
  status,
  lrNumber = '',
  adminRemarks = ''
) => {
  const numericId = validateAndLogOrderId(orderId);
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      lr_number: lrNumber,
      admin_remark: adminRemarks,
    })
    .eq('id', numericId)
    .select()
    .maybeSingle();

  console.log('Order Data:', data);
  console.log('Supabase Error:', error);

  if (error) throw error;

  if (!data) {
    console.log('Order not found');
    return null;
  }

  // Notify the customer of their order status change
  if (data?.user_id) {
    await sendOrderStatusNotification(data, status);
  }

  return data;
};

/**
 * Updates arbitrary fields of an order.
 */
export const updateOrder = async (orderId, orderData) => {
  const numericId = validateAndLogOrderId(orderId);
  const { data, error } = await supabase
    .from('orders')
    .update(orderData)
    .eq('id', numericId)
    .select()
    .maybeSingle();

  console.log('Order Data:', data);
  console.log('Supabase Error:', error);

  if (error) throw error;

  if (!data) {
    console.log('Order not found');
    return null;
  }

  return data;
};

/**
 * Deletes an order (used by administrators).
 */
export const deleteOrder = async (orderId) => {
  const numericId = validateAndLogOrderId(orderId);
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', numericId);

  console.log('Supabase Error:', error);

  if (error) throw error;
};

/**
 * Updates the LR Number of an order and manages its status transitions.
 */
export const updateLRNumber = async (orderId, lrNumber, uiStatus = null, adminRemarks = undefined, expectedDeliveryDate = undefined, transportName = undefined) => {
  const numericId = validateAndLogOrderId(orderId);

  // 1. Fetch current order
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', numericId)
    .maybeSingle();

  console.log('Order Data:', order);
  console.log('Supabase Error:', fetchError);

  if (fetchError) throw fetchError;

  if (!order) {
    console.log('Order not found');
    return null;
  }

  const baseStatus = uiStatus || order.status;

  // Log Current Status and LR Number Input
  console.log('Current Status:', baseStatus);
  console.log('LR Number:', lrNumber);

  // Determine updated status based on business logic:
  // If lrNumber is not empty, then update status = Dispatched.
  // Otherwise, keep existing status unchanged.
  let updatedStatus = baseStatus;
  if (lrNumber && lrNumber.trim() !== '') {
    updatedStatus = 'Dispatched';
  }

  // Log Updated Status
  console.log('Updated Status:', updatedStatus);

  const updateData = {
    lr_number: lrNumber,
    status: updatedStatus,
  };

  if (adminRemarks !== undefined) {
    updateData.admin_remark = adminRemarks;
  }

  if (expectedDeliveryDate !== undefined) {
    updateData.expected_delivery_date = expectedDeliveryDate;
  }

  if (transportName !== undefined) {
    updateData.transport_name = transportName;
  }

  // 2. Save LR Number, updated status, admin remarks, and expected delivery date
  const { data, error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', numericId)
    .select()
    .maybeSingle();

  console.log('Order Data:', data);
  console.log('Supabase Error:', updateError);

  if (updateError) throw updateError;

  if (!data) {
    console.log('Order not found');
    return null;
  }

  // 3. Trigger Expected Delivery Date Notification & Activity Log if changed
  if (expectedDeliveryDate !== undefined) {
    const oldDate = order.expected_delivery_date || null;
    const newDate = expectedDeliveryDate || null;
    if (oldDate !== newDate) {
      await sendExpectedDeliveryUpdateNotification(order, oldDate, newDate);
    }
  }

  // 4. Trigger Status Change / Shipment Tracking Notification (In-app, Push, Email)
  if (data?.user_id) {
    const oldStatus = order.status;
    const newStatus = data.status;
    const oldLR = order.lr_number;
    const newLR = data.lr_number;
    const oldTransport = order.transport_name;
    const newTransport = data.transport_name;

    if (oldStatus !== newStatus) {
      await sendOrderStatusNotification(data, newStatus);
    } else if (newStatus === 'Dispatched' && (oldLR !== newLR || oldTransport !== newTransport)) {
      await sendOrderStatusNotification(data, 'Dispatched');
    }
  }
  
  return data;
};

/**
 * Places multiple orders at once (bulk insert).
 */
export const createBulkOrders = async (ordersArray) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(ordersArray)
    .select();

  console.log('Bulk Orders inserted:', data);
  console.log('Supabase Bulk Insert Error:', error);

  if (error) throw error;

  // Notify all admins of the new orders batch (In-app, Push, Email)
  if (data && data.length > 0) {
    await sendBulkOrdersAdminNotification(data);
  }

  return data;
};