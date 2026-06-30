import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Card, Text, TextInput, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { getCurrentUser, getUserProfile, signOut } from '../../services/authService';
import { getOrders } from '../../services/orderService';
import { supabase } from '../../services/supabase';
import Topbar from '../../components/Topbar';
import { getUnreadCount, subscribeToNotifications } from '../../services/notificationService';


export default function Profile() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  
  // Stats state
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });

  const [unreadCount, setUnreadCount] = useState(0);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const checkInstallable = () => {
        setIsInstallable(!!window.deferredPrompt);
      };
      checkInstallable();
      window.addEventListener('pwa-installable', checkInstallable);
      window.addEventListener('appinstalled', () => {
        setIsInstallable(false);
        window.deferredPrompt = null;
      });
      return () => {
        window.removeEventListener('pwa-installable', checkInstallable);
      };
    }
  }, []);

  const handleInstallPWA = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.deferredPrompt) {
      const promptEvent = window.deferredPrompt;
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      window.deferredPrompt = null;
      setIsInstallable(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const count = await getUnreadCount(user.id);
        setUnreadCount(count);
      }
    } catch (err) {
      console.warn('Failed to get unread count:', err);
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    loadProfileData();
    fetchUnreadCount();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
      fetchUnreadCount();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfileData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const profileData = await getUserProfile(user.id);
        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || '');
          setMobile(profileData.mobile || '');
          setCompanyName(profileData.company_name || '');
          setAddress(profileData.address || '');
          setCity(profileData.city || '');
          setStateName(profileData.state || '');
          setPincode(profileData.pincode || '');
          
          // Fetch order counts
          try {
            const orders = await getOrders();
            if (orders) {
              const activeCount = orders.filter(o => 
                ['Confirmed'].includes(o.status)
              ).length;
              const completedCount = orders.filter(o => o.status === 'Dispatched').length;
              setStats({
                total: orders.length,
                active: activeCount,
                completed: completedCount
              });
            }
          } catch (orderErr) {
            console.error('Failed to load orders for stats:', orderErr);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
      Alert.alert('Error', 'Could not load profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleUpdateProfile = async () => {
    const trimmedName = fullName.trim();
    const trimmedMobile = mobile.trim();
    const trimmedCompanyName = companyName.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedStateName = stateName.trim();
    const trimmedPincode = pincode.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter your full name.');
      return;
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(trimmedMobile)) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!trimmedCompanyName) {
      Alert.alert('Validation Error', 'Please enter your company name.');
      return;
    }

    if (!trimmedAddress) {
      Alert.alert('Validation Error', 'Please enter your address.');
      return;
    }

    if (!trimmedCity) {
      Alert.alert('Validation Error', 'Please enter your city.');
      return;
    }

    if (!trimmedStateName) {
      Alert.alert('Validation Error', 'Please enter your state.');
      return;
    }

    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(trimmedPincode)) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit pincode.');
      return;
    }

    try {
      setSaving(true);
      
      // 1. Update Auth User Metadata so it persists in auth.users and is not overwritten by sync triggers
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          mobile: trimmedMobile,
          company_name: trimmedCompanyName,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedStateName,
          pincode: trimmedPincode,
        }
      });
      
      if (authError) throw authError;

      // 2. Update Profiles table directly
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          mobile: trimmedMobile,
          company_name: trimmedCompanyName,
          address: trimmedAddress,
          city: trimmedCity,
          state: trimmedStateName,
          pincode: trimmedPincode,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      Alert.alert('Success', 'Profile updated successfully.');
      setIsEditing(false);
      loadProfileData();
    } catch (err) {
      Alert.alert('Update Failed', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name || '');
      setMobile(profile.mobile || '');
      setCompanyName(profile.company_name || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setStateName(profile.state || '');
      setPincode(profile.pincode || '');
    }
    setIsEditing(false);
  };

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

  const getInitials = (name) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Topbar title="My Profile" roleBadge="Customer" showLogout={true} showBell={true} unreadCount={unreadCount} />
        
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
          }
        >
          {/* Header Hero Card */}
          <Card style={styles.heroCard} elevation={4}>
            <View style={styles.heroBackground}>
              <View style={styles.avatarWrapper}>
                <Text style={styles.avatarText}>
                  {profile ? getInitials(profile.full_name) : 'C'}
                </Text>
              </View>
              <Text variant="headlineSmall" style={styles.heroName}>
                {profile?.full_name || 'Flortek Customer'}
              </Text>
              <Text variant="bodyMedium" style={styles.heroEmail}>
                {profile?.email || 'customer@flortek.in'}
              </Text>
              <View style={styles.roleBadgeContainer}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#4CAF50" />
                <Text style={styles.roleBadgeText}>Verified Customer</Text>
              </View>
            </View>
          </Card>

          {/* Activity Stats Section */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Ordering Statistics
          </Text>
          <View style={styles.statsContainer}>
            <Card style={styles.statCard} elevation={1}>
              <View style={styles.statContent}>
                <View style={[styles.statIconCircle, { backgroundColor: '#E8EAF6' }]}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#1A237E" />
                </View>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
            </Card>

            <Card style={styles.statCard} elevation={1}>
              <View style={styles.statContent}>
                <View style={[styles.statIconCircle, { backgroundColor: '#EFFFEE' }]}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#2E7D32" />
                </View>
                <Text style={styles.statValue}>{stats.active}</Text>
                <Text style={styles.statLabel}>Active Orders</Text>
              </View>
            </Card>

            <Card style={styles.statCard} elevation={1}>
              <View style={styles.statContent}>
                <View style={[styles.statIconCircle, { backgroundColor: '#FFF8E1' }]}>
                  <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color="#F57F17" />
                </View>
                <Text style={styles.statValue}>{stats.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </Card>
          </View>

          {/* Details Card */}
          <Card style={styles.detailsCard} elevation={2}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.detailsTitle}>
                Account Details
              </Text>
              <Divider style={styles.divider} />

              {isEditing ? (
                <View style={styles.formContainer}>
                  <TextInput
                    label="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="account-outline" />}
                  />

                  <TextInput
                    label="Company Name"
                    value={companyName}
                    onChangeText={setCompanyName}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="briefcase-outline" />}
                  />

                  <TextInput
                    label="Mobile Number"
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="phone-outline" />}
                  />

                  <TextInput
                    label="Email Address"
                    value={profile?.email || ''}
                    disabled={true}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    style={[styles.input, styles.disabledInput]}
                    left={<TextInput.Icon icon="email-outline" />}
                  />
                  <Text variant="bodySmall" style={styles.helpText}>
                    Email address cannot be changed.
                  </Text>

                  <TextInput
                    label="Address"
                    value={address}
                    onChangeText={setAddress}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="map-marker-outline" />}
                  />

                  <TextInput
                    label="City"
                    value={city}
                    onChangeText={setCity}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="city" />}
                  />

                  <TextInput
                    label="State"
                    value={stateName}
                    onChangeText={setStateName}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="map-outline" />}
                  />

                  <TextInput
                    label="Pincode"
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="numeric"
                    maxLength={6}
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.input}
                    left={<TextInput.Icon icon="numeric" />}
                  />
                </View>
              ) : (
                <View style={styles.infoContainer}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="account-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Full Name</Text>
                      <Text style={styles.infoValue}>{profile?.full_name || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="briefcase-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Company Name</Text>
                      <Text style={styles.infoValue}>{profile?.company_name || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Mobile Number</Text>
                      <Text style={styles.infoValue}>{profile?.mobile || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="email-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Email Address</Text>
                      <Text style={styles.infoValue}>{profile?.email || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Address</Text>
                      <Text style={styles.infoValue}>{profile?.address || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="city" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>City</Text>
                      <Text style={styles.infoValue}>{profile?.city || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>State</Text>
                      <Text style={styles.infoValue}>{profile?.state || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="numeric" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Pincode</Text>
                      <Text style={styles.infoValue}>{profile?.pincode || 'N/A'}</Text>
                    </View>
                  </View>
                  <Divider style={styles.rowDivider} />

                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#546E7A" />
                    <View style={styles.infoTextWrapper}>
                      <Text style={styles.infoLabel}>Member Since</Text>
                      <Text style={styles.infoValue}>{formatDate(profile?.created_at)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isEditing ? (
                  <>
                    <Button
                      mode="outlined"
                      onPress={handleCancelEdit}
                      style={[styles.actionBtn, { borderColor: '#1A237E' }]}
                      textColor="#1A237E"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleUpdateProfile}
                      style={[styles.actionBtn, styles.saveBtn]}
                      buttonColor="#1A237E"
                      loading={saving}
                      disabled={saving}
                    >
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => setIsEditing(true)}
                    style={styles.editBtn}
                    buttonColor="#1A237E"
                    icon="pencil-outline"
                  >
                    Edit Profile
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* PWA Install Card */}
          {isInstallable && (
            <Card style={[styles.detailsCard, { marginTop: 4 }]} elevation={2}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
                <MaterialCommunityIcons name="cellphone-arrow-down" size={40} color="#1A237E" />
                <Text variant="titleMedium" style={{ fontWeight: '800', color: '#1A237E', marginTop: 12 }}>
                  Install Flortek App
                </Text>
                <Text style={{ color: '#546E7A', textAlign: 'center', marginVertical: 8, fontSize: 13, lineHeight: 18 }}>
                  Install the application on your device for quick access, offline support, and a full native experience!
                </Text>
                <Button
                  mode="contained"
                  onPress={handleInstallPWA}
                  style={{ borderRadius: 10, width: '100%', marginTop: 8 }}
                  buttonColor="#1A237E"
                  icon="download"
                >
                  Install App
                </Button>
              </Card.Content>
            </Card>
          )}

          {/* Logout button at bottom */}
          <TouchableOpacity
            style={styles.logoutContainer}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="logout-variant" size={20} color="#EF5350" />
            <Text style={styles.logoutText}>Sign Out of My Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  heroCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  heroBackground: {
    backgroundColor: '#1A237E',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8EAF6',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A237E',
    letterSpacing: 1,
  },
  heroName: {
    color: '#ffffff',
    fontWeight: '800',
    textAlign: 'center',
  },
  heroEmail: {
    color: '#B0BEC5',
    marginTop: 4,
    textAlign: 'center',
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 12,
    gap: 6,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#263238',
    marginBottom: 10,
    paddingLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  statContent: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#263238',
  },
  statLabel: {
    fontSize: 10,
    color: '#78909C',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  detailsCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  detailsTitle: {
    fontWeight: '800',
    color: '#1A237E',
    marginBottom: 8,
  },
  divider: {
    backgroundColor: '#ECEFF1',
    height: 1,
    marginBottom: 16,
  },
  formContainer: {
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
  },
  helpText: {
    color: '#78909C',
    marginTop: -12,
    marginBottom: 16,
    paddingLeft: 4,
  },
  infoContainer: {
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 16,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#263238',
    fontWeight: '600',
    marginTop: 2,
  },
  rowDivider: {
    backgroundColor: '#F4F6F9',
    height: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },
  saveBtn: {
    elevation: 2,
  },
  editBtn: {
    flex: 1,
    borderRadius: 10,
    elevation: 2,
    paddingVertical: 4,
  },
  logoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: '800',
    fontSize: 14,
  },
});