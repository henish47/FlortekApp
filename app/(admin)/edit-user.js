import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Menu,
  ActivityIndicator,
} from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserById, updateUser } from '../../services/userService';
import Topbar from '../../components/Topbar';

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Customer', value: 'customer' },
];

export default function EditUser() {
  const { id } = useLocalSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState(ROLES[1]); // Default to Customer
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserData();
    } else {
      Alert.alert('Error', 'User ID is missing.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [id]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = await getUserById(id);
      if (user) {
        setFullName(user.full_name || '');
        setEmail(user.email || '');
        setMobile(user.mobile || '');
        
        const matchedRole = ROLES.find(r => r.value === (user.role || '').toLowerCase());
        if (matchedRole) {
          setRole(matchedRole);
        } else if (user.role) {
          setRole({
            label: user.role.charAt(0).toUpperCase() + user.role.slice(1),
            value: user.role.toLowerCase()
          });
        }
      } else {
        Alert.alert('Error', 'User not found.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('loadUserData error:', error);
      Alert.alert('Error', 'Failed to fetch user details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    const trimmedName = fullName.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter full name.');
      return;
    }
    if (!trimmedMobile || trimmedMobile.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setSaving(true);
      await updateUser(id, trimmedName, trimmedMobile, role.value);
      if (Platform.OS === 'web') {
        alert('User profile updated successfully.');
        router.back();
      } else {
        Alert.alert('Success', 'User profile updated successfully.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#1A237E" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Topbar title="Edit User Details" showBack={true} roleBadge="Admin" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Profile Information
            </Text>
            
            <TextInput
              label="Email Address"
              value={email}
              disabled={true}
              mode="outlined"
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              style={[styles.input, styles.disabledInput]}
            />
            <Text variant="bodySmall" style={styles.helpText}>
              Email address cannot be edited for security reasons.
            </Text>

            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              style={styles.input}
              placeholder="e.g. John Doe"
            />

            <TextInput
              label="Mobile Number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              mode="outlined"
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              style={styles.input}
              placeholder="e.g. 9876543210"
              maxLength={15}
            />

            {/* Role Dropdown */}
            <View style={styles.dropdownContainer}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity onPress={() => setMenuVisible(true)} activeOpacity={0.7}>
                    <TextInput
                      label="Assigned Role"
                      value={role.label}
                      editable={false}
                      mode="outlined"
                      outlineColor="#CFD8DC"
                      activeOutlineColor="#1A237E"
                      style={{ backgroundColor: '#ffffff' }}
                      right={<TextInput.Icon icon="menu-down" onPress={() => setMenuVisible(true)} />}
                    />
                  </TouchableOpacity>
                }
              >
                {ROLES.map((r) => (
                  <Menu.Item
                    key={r.value}
                    onPress={() => {
                      setRole(r);
                      setMenuVisible(false);
                    }}
                    title={r.label}
                    titleStyle={{
                      color: role.value === r.value ? '#1A237E' : '#263238',
                      fontWeight: role.value === r.value ? 'bold' : 'normal',
                    }}
                  />
                ))}
              </Menu>
            </View>

            <Button
              mode="contained"
              onPress={handleUpdateUser}
              loading={saving}
              disabled={saving}
              style={styles.submitButton}
              buttonColor="#1A237E"
            >
              Update User
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#263238',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#ECEFF1',
  },
  helpText: {
    color: '#78909C',
    marginTop: -12,
    marginBottom: 16,
    paddingLeft: 4,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
