import { useState } from 'react';
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
} from 'react-native-paper';
import { router } from 'expo-router';
import { createUser } from '../../services/userService';
import Topbar from '../../components/Topbar';

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Customer', value: 'customer' },
];

export default function AddUser() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES[1]); // Default to Customer
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  const validateEmail = (text) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  const handleCreateUser = async () => {
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter full name.');
      return;
    }
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    if (!trimmedMobile || trimmedMobile.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await createUser(
        trimmedEmail,
        password,
        trimmedName,
        trimmedMobile,
        role.value
      );
      Alert.alert('Success', 'User created successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Topbar title="Add New User" showBack={true} roleBadge="Admin" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              User Details
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
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              mode="outlined"
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              style={styles.input}
              placeholder="e.g. john@example.com"
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

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              mode="outlined"
              outlineColor="#CFD8DC"
              activeOutlineColor="#1A237E"
              style={styles.input}
              placeholder="Min 6 characters"
              right={
                <TextInput.Icon
                  icon={secureText ? 'eye-off' : 'eye'}
                  onPress={() => setSecureText(!secureText)}
                />
              }
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
              onPress={handleCreateUser}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              buttonColor="#1A237E"
            >
              Create User
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
  dropdownContainer: {
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
