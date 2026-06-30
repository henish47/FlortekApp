import { View, StyleSheet, ScrollView, Image, useWindowDimensions } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import Topbar from '../../components/Topbar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProductDetails() {
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const hasImage = params.image_url && params.image_url !== 'null' && params.image_url !== 'undefined';

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      <Topbar title="Product Details" showBack={true} roleBadge="Customer" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Card style={styles.card} elevation={2}>
          {hasImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: params.image_url }} style={styles.image} resizeMode="cover" />
              {params.category ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{params.category}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Card.Content style={styles.cardContent}>
            {/* Category tag if no image */}
            {!hasImage && params.category ? (
              <View style={styles.noImageCategoryBadge}>
                <Text style={styles.noImageCategoryText}>{params.category}</Text>
              </View>
            ) : null}

            {/* Header info */}
            <Text variant="headlineSmall" style={styles.title}>
              {params.name}
            </Text>

            <Divider style={styles.divider} />

            {/* Specs Grid */}
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Specifications
            </Text>

            <View style={styles.specsGrid}>
              {/* Product ID */}
              <View style={styles.specBox}>
                <MaterialCommunityIcons name="tag-outline" size={20} color="#5C6BC0" style={styles.specIcon} />
                <View style={styles.specTextGroup}>
                  <Text style={styles.specLabel}>PRODUCT ID</Text>
                  <Text style={styles.specValue} numberOfLines={1}>{params.product_id || 'N/A'}</Text>
                </View>
              </View>

              {/* Size */}
              <View style={styles.specBox}>
                <MaterialCommunityIcons name="arrow-expand-all" size={20} color="#5C6BC0" style={styles.specIcon} />
                <View style={styles.specTextGroup}>
                  <Text style={styles.specLabel}>SIZE</Text>
                  <Text style={styles.specValue} numberOfLines={1}>{params.size || 'Standard'}</Text>
                </View>
              </View>

              {/* Color */}
              <View style={styles.specBox}>
                <MaterialCommunityIcons name="palette-outline" size={20} color="#5C6BC0" style={styles.specIcon} />
                <View style={styles.specTextGroup}>
                  <Text style={styles.specLabel}>COLOR</Text>
                  <Text style={styles.specValue} numberOfLines={1}>{params.color || 'Standard'}</Text>
                </View>
              </View>

              {/* Capacity/Weight */}
              <View style={styles.specBox}>
                <MaterialCommunityIcons name="weight" size={20} color="#5C6BC0" style={styles.specIcon} />
                <View style={styles.specTextGroup}>
                  <Text style={styles.specLabel}>CAPACITY / WEIGHT</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {params.weight ? `${params.weight} ${params.unit || 'KG'}` : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Description */}
            <Text variant="titleMedium" style={styles.sectionHeader}>
              Description
            </Text>
            <Text style={styles.descriptionText}>
              {params.description && params.description !== 'null' && params.description !== 'undefined'
                ? params.description
                : 'No additional description provided for this FRP product.'}
            </Text>
          </Card.Content>
        </Card>

        {/* Place Order Button */}
        <Button
          mode="contained"
          style={styles.orderBtn}
          contentStyle={styles.orderBtnContent}
          labelStyle={styles.orderBtnLabel}
          buttonColor="#1A237E"
          icon="cart-outline"
          onPress={() =>
            router.push({
              pathname: '/(customer)/place-order',
              params: {
                product_id: params.product_id,
                name: params.name,
                category: params.category,
                size: params.size,
                color: params.color,
                weight: params.weight,
                unit: params.unit,
                description: params.description,
              },
            })
          }
        >
          Place Order Now
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    marginBottom: 20,
  },
  imageContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F5F7FA',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#E8EAF6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(26, 35, 126, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noImageCategoryBadge: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  noImageCategoryText: {
    color: '#1A237E',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    lineHeight: 28,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#ECEFF1',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  specBox: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  specIcon: {
    marginRight: 8,
  },
  specTextGroup: {
    flex: 1,
  },
  specLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A237E',
    marginTop: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#455A64',
    lineHeight: 22,
  },
  orderBtn: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#1A237E',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  orderBtnContent: {
    height: 48,
  },
  orderBtnLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});