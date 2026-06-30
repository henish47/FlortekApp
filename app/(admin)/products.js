import { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  IconButton,
  TextInput,
  Portal,
  Dialog,
} from 'react-native-paper';
import { router } from 'expo-router';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../../services/productService';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminProducts() {
  const { width } = useWindowDimensions();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [categoriesList, setCategoriesList] = useState([]);

  // Category Modal States
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null if adding
  const [catName, setCatName] = useState('');

  useEffect(() => {
    loadCategoriesData();
  }, []);

  const loadCategoriesData = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategoriesList(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCategoriesData();
  };

  // Category CRUD Actions
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name || '');
    } else {
      setEditingCategory(null);
      setCatName('');
    }
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      Alert.alert('Required Field', 'Please enter a Category Name.');
      return;
    }

    try {
      setLoading(true);
      setCategoryModalVisible(false);

      const payload = {
        name: catName.trim(),
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        Alert.alert('Success', 'Category updated successfully.');
      } else {
        await addCategory(payload);
        Alert.alert('Success', 'Category created successfully.');
      }
      loadCategoriesData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save category.');
      setLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? This will delete all of its product specifications.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteCategory(cat.id);
              Alert.alert('Deleted', 'Category deleted successfully.');
              loadCategoriesData();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete category.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const navigateToCategoryProducts = (cat) => {
    router.push({
      pathname: '/(admin)/category-products',
      params: { id: cat.id, name: cat.name },
    });
  };

  const isWide = width > 600;

  return (
    <View style={styles.container}>
      <Topbar title="Product Categories" showBack={false} roleBadge="Admin" />

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.loaderText}>Loading categories...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.actionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Product Categories ({categoriesList.length})
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => openCategoryModal()}
              buttonColor="#1A237E"
              labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
              style={styles.addBtn}
            >
              Add Category
            </Button>
          </View>

          <FlatList
            data={categoriesList}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={[
              styles.listContent,
              isWide && { alignSelf: 'center', width: 600 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1A237E']}
              />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="folder-alert-outline"
                  size={64}
                  color="#CFD8DC"
                />
                <Text style={styles.emptyText}>No Categories Found</Text>
                <Text style={styles.emptySubText}>
                  Add your first product category using the button above.
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Card style={styles.itemCard} elevation={1}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigateToCategoryProducts(item)}
                  style={styles.cardPressable}
                >
                  <View style={styles.mainRow}>
                    <View style={styles.infoWrapper}>
                      <MaterialCommunityIcons
                        name="folder-outline"
                        size={24}
                        color="#1A237E"
                        style={styles.folderIcon}
                      />
                      <Text variant="titleMedium" style={styles.catName}>
                        {item.name}
                      </Text>
                    </View>

                    <View style={styles.actionsBox}>
                      <IconButton
                        icon="playlist-edit"
                        size={20}
                        iconColor="#00796B"
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({
                            pathname: '/(admin)/dropdown-fields',
                            params: { id: item.id, name: item.name },
                          });
                        }}
                        style={styles.actionBtn}
                      />
                      <IconButton
                        icon="file-tree"
                        size={20}
                        iconColor="#2E7D32"
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push({
                            pathname: '/(admin)/subcategories',
                            params: { id: item.id, name: item.name },
                          });
                        }}
                        style={styles.actionBtn}
                      />

                      <IconButton
                        icon="pencil-outline"
                        size={20}
                        iconColor="#1A237E"
                        onPress={(e) => {
                          e.stopPropagation();
                          openCategoryModal(item);
                        }}
                        style={styles.actionBtn}
                      />
                      <IconButton
                        icon="trash-can-outline"
                        size={20}
                        iconColor="#EF5350"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(item);
                        }}
                        style={styles.actionBtn}
                      />
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color="#B0BEC5"
                        style={styles.chevronIcon}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </Card>
            )}
          />
        </View>
      )}

      {/* PORTALS DIALOGS FOR FORMS */}
      <Portal>
        {/* Category Add/Edit Dialog */}
        <Dialog
          visible={categoryModalVisible}
          onDismiss={() => setCategoryModalVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Category Name"
              value={catName}
              onChangeText={setCatName}
              mode="outlined"
              activeOutlineColor="#1A237E"
              outlineColor="#CFD8DC"
              style={styles.dialogInput}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setCategoryModalVisible(false)}
              textColor="#78909C"
              labelStyle={{ fontWeight: '600' }}
            >
              Cancel
            </Button>
            <Button
              onPress={handleSaveCategory}
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  itemCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E4EC',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  cardPressable: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    marginRight: 12,
  },
  catName: {
    fontWeight: '700',
    color: '#37474F',
    fontSize: 16,
  },
  actionsBox: {
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
  chevronIcon: {
    marginLeft: 8,
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
});