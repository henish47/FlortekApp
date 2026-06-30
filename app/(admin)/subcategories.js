import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Alert,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  TextInput,
  Portal,
  Dialog,
  Switch,
  Divider,
  Snackbar,
} from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import {
  getSubcategories,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../../services/productService';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminSubcategories() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const categoryId = params.id;
  const categoryName = params.name || 'Category';

  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState([]);
  
  // Dialog / Modal state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingSub, setEditingSub] = useState(null); // null if adding
  const [subName, setSubName] = useState('');
  const [subImage, setSubImage] = useState('');
  const [subIsActive, setSubIsActive] = useState(true);
  const [subPosition, setSubPosition] = useState('1');

  // Snackbar feedback
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const loadSubcategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSubcategories(categoryId);
      setSubcategories(data || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load subcategories.');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  const openAddEditDialog = (sub = null) => {
    if (sub) {
      setEditingSub(sub);
      setSubName(sub.name || '');
      setSubImage(sub.image || '');
      setSubIsActive(sub.is_active !== undefined ? sub.is_active : true);
      setSubPosition(sub.position !== undefined ? String(sub.position) : '1');
    } else {
      setEditingSub(null);
      setSubName('');
      setSubImage('');
      setSubIsActive(true);
      // Pre-fill with the next logical position
      const nextPos = subcategories.length > 0 
        ? Math.max(...subcategories.map(s => s.position || 0)) + 1 
        : 1;
      setSubPosition(String(nextPos));
    }
    setDialogVisible(true);
  };

  const handleSaveSubcategory = async () => {
    if (!subName.trim()) {
      Alert.alert('Required Field', 'Please enter a Subcategory Name.');
      return;
    }

    const posNum = parseInt(subPosition, 10);
    if (isNaN(posNum) || posNum <= 0) {
      Alert.alert('Invalid Position', 'Please enter a valid positive number for Position.');
      return;
    }

    try {
      setLoading(true);
      setDialogVisible(false);

      const payload = {
        categoryId: categoryId,
        name: subName.trim(),
        image: subImage.trim(),
        isActive: subIsActive,
        position: posNum,
      };

      if (editingSub) {
        await updateSubcategory(editingSub.id, payload);
        showToast('Subcategory updated successfully.');
      } else {
        await addSubcategory(payload);
        showToast('Subcategory created successfully.');
      }
      loadSubcategories();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save subcategory.');
      setLoading(false);
    }
  };

  const handleDeleteSubcategory = (sub) => {
    Alert.alert(
      'Delete Subcategory',
      `Are you sure you want to delete "${sub.name}"? This will unlink it from all product variants.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteSubcategory(sub.id);
              showToast('Subcategory deleted successfully.');
              loadSubcategories();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete subcategory.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  const renderItem = (item) => {
    return (
      <View style={styles.itemRowContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.itemImage} />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <MaterialCommunityIcons name="image-outline" size={18} color="#90A4AE" />
          </View>
        )}
        
        <View style={styles.itemInfo}>
          <Text variant="titleMedium" style={[styles.itemName, !item.is_active && styles.itemNameInactive]}>
            {item.name}
          </Text>
          <Text style={styles.itemStatusText}>
            Status: {item.is_active ? 'Active' : 'Inactive'} | Position: {item.position}
          </Text>
        </View>

        <View style={styles.itemActions}>
          <IconButton
            icon="pencil-outline"
            size={18}
            iconColor="#1A237E"
            onPress={() => openAddEditDialog(item)}
            style={styles.actionBtn}
          />
          <IconButton
            icon="trash-can-outline"
            size={18}
            iconColor="#EF5350"
            onPress={() => handleDeleteSubcategory(item)}
            style={styles.actionBtn}
          />
        </View>
      </View>
    );
  };

  const isWide = width > 600;

  return (
    <View style={styles.container}>
      <Topbar title={`${categoryName} Subcategories`} showBack={true} roleBadge="Admin" />

      {loading && subcategories.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.loaderText}>Loading subcategories...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Subcategories ({subcategories.length})
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => openAddEditDialog()}
              buttonColor="#1A237E"
              labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
              style={styles.addBtn}
            >
              Add Subcategory
            </Button>
          </View>

          {subcategories.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="file-tree-outline"
                size={64}
                color="#CFD8DC"
              />
              <Text style={styles.emptyText}>No Subcategories Found</Text>
              <Text style={styles.emptySubText}>
                Create subcategories under this category and specify their display positions.
              </Text>
            </ScrollView>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                isWide && { alignSelf: 'center', width: 600 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <Card style={styles.listCard} elevation={2}>
                <Card.Content style={{ paddingVertical: 8 }}>
                  {subcategories.map((item, index) => (
                    <View key={item.id}>
                      {renderItem(item)}
                      {index < subcategories.length - 1 && <Divider style={styles.rowDivider} />}
                    </View>
                  ))}
                </Card.Content>
              </Card>
              <Text style={styles.hintText}>
                💡 Tip: Subcategories are displayed in the customer screen sorted from lowest position number to highest.
              </Text>
            </ScrollView>
          )}
        </View>
      )}

      {/* Portal Dialog for Add/Edit Subcategory */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {editingSub ? 'Edit Subcategory' : 'Create Subcategory'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Subcategory Name"
              value={subName}
              onChangeText={setSubName}
              mode="outlined"
              activeOutlineColor="#1A237E"
              outlineColor="#CFD8DC"
              style={styles.dialogInput}
              autoFocus
            />
            <TextInput
              label="Image URL (Optional)"
              value={subImage}
              onChangeText={setSubImage}
              mode="outlined"
              activeOutlineColor="#1A237E"
              outlineColor="#CFD8DC"
              style={styles.dialogInput}
            />
            <TextInput
              label="Position (e.g. 1, 2, 3)"
              value={subPosition}
              onChangeText={(text) => setSubPosition(text.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              mode="outlined"
              activeOutlineColor="#1A237E"
              outlineColor="#CFD8DC"
              style={styles.dialogInput}
            />
            <View style={styles.switchRow}>
              <Text variant="bodyMedium" style={styles.switchLabel}>
                Status (Active)
              </Text>
              <Switch
                value={subIsActive}
                onValueChange={setSubIsActive}
                color="#1A237E"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setDialogVisible(false)}
              textColor="#78909C"
              labelStyle={{ fontWeight: '600' }}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveSubcategory}
              textColor="#ffffff"
              buttonColor="#1A237E"
              style={styles.dialogSaveBtn}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Save Changes
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#263238',
    fontSize: 15,
  },
  addBtn: {
    borderRadius: 8,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EAF0',
  },
  itemRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ECEFF1',
  },
  itemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontWeight: '700',
    color: '#37474F',
    fontSize: 15,
  },
  itemNameInactive: {
    color: '#90A4AE',
    textDecorationLine: 'line-through',
  },
  itemStatusText: {
    fontSize: 11,
    color: '#78909C',
    marginTop: 2,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    margin: 0,
    backgroundColor: '#F8F9FA',
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    marginTop: 16,
    color: '#37474F',
    fontWeight: '700',
    fontSize: 16,
  },
  emptySubText: {
    marginTop: 6,
    color: '#78909C',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 250,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingTop: 8,
  },
  dialogTitle: {
    fontWeight: '800',
    color: '#1A237E',
    fontSize: 18,
    textAlign: 'center',
  },
  dialogContent: {
    paddingTop: 8,
  },
  dialogInput: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    marginTop: 4,
  },
  switchLabel: {
    fontWeight: '600',
    color: '#37474F',
  },
  dialogActions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  dialogSaveBtn: {
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  snackbar: {
    backgroundColor: '#37474F',
    borderRadius: 8,
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
});
