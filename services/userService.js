import { supabase } from './supabase';
import { getTodayRange, getThisMonthRange } from '../utils/dateFilters';

/**
 * Fetch all user profiles ordered by creation date (latest first).
 */
export const getUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUsers error:', error);
    throw error;
  }
  return data || [];
};

/**
 * Fetch a single user profile by its UUID.
 */
export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(`getUserById error for ${userId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Create a new auth user and user profile using the custom RPC.
 */
export const createUser = async (email, password, fullName, mobile, role) => {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_mobile: mobile,
    p_role: role.toLowerCase(),
  });

  if (error) {
    console.error('createUser RPC error:', error);
    throw error;
  }

  if (data && !data.success) {
    throw new Error(data.error || 'Failed to create user');
  }

  return data;
};

/**
 * Update an existing user's profile information using the custom RPC.
 */
export const updateUser = async (userId, fullName, mobile, role) => {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_user_id: userId,
    p_full_name: fullName,
    p_mobile: mobile,
    p_role: role.toLowerCase(),
  });

  if (error) {
    console.error('updateUser RPC error:', error);
    throw error;
  }

  if (data && !data.success) {
    throw new Error(data.error || 'Failed to update user');
  }

  return data;
};

/**
 * Delete a user from both Auth and Profiles using the custom RPC.
 */
export const deleteUser = async (userId) => {
  const { data, error } = await supabase.rpc('admin_delete_user', {
    p_user_id: userId,
  });

  if (error) {
    console.error('deleteUser RPC error:', error);
    throw error;
  }

  if (data && !data.success) {
    throw new Error(data.error || 'Failed to delete user');
  }

  return data;
};

/**
 * Fetches filtered customer profiles according to specialized queries:
 * - 'orders_today': Customers who have placed orders today.
 * - 'orders_month': Customers who have placed orders this month.
 * - 'top_customers' / 'most_orders': Customers sorted by their total order count.
 * - 'all' / default: All customer role profiles.
 */
export const getFilteredCustomers = async (filterType = 'all') => {
  if (filterType === 'orders_today') {
    const todayRange = getTodayRange();
    const { data: ordersToday, error: ordersError } = await supabase
      .from('orders')
      .select('user_id')
      .gte('created_at', todayRange.from)
      .lte('created_at', todayRange.to);

    if (ordersError) throw ordersError;
    const userIds = [...new Set((ordersToday || []).map((o) => o.user_id).filter(Boolean))];

    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .in('id', userIds);

    if (error) throw error;
    return data || [];
  }

  if (filterType === 'orders_month') {
    const monthRange = getThisMonthRange();
    const { data: ordersMonth, error: ordersError } = await supabase
      .from('orders')
      .select('user_id')
      .gte('created_at', monthRange.from)
      .lte('created_at', monthRange.to);

    if (ordersError) throw ordersError;
    const userIds = [...new Set((ordersMonth || []).map((o) => o.user_id).filter(Boolean))];

    if (userIds.length === 0) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .in('id', userIds);

    if (error) throw error;
    return data || [];
  }

  if (filterType === 'top_customers' || filterType === 'most_orders') {
    // Select profiles along with orders relation count
    const { data, error } = await supabase
      .from('profiles')
      .select('*, orders:orders(count)')
      .eq('role', 'customer');

    if (error) throw error;

    // Sort by order count descending
    const sorted = (data || []).sort((a, b) => {
      const countA = a.orders?.[0]?.count || 0;
      const countB = b.orders?.[0]?.count || 0;
      return countB - countA;
    });

    return sorted;
  }

  // Default: all customer role profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};
