import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Card, Text, Snackbar, TextInput, Divider, Button } from 'react-native-paper';
import {
  getDropdownFields,
  updateDropdownFieldsOrder,
} from '../../services/productService';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

export default function AdminDropdownFields() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const categoryId = params.id;
  const categoryName = params.name || 'Category';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);
  const [positions, setPositions] = useState({});
  
  // Feedback
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loadDropdownFields = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDropdownFields(categoryId);
      setFields(data || []);
      
      const posMap = {};
      (data || []).forEach((item) => {
        posMap[item.id] = String(item.position);
      });
      setPositions(posMap);
    } catch (err) {
      Alert.alert('Error', 'Failed to load dropdown fields.');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadDropdownFields();
  }, [loadDropdownFields]);

  const handlePositionChange = (fieldId, text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPositions((prev) => ({
      ...prev,
      [fieldId]: cleaned,
    }));
  };

  const handleSavePositions = async () => {
    const invalid = Object.values(positions).some((val) => {
      const num = parseInt(val, 10);
      return isNaN(num) || num <= 0;
    });

    if (invalid) {
      Alert.alert('Invalid Positions', 'Please enter valid positive numbers for all positions.');
      return;
    }

    try {
      setSaving(true);
      const updatedFields = fields.map((f) => ({
        ...f,
        position: parseInt(positions[f.id], 10),
      }));

      // Sort fields by their input position ascending
      updatedFields.sort((a, b) => a.position - b.position);

      await updateDropdownFieldsOrder(categoryId, updatedFields);
      showToast('Dropdown fields order updated successfully.');
      loadDropdownFields();
    } catch (err) {
      Alert.alert('Error', 'Failed to save fields ordering.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const isWide = width > 600;

  return (
    <View style={styles.container}>
      <Topbar title={`${categoryName} Dropdowns`} showBack={true} roleBadge="Admin" />

      {loading && fields.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.loaderText}>Loading fields configuration...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingTop: 20 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              isWide && { alignSelf: 'center', width: 600 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Card style={styles.infoCard} elevation={1}>
              <Card.Content style={styles.infoContent}>
                <MaterialCommunityIcons name="information-outline" size={24} color="#1A237E" />
                <Text style={styles.infoText}>
                  Change the order of dropdowns in the Customer App for "{categoryName}". Enter numbers (1, 2, 3...) in the position boxes below to set the display sequence, then click Save.
                </Text>
              </Card.Content>
            </Card>

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Dropdown Fields List
            </Text>

            <Card style={styles.listCard} elevation={2}>
              <Card.Content style={{ paddingVertical: 8 }}>
                {fields.map((item, index) => {
                  let fieldIcon = 'format-size';
                  if (item.id === 'load_capacity') fieldIcon = 'weight';
                  if (item.id === 'color') fieldIcon = 'palette-outline';

                  return (
                    <View key={item.id}>
                      <View style={styles.fieldRow}>
                        <View style={styles.fieldLeft}>
                          <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name={fieldIcon} size={20} color="#1A237E" />
                          </View>
                          <Text variant="titleMedium" style={styles.fieldName}>
                            {item.name}
                          </Text>
                        </View>
                        <TextInput
                          value={positions[item.id] || ''}
                          onChangeText={(text) => handlePositionChange(item.id, text)}
                          keyboardType="numeric"
                          mode="outlined"
                          style={styles.positionInput}
                          dense
                          outlineColor="#CFD8DC"
                          activeOutlineColor="#1A237E"
                          maxLength={2}
                          textAlign="center"
                        />
                      </View>
                      {index < fields.length - 1 && <Divider style={styles.rowDivider} />}
                    </View>
                  );
                })}
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={handleSavePositions}
              loading={saving}
              disabled={saving}
              buttonColor="#1A237E"
              style={styles.saveButton}
              labelStyle={{ fontWeight: 'bold' }}
              icon="content-save-outline"
            >
              Save Fields Order
            </Button>

            <Text style={styles.hintText}>
              💡 Tip: The dropdowns will display on the home page sorted from lowest position number to highest.
            </Text>
          </ScrollView>
        </View>
      )}

      {/* Snackbar feedback */}
      <Snackbar
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
        duration={2000}
        style={styles.snackbar}
      >
        {toastMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#546E7A',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#E8EAF6',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#283593',
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#263238',
    fontSize: 15,
    marginBottom: 10,
    paddingLeft: 4,
  },
  listCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldName: {
    fontWeight: '700',
    color: '#37474F',
    fontSize: 15,
    marginLeft: 12,
  },
  positionInput: {
    width: 60,
    height: 40,
    backgroundColor: '#ffffff',
  },
  saveButton: {
    marginTop: 24,
    borderRadius: 8,
    paddingVertical: 4,
  },
  rowDivider: {
    backgroundColor: '#ECEFF1',
    height: 1,
  },
  hintText: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'center',
    marginTop: 14,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: '#37474F',
    borderRadius: 8,
  },
});
