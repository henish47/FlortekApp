import React from 'react';
import {
  StyleSheet,
  Image,
  View,
  Alert,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';

import {
  Appbar,
} from 'react-native-paper';

import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
  signOut,
} from '../services/authService';

/**
 * Topbar component
 *
 * Additional props for notification bell:
 *   unreadCount  {number}   - Number of unread notifications (0 hides badge)
 *   onBellPress  {function} - Handler for bell icon press (navigates to notifications)
 *   showBell     {boolean}  - Whether to show the bell icon
 */
export default function Topbar({
  title = '',
  showBack = false,
  onBack,
  roleBadge = '',
  rightActions = [],
  showLogout = false,
  dark = false,
  showMenu = false,
  onMenuPress,
  // Notification bell
  showBell = false,
  unreadCount = 0,
  onBellPress,
}) {

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to log out?');
      if (confirmLogout) {
        try {
          await signOut();
          router.replace('/(auth)/login');
        } catch (error) {
          alert('Error: ' + error.message);
        }
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const primaryColor = dark ? '#FFFFFF' : '#1A237E';

  return (
    <Appbar.Header
      style={[
        styles.header,
        dark ? styles.darkHeader : styles.lightHeader,
      ]}
    >
      {showMenu && (
        <Appbar.Action
          icon="menu"
          onPress={onMenuPress || (() => {})}
          color={primaryColor}
          size={24}
        />
      )}

      {showBack && (
        <Appbar.BackAction
          onPress={onBack || (() => router.back())}
          color={primaryColor}
          size={24}
        />
      )}

      <Appbar.Content
        title={title}
        titleStyle={[
          styles.title,
          dark && { color: '#FFFFFF' },
          (showMenu || showBack) && { marginLeft: -8 } // adjust title spacing next to back/menu icon
        ]}
      />

      <View style={styles.rightSection}>
        {roleBadge ? (
          <View
            style={[
              styles.badge,
              roleBadge.toLowerCase() === 'admin'
                ? styles.adminBadge
                : styles.customerBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                roleBadge.toLowerCase() === 'admin'
                  ? styles.adminBadgeText
                  : styles.customerBadgeText,
              ]}
            >
              {roleBadge}
            </Text>
          </View>
        ) : null}

        {rightActions.map((action, idx) => (
          <Appbar.Action
            key={idx}
            icon={action.icon}
            onPress={action.onPress}
            color={action.color || primaryColor}
            size={22}
          />
        ))}



        {/* Notification Bell */}
        {showBell && (
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={onBellPress || (() => router.push('/notifications'))}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={unreadCount > 0 ? 'bell-badge' : 'bell-outline'}
              size={22}
              color={dark ? '#ffffff' : '#1A237E'}
            />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showLogout && (
          <Appbar.Action
            icon="logout-variant"
            onPress={handleLogout}
            color={dark ? '#FFFFFF' : '#EF5350'}
            size={22}
          />
        )}
      </View>
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  lightHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6', // Extra soft grey border
    // Subtle elevation shadow
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  darkHeader: {
    backgroundColor: '#1E2397',
    elevation: 0,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800', // Bold, modern typography
    color: '#0A0E29', // Premium deep navy
    letterSpacing: -0.5,
  },
  badge: {
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    paddingHorizontal: 6,
  },
  adminBadge: {
    backgroundColor: '#FFEBEE',
  },
  customerBadge: {
    backgroundColor: '#E8F5E9',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 12,
  },
  adminBadgeText: {
    color: '#C62828',
  },
  customerBadgeText: {
    color: '#2E7D32',
  },
  bellBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#EF5350',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '800',
    lineHeight: 10,
  },
});