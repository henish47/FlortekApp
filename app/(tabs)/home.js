import { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Card,
  Text,
  TextInput,
  Button,
  Divider,
  Menu,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getCategories,
  getVariantsByCategory,
  getSubcategories,
  getDropdownFields,
} from '../../services/productService';
import { supabase } from '../../services/supabase';
import { getCompanyProfile } from '../../services/companyService';
import useCartStore from '../../store/cartStore';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLOR_OPTIONS = ['Grey', 'White'];

const DropdownMenu = ({ label, value, options, onSelect, disabled, loadingState }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();

  const handleClose = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleSelectOption = (opt) => {
    onSelect(opt);
    handleClose();
  };

  const filteredOptions = options.filter((opt) => {
    const title = typeof opt === 'object' ? opt.name : String(opt);
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const displayValue = value || '';

  return (
    <View style={styles.dropdownWrapper}>
      <Pressable
        onPress={() => {
          if (!disabled && !loadingState) {
            setModalVisible(true);
          }
        }}
      >
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayValue}
            mode="outlined"
            editable={false}
            placeholder={`Select ${label.toLowerCase()}`}
            right={
              loadingState ? (
                <TextInput.Icon icon={() => <ActivityIndicator size="small" color="#1A237E" />} />
              ) : (
                <TextInput.Icon icon="chevron-down" color={disabled ? '#B0BEC5' : '#1A237E'} />
              )
            }
            disabled={disabled}
            style={[styles.input, disabled && styles.disabledInput]}
            outlineColor="#CFD8DC"
            activeOutlineColor="#1A237E"
          />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable style={styles.modalOverlay} onPress={handleClose}>
            <Pressable 
              style={[
                styles.modalContentContainer, 
                { 
                  maxHeight: screenHeight * 0.7, 
                  width: Math.min(screenWidth - 32, 450) 
                }
              ]}
              onPress={() => {}}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text variant="titleMedium" style={styles.modalTitle}>
                  Select {label}
                </Text>
                <Pressable onPress={handleClose} style={styles.modalCloseButton}>
                  <MaterialCommunityIcons name="close" size={22} color="#546E7A" />
                </Pressable>
              </View>

              <Divider style={styles.modalDivider} />

              {/* Search Box - Only show search if there are options */}
              {options.length > 0 && (
                <View style={styles.searchContainer}>
                  <TextInput
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    outlineColor="#ECEFF1"
                    activeOutlineColor="#1A237E"
                    dense
                    style={styles.searchInput}
                    left={<TextInput.Icon icon="magnify" color="#78909C" />}
                    right={
                      searchQuery ? (
                        <TextInput.Icon
                          icon="close-circle"
                          color="#78909C"
                          onPress={() => setSearchQuery('')}
                        />
                      ) : null
                    }
                  />
                </View>
              )}

              {/* Options List */}
              <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
                {displayValue ? (
                  <View>
                    <Pressable
                      onPress={() => handleSelectOption('')}
                      style={[styles.optionItem, { backgroundColor: '#FFEBEE', marginBottom: 8 }]}
                    >
                      <Text style={[styles.optionItemText, { color: '#C62828', fontWeight: 'bold' }]}>
                        Clear Selection
                      </Text>
                      <MaterialCommunityIcons name="eraser" size={20} color="#C62828" />
                    </Pressable>
                    <Divider style={{ marginBottom: 8 }} />
                  </View>
                ) : null}
                {options.length === 0 ? (
                  <View style={styles.noOptionsBox}>
                    <Text style={styles.noOptionsText}>No options available</Text>
                  </View>
                ) : filteredOptions.length === 0 ? (
                  <View style={styles.noOptionsBox}>
                    <Text style={styles.noOptionsText}>No matching {label.toLowerCase()} found</Text>
                  </View>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const optionTitle = typeof opt === 'object' ? opt.name : String(opt);
                    const isSelected = displayValue === optionTitle;

                    return (
                      <Pressable
                        key={idx}
                        onPress={() => handleSelectOption(opt)}
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionItemText,
                            isSelected && styles.optionItemTextSelected
                          ]}
                        >
                          {optionTitle}
                        </Text>
                        {isSelected && (
                          <MaterialCommunityIcons name="check" size={20} color="#1A237E" />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default function Home() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Side Drawer State & Animations
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [companyProfile, setCompanyProfile] = useState(null);
  const slideAnim = useRef(new Animated.Value(-width * 0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (drawerOpen) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width * 0.8,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [drawerOpen, width]);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const data = await getCompanyProfile();
        setCompanyProfile(data);
      } catch (err) {
        console.error('Error fetching company profile in Home:', err);
      }
    };
    fetchCompanyData();
  }, []);

  const getFormattedAddress = () => {
    if (!companyProfile) {
      return '-';
    }

    const parts = [];
    if (companyProfile.address && companyProfile.address.trim()) {
      parts.push(companyProfile.address.trim());
    }
    
    const cityStatePin = [];
    if (companyProfile.city && companyProfile.city.trim()) {
      cityStatePin.push(companyProfile.city.trim());
    }
    if (companyProfile.state && companyProfile.state.trim()) {
      cityStatePin.push(companyProfile.state.trim());
    }
    
    let cityStateStr = cityStatePin.join(', ');
    if (companyProfile.pincode && companyProfile.pincode.trim()) {
      cityStateStr += cityStateStr ? ` - ${companyProfile.pincode.trim()}` : companyProfile.pincode.trim();
    }
    
    if (cityStateStr) {
      parts.push(cityStateStr);
    }
    if (companyProfile.country && companyProfile.country.trim()) {
      parts.push(companyProfile.country.trim());
    }

    if (parts.length === 0) {
      return '-';
    }

    return parts.join('\n');
  };

  // Dropdown options and data states
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [dropdownFields, setDropdownFields] = useState([]);
  const [allVariants, setAllVariants] = useState([]);

  // Selections
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selections, setSelections] = useState({
    size: null,
    load_capacity: null,
    color: null,
  });

  const [quantity, setQuantity] = useState('1');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [sizesLoading, setSizesLoading] = useState(false);
  const [variantLoading, setVariantLoading] = useState(false);

  // Variant matching result
  const [matchedVariant, setMatchedVariant] = useState(null);

  // Snackbar notification
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  const addItemToCart = useCartStore((state) => state.addItem);

  // Fetch dropdown fields ordering (initially and via realtime)
  const loadFields = async (categoryId) => {
    try {
      const data = await getDropdownFields(categoryId);
      console.log('Fetched Fields:');
      (data || []).forEach((f) => {
        console.log(`${f.name} - ${f.position}`);
      });

      // Explicitly sort fields by position ascending
      const sorted = [...(data || [])].sort((a, b) => a.position - b.position);
      console.log('Sorted Positions:');
      sorted.forEach((f) => {
        console.log(`${f.name} - ${f.position}`);
      });

      setDropdownFields(sorted);
    } catch (err) {
      console.error('Error loading dropdown fields:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
    loadFields(null);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const catData = await getCategories();
      setCategories(catData);
    } catch (err) {
      console.error('Error loading initial categories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription and loading for subcategories/variants when Category changes
  useEffect(() => {
    if (!selectedCategory) {
      setSubcategories([]);
      setAllVariants([]);
      loadFields(null);
      return;
    }

    loadFields(selectedCategory.id);

    const fetchSubcategoriesAndVariants = async () => {
      try {
        setSizesLoading(true);
        const subcatData = await getSubcategories(selectedCategory.id);
        setSubcategories(subcatData || []);

        // Fallback: If no subcategories exist, load all category variants directly
        if (!subcatData || subcatData.length === 0) {
          const variantsData = await getVariantsByCategory(selectedCategory.id);
          setAllVariants(variantsData || []);
        } else {
          setAllVariants([]);
        }
      } catch (err) {
        console.error('Error loading subcategories/variants:', err);
      } finally {
        setSizesLoading(false);
      }
    };

    fetchSubcategoriesAndVariants();

    // Setup realtime subscription for subcategories under this category
    const subcatChannel = supabase
      .channel(`public:subcategories:${selectedCategory.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subcategories',
        },
        (payload) => {
          const row = payload.new || payload.old;
          if (row && row.category_id === selectedCategory.id) {
            fetchSubcategoriesAndVariants();
          }
        }
      )
      .subscribe();

    // Setup realtime subscription for dropdown fields under this category
    const fieldsChannel = supabase
      .channel(`public:category_dropdown_fields:${selectedCategory.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'category_dropdown_fields',
        },
        (payload) => {
          const row = payload.new || payload.old;
          if (row && row.category_id === selectedCategory.id) {
            loadFields(selectedCategory.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subcatChannel);
      supabase.removeChannel(fieldsChannel);
    };
  }, [selectedCategory]);

  const handleCategorySelect = (category) => {
    if (!category) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelections({ size: null, load_capacity: null, color: null });
      setMatchedVariant(null);
      return;
    }
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelections({ size: null, load_capacity: null, color: null });
    setMatchedVariant(null);
  };

  const handleSubcategorySelect = async (subcategory) => {
    if (!subcategory) {
      setSelectedSubcategory(null);
      setSelections({ size: null, load_capacity: null, color: null });
      setMatchedVariant(null);
      try {
        setSizesLoading(true);
        const variantsData = await getVariantsByCategory(selectedCategory.id);
        setAllVariants(variantsData || []);
      } catch (err) {
        console.error('Error loading variants:', err);
      } finally {
        setSizesLoading(false);
      }
      return;
    }

    setSelectedSubcategory(subcategory);
    setSelections({ size: null, load_capacity: null, color: null });
    setMatchedVariant(null);

    try {
      setSizesLoading(true);
      const variantsData = await getVariantsByCategory(selectedCategory.id);
      // Filter variants client-side that belong to this subcategory
      const filtered = (variantsData || []).filter(
        (v) => v.sub_category === subcategory.id || v.sub_category === subcategory.name
      );
      setAllVariants(filtered);
    } catch (err) {
      console.error('Error loading subcategory variants:', err);
    } finally {
      setSizesLoading(false);
    }
  };

  // Compute dynamic options for each field based on other selections
  const getOptionsForField = (fieldId) => {
    let filtered = allVariants;

    // Filter by selections of other fields
    Object.keys(selections).forEach((key) => {
      if (key !== fieldId && selections[key] !== null) {
        if (key === 'size') {
          filtered = filtered.filter((v) => v.size === selections.size);
        } else if (key === 'color') {
          filtered = filtered.filter((v) => v.color === selections.color);
        } else if (key === 'load_capacity') {
          filtered = filtered.filter((v) => v.load_capacity === selections.load_capacity);
        }
      }
    });

    // Extract unique sorted options
    let options = [];
    if (fieldId === 'size') {
      options = filtered.map((v) => v.size).filter(Boolean);
    } else if (fieldId === 'color') {
      options = filtered.map((v) => v.color).filter((c) => c && c !== 'Standard');
    } else if (fieldId === 'load_capacity') {
      options = filtered.map((v) => v.load_capacity).filter(Boolean);
    }

    const uniqueOptions = [...new Set(options)];
    return uniqueOptions.sort();
  };

  // Check if all active fields are selected
  const isSelectionComplete = useMemo(() => {
    if (!selectedCategory) return false;
    if (sizesLoading) return false;
    if (subcategories.length > 0 && !selectedSubcategory) return false;
    if (allVariants.length === 0) return false;

    let hasOptions = false;
    const allSelected = dropdownFields.every((field) => {
      const fieldId = field.id;
      const options = getOptionsForField(fieldId);
      if (options.length > 0) {
        hasOptions = true;
        return selections[fieldId] !== null;
      }
      return true;
    });

    return hasOptions && allSelected;
  }, [selectedCategory, selectedSubcategory, dropdownFields, selections, allVariants, sizesLoading]);

  // Auto-clear selections that are no longer valid options
  useEffect(() => {
    let changed = false;
    const newSelections = { ...selections };

    Object.keys(selections).forEach((fieldId) => {
      if (selections[fieldId] !== null) {
        const opts = getOptionsForField(fieldId);
        if (!opts.includes(selections[fieldId])) {
          newSelections[fieldId] = null;
          changed = true;
        }
      }
    });

    if (changed) {
      setSelections(newSelections);
    }
  }, [selections, allVariants]);

  // Match variant whenever selections or variants change
  useEffect(() => {
    if (isSelectionComplete) {
      setVariantLoading(true);
      const match = allVariants.find(
        (v) =>
          (selections.size ? v.size === selections.size : true) &&
          (selections.load_capacity ? v.load_capacity === selections.load_capacity : true) &&
          (selections.color ? v.color === selections.color : (v.color === 'Standard' || !v.color))
      );
      setMatchedVariant(match || null);
      setVariantLoading(false);
    } else {
      setMatchedVariant(null);
    }
  }, [isSelectionComplete, selections, allVariants]);

  const handleAddToCart = () => {
    if (!matchedVariant) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setSnackbarMessage('Please enter a valid quantity.');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    addItemToCart(
      {
        id: matchedVariant.id,
        category_id: selectedCategory.id,
        sub_category_id: selectedSubcategory?.id || null,
        name: selectedCategory.name + (selectedSubcategory ? ` - ${selectedSubcategory.name}` : ''),
        size: selections.size,
        color: selections.color || 'Standard',
        load_capacity: selections.load_capacity,
      },
      qty
    );
    
    setSnackbarMessage('Successfully added to cart!');
    setSnackbarType('success');
    setSnackbarVisible(true);

    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelections({ size: null, load_capacity: null, color: null });
    setQuantity('1');
    setMatchedVariant(null);
    setSubcategories([]);
    setAllVariants([]);
  };



  console.log('Rendered Order:');
  dropdownFields.forEach((f) => {
    console.log(f.name);
  });

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Loading products catalog...</Text>
      </View>
    );
  }

  const isWide = width > 700;

  return (
    <View style={styles.container}>
      <Topbar
        title="Home"
        roleBadge="Customer"
        showLogout={true}
        showMenu={true}
        onMenuPress={() => setDrawerOpen(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.mainLayout}>
          
          {/* Dropdown Selection Card */}
          <Card style={styles.card} elevation={3}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>Product Selection</Text>
              <Divider style={styles.divider} />

              <DropdownMenu
                label="Category"
                value={selectedCategory ? selectedCategory.name : ''}
                options={categories}
                onSelect={handleCategorySelect}
                disabled={categories.length === 0}
              />

              {subcategories.length > 0 && (
                <DropdownMenu
                  label="Subcategory"
                  value={selectedSubcategory ? selectedSubcategory.name : ''}
                  options={subcategories}
                  onSelect={handleSubcategorySelect}
                  disabled={!selectedCategory}
                  loadingState={sizesLoading}
                />
              )}

              {dropdownFields.map((field) => {
                const fieldId = field.id;
                const options = getOptionsForField(fieldId);
                if (options.length === 0) return null;

                const value = selections[fieldId];
                const isDisabled = !selectedCategory || (subcategories.length > 0 && !selectedSubcategory);

                return (
                  <DropdownMenu
                    key={fieldId}
                    label={field.name}
                    value={value || ''}
                    options={options}
                    onSelect={(val) => {
                      const optionVal = typeof val === 'object' ? val.name : val;
                      setSelections((prev) => ({
                        ...prev,
                        [fieldId]: optionVal,
                      }));
                    }}
                    disabled={isDisabled}
                  />
                );
              })}

              {variantLoading ? (
                <View style={styles.variantLoader}>
                  <ActivityIndicator size="small" color="#1A237E" />
                  <Text style={styles.variantLoaderText}>Matching variant details...</Text>
                </View>
              ) : matchedVariant ? (
                <View style={{ marginTop: 8 }}>
                  <Divider style={styles.divider} />

                   <TextInput
                    label="Quantity"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    mode="outlined"
                    outlineColor="#CFD8DC"
                    activeOutlineColor="#1A237E"
                    style={styles.quantityInput}
                  />

                  <Button
                    mode="contained"
                    onPress={handleAddToCart}
                    style={styles.addToCartBtn}
                    buttonColor="#1A237E"
                    icon="cart-outline"
                  >
                    Add to Cart
                  </Button>
                </View>
              ) : (isSelectionComplete && !matchedVariant) ? (
                <View style={styles.noVariantBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF5350" />
                  <Text style={styles.noVariantText}>Selected combination is currently unavailable.</Text>
                </View>
              ) : null}
            </Card.Content>
          </Card>

        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={{
          backgroundColor: snackbarType === 'success' ? '#2E7D32' : '#D32F2F',
        }}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* Company Details Side Drawer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setDrawerOpen(false)}
      >
        <View style={styles.modalRoot}>
          {/* Animated Drawer Backdrop */}
          <Animated.View
            style={[
              styles.drawerBackdrop,
              {
                opacity: opacityAnim,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={() => setDrawerOpen(false)}
            />
          </Animated.View>

          {/* Slide-in Drawer */}
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                width: width * 0.8,
                paddingTop: Math.max(12, insets.top),
                paddingBottom: Math.max(12, insets.bottom),
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              {companyProfile?.company_logo ? (
                <Image
                  source={{ uri: companyProfile.company_logo }}
                  style={styles.drawerLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.drawerLogoPlaceholder}>
                  <MaterialCommunityIcons name="office-building" size={32} color="#1A237E" />
                </View>
              )}
              <View style={styles.drawerHeaderTitleBox}>
                <Text style={styles.drawerHeaderTitle}>
                  {companyProfile?.company_name || 'Flortek Industries'}
                </Text>
                <Text style={styles.drawerHeaderSubtitle}>Company Profile</Text>
              </View>
              <Pressable
                onPress={() => setDrawerOpen(false)}
                style={styles.drawerCloseBtn}
              >
                <MaterialCommunityIcons name="close" size={24} color="#78909C" />
              </Pressable>
            </View>

            <Divider style={styles.drawerDivider} />

            <ScrollView
              contentContainerStyle={styles.drawerContent}
              showsVerticalScrollIndicator={false}
            >
              {/* GST Number */}
              <View style={styles.drawerItem}>
                <View style={styles.drawerItemIconBox}>
                  <MaterialCommunityIcons name="file-certificate-outline" size={22} color="#1A237E" />
                </View>
                <View style={styles.drawerItemTextBox}>
                  <Text style={styles.drawerItemLabel}>GST Number</Text>
                  <Text style={styles.drawerItemValue}>
                    {(companyProfile?.gst_number && companyProfile.gst_number.trim()) || '-'}
                  </Text>
                </View>
              </View>

              {/* Phone */}
              <View style={styles.drawerItem}>
                <View style={styles.drawerItemIconBox}>
                  <MaterialCommunityIcons name="phone-outline" size={22} color="#1A237E" />
                </View>
                <View style={styles.drawerItemTextBox}>
                  <Text style={styles.drawerItemLabel}>Phone / Mobile</Text>
                  <Text style={styles.drawerItemValue}>
                    {(companyProfile?.mobile && companyProfile.mobile.trim()) || '-'}
                  </Text>
                </View>
              </View>

              {/* Email */}
              <View style={styles.drawerItem}>
                <View style={styles.drawerItemIconBox}>
                  <MaterialCommunityIcons name="email-outline" size={22} color="#1A237E" />
                </View>
                <View style={styles.drawerItemTextBox}>
                  <Text style={styles.drawerItemLabel}>Email</Text>
                  <Text style={styles.drawerItemValue}>
                    {(companyProfile?.email && companyProfile.email.trim()) || '-'}
                  </Text>
                </View>
              </View>

              {/* Website */}
              <View style={styles.drawerItem}>
                <View style={styles.drawerItemIconBox}>
                  <MaterialCommunityIcons name="web" size={22} color="#1A237E" />
                </View>
                <View style={styles.drawerItemTextBox}>
                  <Text style={styles.drawerItemLabel}>Website</Text>
                  <Text style={styles.drawerItemValue}>
                    {(companyProfile?.website && companyProfile.website.trim()) || '-'}
                  </Text>
                </View>
              </View>

              {/* Address */}
              <View style={styles.drawerItem}>
                <View style={styles.drawerItemIconBox}>
                  <MaterialCommunityIcons name="map-marker-outline" size={22} color="#1A237E" />
                </View>
                <View style={styles.drawerItemTextBox}>
                  <Text style={styles.drawerItemLabel}>Address</Text>
                  <Text style={styles.drawerItemValue}>
                    {getFormattedAddress()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>Version 1.0.0</Text>
              <Text style={styles.drawerFooterSub}>Flortek Industries Pvt. Ltd.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  loadingText: {
    marginTop: 12,
    color: '#546E7A',
    fontWeight: '600',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  mainLayout: {
    flex: 1,
    gap: 16,
  },
  wideLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontWeight: '800',
    color: '#1A237E',
    marginBottom: 8,
  },
  divider: {
    backgroundColor: '#ECEFF1',
    height: 1,
    marginBottom: 16,
  },
  dropdownWrapper: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#FAFBFC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#1A237E',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDivider: {
    backgroundColor: '#ECEFF1',
    height: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  optionsList: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  noOptionsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noOptionsText: {
    color: '#78909C',
    fontSize: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: '#E8EAF6',
  },
  optionItemText: {
    fontSize: 15,
    color: '#263238',
    fontWeight: '500',
    flex: 1,
  },
  optionItemTextSelected: {
    color: '#1A237E',
    fontWeight: '700',
  },
  detailsCard: {
    flex: 1.2,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: 200,
  },
  detailsContent: {
    padding: 16,
  },
  detailsCategoryTitle: {
    fontWeight: '800',
    color: '#263238',
  },
  detailsCategoryDesc: {
    color: '#607D8B',
    marginTop: 6,
    lineHeight: 20,
    fontSize: 14,
  },
  variantLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  variantLoaderText: {
    color: '#78909C',
    fontSize: 14,
  },
  specificationsBox: {
    marginTop: 20,
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    padding: 14,
  },
  specificationsHeading: {
    fontWeight: '700',
    color: '#37474F',
  },
  specDivider: {
    marginVertical: 10,
    backgroundColor: '#ECEFF1',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  specLabel: {
    color: '#78909C',
    fontSize: 13,
  },
  specValue: {
    color: '#263238',
    fontWeight: '600',
    fontSize: 13,
  },
  inStock: {
    color: '#2E7D32',
  },
  outOfStock: {
    color: '#D32F2F',
  },
  quantityInput: {
    backgroundColor: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  addToCartBtn: {
    borderRadius: 8,
    marginTop: 8,
  },
  noVariantBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  noVariantText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: '#ECEFF1',
    padding: 10,
    borderRadius: 8,
  },
  infoBoxText: {
    color: '#546E7A',
    fontSize: 12,
    flex: 1,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9999,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 10000,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  drawerLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  drawerLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerHeaderTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  drawerHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A237E',
  },
  drawerHeaderSubtitle: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '500',
    marginTop: 2,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerDivider: {
    backgroundColor: '#ECEFF1',
    height: 1,
  },
  drawerContent: {
    padding: 16,
    gap: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  drawerItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItemTextBox: {
    flex: 1,
    marginLeft: 12,
  },
  drawerItemLabel: {
    fontSize: 11,
    color: '#78909C',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  drawerItemValue: {
    fontSize: 13,
    color: '#263238',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },
  drawerFooter: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    borderBottomRightRadius: 20,
  },
  drawerFooterText: {
    fontSize: 11,
    color: '#90A4AE',
    fontWeight: '600',
  },
  drawerFooterSubtitle: {
    fontSize: 10,
    color: '#B0BEC5',
    fontWeight: '500',
    marginTop: 2,
  },
});