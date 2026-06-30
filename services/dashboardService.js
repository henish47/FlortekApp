/**
 * services/dashboardService.js
 * Fetches dashboard statistics with optional date and status filters.
 * All queries hit Supabase directly — no client-side array filtering.
 */

import { supabase } from './supabase';

/**
 * Applies date range constraints to a Supabase query builder.
 * @param {object} query - Supabase query builder
 * @param {object|null} dateRange - { from: ISO, to: ISO } or null
 */
const applyDateRange = (query, dateRange) => {
  if (dateRange?.from) query = query.gte('created_at', dateRange.from);
  if (dateRange?.to)   query = query.lte('created_at', dateRange.to);
  return query;
};

/**
 * Fetches all order count metrics for a given date range.
 * Returns an object with counts per status.
 *
 * @param {object|null} dateRange - { from, to } or null for all time
 * @returns {object} { total, confirmed, dispatched }
 */
export const getOrderStats = async (dateRange = null) => {
  const statuses = ['Confirmed', 'Dispatched'];

  // Run all count queries in parallel
  const [totalRes, ...statusRes] = await Promise.all([
    applyDateRange(supabase.from('orders').select('*', { count: 'exact', head: true }), dateRange),
    ...statuses.map((status) =>
      applyDateRange(
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', status),
        dateRange
      )
    ),
  ]);

  return {
    total:      totalRes.count     || 0,
    pending:    0,
    confirmed:  statusRes[0].count || 0,
    production: 0,
    dispatched: statusRes[1].count || 0,
    cancelled:  0,
    delivered:  0,
  };
};

/**
 * Fetches product count for the given date range.
 */
export const getProductStats = async (dateRange = null) => {
  const q = applyDateRange(
    supabase.from('products').select('*', { count: 'exact', head: true }),
    dateRange
  );
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
};

/**
 * Fetches user/profile counts (admin-only usage).
 * Does not filter by date — user counts are static.
 */
export const getUserStats = async () => {
  const roles = ['admin', 'sales', 'production', 'dispatch', 'customer'];

  const [totalRes, ...roleRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ...roles.map((role) =>
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role)
    ),
  ]);

  return {
    total:      totalRes.count  || 0,
    admin:      roleRes[0].count || 0,
    sales:      roleRes[1].count || 0,
    production: roleRes[2].count || 0,
    dispatch:   roleRes[3].count || 0,
    customers:  roleRes[4].count || 0,
  };
};

/**
 * Full dashboard data in one call.
 */
export const getDashboardData = async (dateRange = null) => {
  const [orders, productCount] = await Promise.all([
    getOrderStats(dateRange),
    getProductStats(dateRange),
  ]);

  return { orders, productCount };
};
