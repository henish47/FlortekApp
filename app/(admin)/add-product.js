import { useState, useEffect } from 'react';
import {
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
  TextInput,
  Button,
  Card,
  Text,
  ActivityIndicator,
  Switch,
} from 'react-native-paper';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  addProduct,
  updateProduct,
  getProductById,
} from '../../services/productService';

import { supabase } from '../../services/supabase';
import Topbar from '../../components/Topbar';

export default function AddProduct() {
  const params =
    useLocalSearchParams();

  const isEdit =
    !!params.id;

  const [productId, setProductId] =
    useState('');

  const [name, setName] =
    useState('');

  const [category, setCategory] =
    useState('');

  const [size, setSize] =
    useState('');

  const [weight, setWeight] =
    useState('');

  const [unit, setUnit] =
    useState('KG');

  const [color, setColor] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [imageUrl, setImageUrl] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [pageLoading, setPageLoading] =
    useState(false);
  const [status, setStatus] =
    useState(true);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, []);

  const loadProduct = async () => {
    try {
      setPageLoading(true);

      const product =
        await getProductById(
          params.id
        );

      setProductId(
        product.product_id || ''
      );

      setName(
        product.name || ''
      );

      setCategory(
        product.category || ''
      );

      setSize(
        product.size || ''
      );

      setWeight(
        product.weight || ''
      );

      setUnit(
        product.unit || 'KG'
      );

      setColor(
        product.color || ''
      );

      setDescription(
        product.description || ''
      );

      setImageUrl(
        product.image_url || ''
      );
      setStatus(
        product.status !== undefined
          ? product.status
          : true
      );

    } catch (error) {

      Alert.alert(
        'Error',
        error.message
      );

    } finally {

      setPageLoading(false);

    }
  };

  const pickAndUploadImage =
    async () => {
      try {

        const result =
          await ImagePicker.launchImageLibraryAsync({
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

        if (result.canceled)
          return;

        const image =
          result.assets[0];

        const response =
          await fetch(image.uri);

        const blob =
          await response.blob();

        const fileName =
          `product-${Date.now()}.jpg`;

        const { error } =
          await supabase.storage
            .from('product-images')
            .upload(
              fileName,
              blob
            );

        if (error)
          throw error;

        const { data } =
          supabase.storage
            .from('product-images')
            .getPublicUrl(
              fileName
            );

        setImageUrl(
          data.publicUrl
        );

        Alert.alert(
          'Success',
          'Image Uploaded Successfully'
        );

      } catch (error) {

        Alert.alert(
          'Error',
          error.message
        );

      }
    };

  const handleSave = async () => {
    if (
      !productId ||
      !name ||
      !category
    ) {
      Alert.alert(
        'Error',
        'Please fill required fields'
      );
      return;
    }

    try {
      setLoading(true);

      const productData = {
        product_id: productId,
        name,
        category,
        size,
        weight,
        unit,
        color,
        description,
        image_url: imageUrl,
        status: status,
      };

      if (isEdit) {

        await updateProduct(
          params.id,
          productData
        );

        Alert.alert(
          'Success',
          'Product Updated Successfully'
        );

      } else {

        await addProduct(
          productData
        );

        Alert.alert(
          'Success',
          'Product Added Successfully'
        );

      }

      router.back();

    } catch (error) {

      Alert.alert(
        'Error',
        error.message
      );

    } finally {

      setLoading(false);

    }
  };

  if (pageLoading) {
    return (
      <ActivityIndicator
        size="large"
        style={{
          marginTop: 100,
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F8' }}>
      <Topbar
        title={isEdit ? 'Edit Product' : 'Add Product'}
        showBack={true}
        roleBadge="Admin"
      />
      <ScrollView
        contentContainerStyle={
          styles.container
        }
      >
        <View style={styles.contentWrapper}>
        <Card style={styles.card}>
          <Card.Content>

          {imageUrl ? (
            <Image
              source={{
                uri: imageUrl,
              }}
              style={
                styles.image
              }
            />
          ) : null}

          <Button
            mode="outlined"
            style={
              styles.uploadBtn
            }
            onPress={
              pickAndUploadImage
            }
          >
            Upload Product Image
          </Button>

          <TextInput
            label="Product ID"
            value={productId}
            onChangeText={
              setProductId
            }
            style={styles.input}
          />

          <TextInput
            label="Product Name"
            value={name}
            onChangeText={
              setName
            }
            style={styles.input}
          />

          <TextInput
            label="Category"
            value={category}
            onChangeText={
              setCategory
            }
            style={styles.input}
          />

          <TextInput
            label="Size"
            value={size}
            onChangeText={
              setSize
            }
            style={styles.input}
          />

          <TextInput
            label="Weight"
            value={weight}
            onChangeText={
              setWeight
            }
            style={styles.input}
          />

          <TextInput
            label="Unit"
            value={unit}
            onChangeText={
              setUnit
            }
            style={styles.input}
          />

          <TextInput
            label="Color"
            value={color}
            onChangeText={
              setColor
            }
            style={styles.input}
          />

          <TextInput
            label="Description"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={
              setDescription
            }
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text variant="bodyMedium" style={styles.switchLabel}>
              Product Status (Active)
            </Text>
            <Switch
              value={status}
              onValueChange={setStatus}
              color="#1A237E"
            />
          </View>

          <Button
            mode="contained"
            onPress={
              handleSave
            }
            loading={loading}
            disabled={loading}
            style={
              styles.saveBtn
            }
          >
            {isEdit
              ? 'Update Product'
              : 'Save Product'}
          </Button>

        </Card.Content>
      </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      padding: 15,
      backgroundColor:
        '#F4F6F8',
      flexGrow: 1,
    },

    contentWrapper: {
      width: '100%',
      maxWidth: 700,
      alignSelf: 'center',
    },

    card: {
      borderRadius: 15,
    },

    title: {
      textAlign: 'center',
      marginBottom: 15,
      fontWeight: 'bold',
    },

    image: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      marginBottom: 15,
    },

    uploadBtn: {
      marginBottom: 15,
    },

    input: {
      marginBottom: 12,
    },

    saveBtn: {
      marginTop: 10,
    },

    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: '#F5F7FA',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#ECEFF1',
    },

    switchLabel: {
      fontWeight: '600',
      color: '#37474F',
    },
  });