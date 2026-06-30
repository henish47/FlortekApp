import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ActivityIndicator,
  IconButton,
  TextInput,
  Menu,
  Divider,
} from 'react-native-paper';
import { useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';

import {
  getVariantsByCategory,
  addProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getSubcategories,
} from '../../services/productService';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CategoryProducts() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const categoryId = params.id;
  const categoryName = params.name || 'Category Products';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [variantsList, setVariantsList] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [varSize, setVarSize] = useState('');
  const [varCapacities, setVarCapacities] = useState([]);
  const [capacityInput, setCapacityInput] = useState('');
  const [varColors, setVarColors] = useState([]);
  const [colorInput, setColorInput] = useState('');

  const loadVariants = useCallback(async () => {
    try {
      const data = await getVariantsByCategory(categoryId);
      setVariantsList(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load variants.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId]);

  const loadSubcategories = useCallback(async () => {
    try {
      const data = await getSubcategories(categoryId);
      setSubcategories(data || []);
    } catch (err) {
      console.warn('Failed to load subcategories:', err);
    }
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      loadVariants();
      loadSubcategories();
    }, [loadVariants, loadSubcategories])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadVariants();
    loadSubcategories();
  };

  const openVariantModal = (variant = null) => {
    if (variant) {
      setEditingVariant(variant);
      setVarSize(variant.size || '');
      setCapacityInput(variant.load_capacity || '');
      setColorInput('');
      setSelectedSubcategory(variant.sub_category || null);
      setVarCapacities([]);
      setVarColors(variant.color ? [variant.color] : []);
    } else {
      setEditingVariant(null);
      setVarSize('');
      setCapacityInput('');
      setColorInput('');
      setSelectedSubcategory(null);
      setVarCapacities([]);
      setVarColors([]);
    }
    setVariantModalVisible(true);
  };

  const addCapacityChip = () => {
    const trimmed = capacityInput.trim();
    if (!trimmed) return;
    if (varCapacities.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      Alert.alert('Duplicate', `"${trimmed}" is already added.`);
      return;
    }
    setVarCapacities(prev => [...prev, trimmed]);
    setCapacityInput('');
  };

  const removeCapacityChip = (index) => {
    setVarCapacities(prev => prev.filter((_, i) => i !== index));
  };

  const addColorChip = () => {
    const trimmed = colorInput.trim();
    if (!trimmed) return;
    if (varColors.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      Alert.alert('Duplicate', `"${trimmed}" is already added.`);
      return;
    }
    setVarColors(prev => [...prev, trimmed]);
    setColorInput('');
  };

  const removeColorChip = (index) => {
    setVarColors(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveVariant = async () => {
    if (!varSize.trim()) {
      Alert.alert('Required Fields', 'Size is required.');
      return;
    }

    if (editingVariant) {
      if (!capacityInput.trim()) {
        Alert.alert('Required Fields', 'Weight Capacity is required.');
        return;
      }
      try {
        setLoading(true);
        setVariantModalVisible(false);

        const finalColors = varColors.length > 0 ? varColors : ['Standard'];
        const firstColor = finalColors[0];
        const extraColors = finalColors.slice(1);

        const payload = {
          category_id: categoryId,
          sub_category: selectedSubcategory,
          size: varSize.trim(),
          color: firstColor.trim(),
          load_capacity: capacityInput.trim(),
        };
        await updateProductVariant(editingVariant.id, payload);

        // If there are extra colors, add them as new variants
        const promises = extraColors.map((col) =>
          addProductVariant({
            category_id: categoryId,
            sub_category: selectedSubcategory,
            size: varSize.trim(),
            color: col.trim(),
            load_capacity: capacityInput.trim(),
          })
        );

        if (promises.length > 0) {
          await Promise.all(promises);
        }

        Alert.alert('Success', 'Product specifications updated successfully.');
        loadVariants();
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to save product specifications.');
        setLoading(false);
      }
    } else {
      if (varCapacities.length === 0) {
        Alert.alert('Required Fields', 'Please add at least one weight capacity.');
        return;
      }
      try {
        setLoading(true);
        setVariantModalVisible(false);

        const finalColors = varColors.length > 0 ? varColors : ['Standard'];

        const promises = [];
        varCapacities.forEach((cap) => {
          finalColors.forEach((col) => {
            promises.push(
              addProductVariant({
                category_id: categoryId,
                sub_category: selectedSubcategory,
                size: varSize.trim(),
                color: col.trim(),
                load_capacity: cap.trim(),
              })
            );
          });
        });

        await Promise.all(promises);
        Alert.alert('Success', 'Product variant specifications added successfully.');
        loadVariants();
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to save product specifications.');
        setLoading(false);
      }
    }
  };

  const handleDeleteVariant = (v) => {
    Alert.alert(
      'Delete Variant',
      `Remove variant (${v.size}, ${v.load_capacity})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteProductVariant(v.id);
              loadVariants();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete variant.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const groupedBySize = useMemo(() => {
    const map = {};
    variantsList.forEach((v) => {
      const key = v.size;
      if (!map[key]) {
        map[key] = { size: v.size, variants: [] };
      }
      map[key].variants.push(v);
    });
    return Object.values(map);
  }, [variantsList]);

  const isWide = width > 600;

  return (
    <View style={styles.container}>
      <Topbar title={categoryName} showBack={true} roleBadge="Admin" />

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.loaderText}>Loading specifications…</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* ── Action Header ── */}
          <View style={styles.actionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Products & Specs</Text>
              <Text style={styles.sectionSubtitle}>
                {groupedBySize.length} size{groupedBySize.length !== 1 ? 's' : ''} · {variantsList.length} variant{variantsList.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => openVariantModal()}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Add Variant</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={groupedBySize}
            keyExtractor={(item) => item.size}
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
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MaterialCommunityIcons name="cube-outline" size={40} color="#9FA8DA" />
                </View>
                <Text style={styles.emptyText}>No Products Yet</Text>
                <Text style={styles.emptySubText}>
                  Add product variants to this category using the button above.
                </Text>
              </View>
            )}
            renderItem={({ item: group }) => (
              <View style={styles.groupContainer}>
                {/* Size Header */}
                <View style={styles.groupHeader}>
                  <MaterialCommunityIcons name="ruler" size={14} color="#3949AB" />
                  <Text style={styles.groupHeaderSizeText}>{group.size}</Text>
                </View>

                {/* Capacity Rows */}
                <View style={styles.groupBody}>
                  {group.variants.map((v, idx) => (
                    <View
                      key={v.id}
                      style={[
                        styles.capacityRow,
                        idx < group.variants.length - 1 && styles.capacityRowBorder,
                      ]}
                    >
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={styles.capacityBadge}>
                          <MaterialCommunityIcons name="weight" size={12} color="#00796B" />
                          <Text style={styles.capacityBadgeText}>{v.load_capacity}</Text>
                        </View>
                        {v.color && v.color !== 'Standard' && (
                          <View style={styles.colorPill}>
                            <MaterialCommunityIcons name="palette" size={10} color="#C62828" />
                            <Text style={styles.colorPillText}>{v.color}</Text>
                          </View>
                        )}
                        {v.sub_category && (
                          <View style={styles.subcatPill}>
                            <MaterialCommunityIcons name="file-tree" size={10} color="#7E57C2" />
                            <Text style={styles.subcatPillText}>
                              {subcategories.find(s => s.id === v.sub_category || s.name === v.sub_category)?.name || v.sub_category}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => openVariantModal(v)}
                          activeOpacity={0.75}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="pencil" size={14} color="#1A237E" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteVariant(v)}
                          activeOpacity={0.75}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF5350" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ── Add / Edit Variant Modal ── */}
      <Modal
        visible={variantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setVariantModalVisible(false)}
          />
          <View style={styles.modalCard}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            {/* Modal title */}
            <View style={styles.modalTitleRow}>
              <View style={styles.modalTitleIcon}>
                <MaterialCommunityIcons
                  name={editingVariant ? 'pencil' : 'plus'}
                  size={18}
                  color="#1A237E"
                />
              </View>
              <Text style={styles.modalTitle}>
                {editingVariant ? 'Edit Variant' : 'Add New Variant'}
              </Text>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {subcategories.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>SUBCATEGORY (OPTIONAL)</Text>
                  <View style={styles.chipWrap}>
                    <TouchableOpacity
                      onPress={() => setSelectedSubcategory(null)}
                      style={[
                        styles.chip,
                        !selectedSubcategory
                          ? { backgroundColor: '#1A237E' }
                          : { backgroundColor: '#ECEFF1', borderWidth: 1, borderColor: '#CFD8DC' }
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.chipText,
                        !selectedSubcategory ? { color: '#ffffff' } : { color: '#546E7A', fontWeight: 'normal' }
                      ]}>
                        None
                      </Text>
                    </TouchableOpacity>

                    {subcategories.map((sub) => {
                      const isSelected = selectedSubcategory === sub.id || selectedSubcategory === sub.name;
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          onPress={() => setSelectedSubcategory(sub.id)}
                          style={[
                            styles.chip,
                            isSelected
                              ? { backgroundColor: '#1A237E' }
                              : { backgroundColor: '#ECEFF1', borderWidth: 1, borderColor: '#CFD8DC' }
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[
                            styles.chipText,
                            isSelected ? { color: '#ffffff' } : { color: '#37474F', fontWeight: 'normal' }
                          ]}>
                            {sub.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>SIZE</Text>
              <TextInput
                placeholder="e.g. 300x300x25mm"
                value={varSize}
                onChangeText={setVarSize}
                mode="outlined"
                activeOutlineColor="#1A237E"
                outlineColor="#E0E0E0"
                style={styles.dialogInput}
                left={<TextInput.Icon icon="ruler" color="#9FA8DA" />}
              />

              <Text style={styles.inputLabel}>WEIGHT CAPACITY</Text>
              {editingVariant ? (
                <TextInput
                  placeholder="e.g. 5 Ton"
                  value={capacityInput}
                  onChangeText={setCapacityInput}
                  mode="outlined"
                  activeOutlineColor="#1A237E"
                  outlineColor="#E0E0E0"
                  style={styles.dialogInput}
                  left={<TextInput.Icon icon="weight" color="#9FA8DA" />}
                />
              ) : (
                <View style={styles.capacitySection}>
                  {varCapacities.length > 0 && (
                    <View style={styles.chipWrap}>
                      {varCapacities.map((cap, idx) => (
                        <View key={idx} style={styles.chip}>
                          <View style={styles.chipDot} />
                          <Text style={styles.chipText}>{cap}</Text>
                          <TouchableOpacity
                            onPress={() => removeCapacityChip(idx)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.chipRemove}
                          >
                            <MaterialCommunityIcons name="close" size={13} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.capacityInputRow}>
                    <View style={styles.capacityInputWrapper}>
                      <TextInput
                        label="Capacity name"
                        value={capacityInput}
                        onChangeText={setCapacityInput}
                        mode="outlined"
                        activeOutlineColor="#1A237E"
                        outlineColor="#E0E0E0"
                        style={styles.capacityInputField}
                        onSubmitEditing={addCapacityChip}
                        returnKeyType="done"
                        dense
                      />
                    </View>
                    <TouchableOpacity
                      onPress={addCapacityChip}
                      activeOpacity={0.7}
                      style={[
                        styles.capacityAddBtn,
                        !capacityInput.trim() && styles.capacityAddBtnDisabled,
                      ]}
                    >
                      <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>COLOR / COLORS</Text>
              <View style={[styles.capacitySection, { marginTop: 4 }]}>
                {varColors.length > 0 && (
                  <View style={styles.chipWrap}>
                    {varColors.map((col, idx) => (
                      <View key={idx} style={[styles.chip, { backgroundColor: '#F3E5F5', borderColor: '#E1BEE7' }]}>
                        <View style={[styles.chipDot, { backgroundColor: '#8E24AA' }]} />
                        <Text style={[styles.chipText, { color: '#4A148C' }]}>{col}</Text>
                        <TouchableOpacity
                          onPress={() => removeColorChip(idx)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.chipRemove}
                        >
                          <MaterialCommunityIcons name="close" size={13} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.capacityInputRow}>
                  <View style={styles.capacityInputWrapper}>
                    <TextInput
                      label="Color name (e.g. Grey)"
                      value={colorInput}
                      onChangeText={setColorInput}
                      mode="outlined"
                      activeOutlineColor="#1A237E"
                      outlineColor="#E0E0E0"
                      style={styles.capacityInputField}
                      onSubmitEditing={addColorChip}
                      returnKeyType="done"
                      dense
                    />
                  </View>
                  <TouchableOpacity
                    onPress={addColorChip}
                    activeOpacity={0.7}
                    style={[
                      styles.capacityAddBtn,
                      { backgroundColor: '#8E24AA' },
                      !colorInput.trim() && styles.capacityAddBtnDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setVariantModalVisible(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveVariant}
                style={styles.modalSaveBtn}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name={editingVariant ? 'check' : 'plus'} size={16} color="#fff" />
                <Text style={styles.modalSaveText}>
                  {editingVariant ? 'Save Changes' : 'Add Variant'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F8',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: '#78909C',
    fontSize: 13,
    fontWeight: '500',
  },

  // ── Action Header ──
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#1A237E',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#90A4AE',
    fontWeight: '500',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A237E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
    elevation: 3,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // ── Grouped Variant list styles ──
  groupContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EAF0',
    overflow: 'hidden',
    shadowColor: '#1A237E',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FD',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF5',
  },
  groupHeaderSizeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3949AB',
  },
  groupBody: {
    paddingHorizontal: 16,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  capacityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F8',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  capacityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796B',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listSeparator: {
    height: 12,
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#F7F8FD',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  sizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF0FB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  sizeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3949AB',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  capacityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00796B',
  },
  variantCountPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#90A4AE',
    backgroundColor: '#ECEFF1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F2F8',
    marginHorizontal: 0,
  },

  // Color list rows
  colorList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  colorRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F8',
  },
  colorRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9FA8DA',
  },
  colorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  colorRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF0FB',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A237E',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF3F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF0FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#37474F',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 6,
  },
  emptySubText: {
    color: '#90A4AE',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '800',
    color: '#1A237E',
    fontSize: 19,
  },
  modalScroll: {
    flexGrow: 0,
  },
  inputLabel: {
    fontSize: 11,
    color: '#90A4AE',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  dialogInput: {
    backgroundColor: '#ffffff',
    marginBottom: 14,
  },

  // Capacity section in modal
  capacitySection: {
    borderWidth: 1,
    borderColor: '#E8EAF0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FAFBFF',
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A237E',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  chipRemove: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capacityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  capacityInputWrapper: {
    flex: 1,
  },
  capacityInputField: {
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  capacityAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1A237E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  capacityAddBtnDisabled: {
    backgroundColor: '#CFD8DC',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#78909C',
    fontWeight: '700',
    fontSize: 15,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#1A237E',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  subcatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#ffffff',
    marginTop: 4,
    gap: 8,
  },
  subcatSelectorText: {
    fontSize: 14,
    color: '#263238',
    fontWeight: '600',
  },
  subcatPlaceholder: {
    color: '#90A4AE',
    fontWeight: 'normal',
  },
  subcatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3E5F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: '#E1BEE7',
  },
  subcatPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E57C2',
  },
  colorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: '#FFCDD2',
  },
  colorPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C62828',
  },
});