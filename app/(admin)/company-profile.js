import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Topbar from '../../components/Topbar';
import {
  getCompanyProfile,
  upsertCompanyProfile,
  uploadCompanyLogo,
} from '../../services/companyService';

export default function CompanyProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [profileId, setProfileId] = useState(null);

  // Form fields
  const [companyName, setCompanyName]   = useState('');
  const [gstNumber, setGstNumber]       = useState('');
  const [address, setAddress]           = useState('');
  const [city, setCity]                 = useState('');
  const [state, setState]               = useState('');
  const [country, setCountry]           = useState('India');
  const [pincode, setPincode]           = useState('');
  const [mobile, setMobile]             = useState('');
  const [email, setEmail]               = useState('');
  const [website, setWebsite]           = useState('');
  const [logoUrl, setLogoUrl]           = useState('');
  const [localLogoUri, setLocalLogoUri] = useState(null); // preview before upload

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getCompanyProfile();
      if (profile) {
        setProfileId(profile.id);
        setCompanyName(profile.company_name || '');
        setGstNumber(profile.gst_number || '');
        setAddress(profile.address || '');
        setCity(profile.city || '');
        setState(profile.state || '');
        setCountry(profile.country || 'India');
        setPincode(profile.pincode || '');
        setMobile(profile.mobile || '');
        setEmail(profile.email || '');
        setWebsite(profile.website || '');
        setLogoUrl(profile.company_logo || '');
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
      Alert.alert('Error', 'Could not load company profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo access to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setLocalLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!companyName.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }

    try {
      setSaving(true);
      let finalLogoUrl = logoUrl;

      // Upload logo if a new one was picked
      if (localLogoUri) {
        setUploadingLogo(true);
        try {
          finalLogoUrl = await uploadCompanyLogo(localLogoUri);
          setLogoUrl(finalLogoUrl);
          setLocalLogoUri(null);
        } catch (err) {
          Alert.alert('Logo Upload Failed', err.message || 'Could not upload logo.');
          return;
        } finally {
          setUploadingLogo(false);
        }
      }

      const profileData = {
        company_name: companyName.trim(),
        gst_number: gstNumber.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'India',
        pincode: pincode.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        website: website.trim(),
        company_logo: finalLogoUrl,
      };

      await upsertCompanyProfile(profileData, profileId);

      Alert.alert('✅ Saved', 'Company profile updated successfully.');
    } catch (err) {
      console.error('Failed to save company profile:', err);
      Alert.alert('Save Failed', err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const displayLogoUri = localLogoUri || logoUrl;

  return (
    <View style={styles.container}>
      <Topbar title="Company Profile" showBack dark={false} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <TouchableOpacity
              style={styles.logoWrapper}
              onPress={handlePickLogo}
              activeOpacity={0.8}
            >
              {displayLogoUri ? (
                <Image source={{ uri: displayLogoUri }} style={styles.logoImage} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={36} color="#9E9E9E" />
                  <Text style={styles.logoPlaceholderText}>Upload Logo</Text>
                </View>
              )}

              {/* Edit overlay */}
              <View style={styles.logoEditBadge}>
                <MaterialCommunityIcons name="pencil" size={14} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <Text style={styles.logoHint}>
              {uploadingLogo ? 'Uploading...' : 'Tap to change logo'}
            </Text>
            {localLogoUri && !uploadingLogo && (
              <Text style={styles.logoPending}>New logo pending save</Text>
            )}
          </View>

          {/* Company Info Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="office-building-outline" size={20} color="#1A237E" />
              <Text style={styles.cardTitle}>Company Information</Text>
            </View>
            <Divider style={styles.cardDivider} />

            <TextInput
              label="Company Name *"
              value={companyName}
              onChangeText={setCompanyName}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="domain" />}
              placeholder="e.g. Flortek FRP Pvt. Ltd."
            />

            <TextInput
              label="GST Number"
              value={gstNumber}
              onChangeText={setGstNumber}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="file-certificate-outline" />}
              autoCapitalize="characters"
              placeholder="e.g. 27AABCF1234A1Z5"
            />
          </View>

          {/* Address Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#1A237E" />
              <Text style={styles.cardTitle}>Address</Text>
            </View>
            <Divider style={styles.cardDivider} />

            <TextInput
              label="Street Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="home-outline" />}
              multiline
              numberOfLines={2}
            />

            <View style={styles.twoCol}>
              <TextInput
                label="City"
                value={city}
                onChangeText={setCity}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineStyle={styles.inputOutline}
              />
              <View style={{ width: 12 }} />
              <TextInput
                label="State"
                value={state}
                onChangeText={setState}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineStyle={styles.inputOutline}
              />
            </View>

            <View style={styles.twoCol}>
              <TextInput
                label="Country"
                value={country}
                onChangeText={setCountry}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineStyle={styles.inputOutline}
              />
              <View style={{ width: 12 }} />
              <TextInput
                label="Pincode"
                value={pincode}
                onChangeText={setPincode}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineStyle={styles.inputOutline}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>

          {/* Contact Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="phone-outline" size={20} color="#1A237E" />
              <Text style={styles.cardTitle}>Contact Details</Text>
            </View>
            <Divider style={styles.cardDivider} />

            <TextInput
              label="Mobile / Phone"
              value={mobile}
              onChangeText={setMobile}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="phone-outline" />}
              keyboardType="phone-pad"
            />

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="email-outline" />}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              label="Website"
              value={website}
              onChangeText={setWebsite}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="web" />}
              keyboardType="url"
              autoCapitalize="none"
              placeholder="e.g. https://flortek.in"
            />
          </View>

          {/* Save Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving || uploadingLogo}
            disabled={saving || uploadingLogo}
            style={styles.saveBtn}
            contentStyle={styles.saveBtnContent}
            labelStyle={styles.saveBtnLabel}
            icon="content-save-outline"
          >
            {saving ? 'Saving...' : 'Save Company Profile'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logoWrapper: {
    position: 'relative',
    width: 110,
    height: 110,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E8EAF6',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 6,
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1A237E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  logoHint: {
    fontSize: 12,
    color: '#78909C',
    marginTop: 8,
  },
  logoPending: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 3,
    fontStyle: 'italic',
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A237E',
  },
  cardDivider: {
    marginBottom: 16,
    backgroundColor: '#F0F4F8',
  },

  // Inputs
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  inputOutline: {
    borderRadius: 10,
    borderColor: '#ECEFF1',
  },
  twoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Save
  saveBtn: {
    borderRadius: 14,
    backgroundColor: '#1A237E',
    marginTop: 4,
    elevation: 3,
  },
  saveBtnContent: {
    height: 52,
  },
  saveBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
