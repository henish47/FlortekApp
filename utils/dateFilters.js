/**
 * utils/dateFilters.js
 * Pure-JS date range utilities for Supabase query filtering.
 * All functions return { from: ISO-string, to: ISO-string } or null (for All Time).
 */

export const DATE_PRESETS = [
  'All Time',
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Quarter',
  'This Year',
  'Custom Range',
];

/** Start of a day (00:00:00.000) */
const startOf = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** End of a day (23:59:59.999) */
const endOf = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** ISO string for Supabase */
const iso = (date) => date.toISOString();

export const getTodayRange = () => {
  const now = new Date();
  return { from: iso(startOf(now)), to: iso(endOf(now)) };
};

export const getYesterdayRange = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return { from: iso(startOf(yesterday)), to: iso(endOf(yesterday)) };
};

export const getThisWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7)); // ISO week starts Monday
  return { from: iso(startOf(monday)), to: iso(endOf(now)) };
};

export const getLastWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((day + 6) % 7));
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);
  return { from: iso(startOf(lastMonday)), to: iso(endOf(lastSunday)) };
};

export const getThisMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: iso(startOf(firstDay)), to: iso(endOf(lastDay)) };
};

export const getLastMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: iso(startOf(firstDay)), to: iso(endOf(lastDay)) };
};

export const getThisQuarterRange = () => {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const firstMonth = quarter * 3;
  const firstDay = new Date(now.getFullYear(), firstMonth, 1);
  const lastDay = new Date(now.getFullYear(), firstMonth + 3, 0);
  return { from: iso(startOf(firstDay)), to: iso(endOf(lastDay)) };
};

export const getThisYearRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), 0, 1);
  const lastDay = new Date(now.getFullYear(), 11, 31);
  return { from: iso(startOf(firstDay)), to: iso(endOf(lastDay)) };
};

export const getCustomRange = (fromDate, toDate) => {
  if (!fromDate || !toDate) return null;
  return { from: iso(startOf(new Date(fromDate))), to: iso(endOf(new Date(toDate))) };
};

/**
 * Master resolver — given a preset string + optional custom dates,
 * returns { from, to } or null (All Time).
 */
export const getDateRange = (preset, customFrom = null, customTo = null) => {
  switch (preset) {
    case 'Today':        return getTodayRange();
    case 'Yesterday':    return getYesterdayRange();
    case 'This Week':    return getThisWeekRange();
    case 'Last Week':    return getLastWeekRange();
    case 'This Month':   return getThisMonthRange();
    case 'Last Month':   return getLastMonthRange();
    case 'This Quarter': return getThisQuarterRange();
    case 'This Year':    return getThisYearRange();
    case 'Custom Range': return getCustomRange(customFrom, customTo);
    case 'All Time':
    default:             return null; // no date filter
  }
};

/**
 * Returns a human-readable label for the active date filter.
 */
export const getDateRangeLabel = (preset, customFrom, customTo) => {
  if (preset === 'Custom Range' && customFrom && customTo) {
    const f = new Date(customFrom).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const t = new Date(customTo).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${f} – ${t}`;
  }
  return preset;
};

/**
 * Short label for the active filters summary badge.
 */
export const buildFilterSummary = (datePreset, statusFilters) => {
  const parts = [];
  if (datePreset && datePreset !== 'All Time') parts.push(datePreset);
  if (statusFilters && statusFilters.length && !statusFilters.includes('All')) {
    parts.push(statusFilters.join(', '));
  }
  return parts.length ? parts.join(' · ') : 'All Orders';
};
