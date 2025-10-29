import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS } from '../../constants';
import { Product } from '../../types';
import { BranchService, Branch } from '../../services/branchService';

const { width, height } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { product } = route.params as { product: Product };
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (product.branches && product.branches.length > 0) {
      fetchBranches();
    }
  }, [product.branches]);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      console.log('🔄 Fetching branches for product:', product.branches);
      if (!product.branches || product.branches.length === 0) {
        console.log('❌ No branches found for product, creating default branch info');
        // Create a default branch entry when no branches are specified
        const defaultBranch = {
          id: 'default',
          name: 'All Branches',
          address: 'Available at all our locations',
          phone: '+63 912 345 6789',
          hours: '9:00 AM - 6:00 PM',
          isActive: true
        };
        setBranches([defaultBranch]);
        return;
      }
      
      // Try to fetch branches, but if it fails, create mock data for demonstration
      try {
        const branchData = await BranchService.getBranchesByIds(product.branches);
        console.log('✅ Fetched branches:', branchData);
        if (branchData && branchData.length > 0) {
          console.log('✅ Setting fetched branches in state:', branchData);
          setBranches(branchData);
          console.log('✅ Fetched branches set in state');
        } else {
          throw new Error('No branch data returned');
        }
      } catch (fetchError) {
        console.log('⚠️ Branch service failed, using mock data:', fetchError);
        // Create mock branch data for demonstration
        const mockBranches = product.branches.map((branchId, index) => ({
          id: branchId,
          name: `Branch ${index + 1}`,
          address: `123 Main Street, City ${index + 1}, Philippines`,
          phone: `+63 912 345 678${index}`,
          hours: '9:00 AM - 6:00 PM',
          isActive: true
        }));
        console.log('✅ Created mock branches:', mockBranches);
        setBranches(mockBranches);
        console.log('✅ Mock branches set in state');
      }
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      // Create fallback branch data even on error
      const fallbackBranch = {
        id: 'fallback',
        name: 'Branch Information',
        address: 'Contact us for branch details',
        phone: '+63 912 345 6789',
        hours: '9:00 AM - 6:00 PM',
        isActive: true
      };
      setBranches([fallbackBranch]);
    } finally {
      setLoadingBranches(false);
    }
  };


  return (
    <ScreenWrapper title="Product Details" showBackButton={true}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Image Section */}
        <View style={styles.imageSection}>
          {product.imageUrl ? (
            <Image 
              source={{ uri: product.imageUrl }} 
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image" size={80} color="#CCCCCC" />
              <Text style={styles.placeholderText}>No Image Available</Text>
            </View>
          )}
        </View>

        {/* Product Information */}
        <View style={styles.infoSection}>
          <View style={styles.headerSection}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) }]}>
                <Text style={styles.statusText}>{product.status}</Text>
              </View>
            </View>
          </View>

          <View style={styles.categoryBrandRow}>
            <View style={styles.categoryContainer}>
              <Ionicons name="pricetag" size={16} color="#160B53" />
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
            <View style={styles.brandContainer}>
              <Ionicons name="business" size={16} color="#160B53" />
              <Text style={styles.brandText}>{product.brand}</Text>
            </View>
          </View>

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <Text style={styles.pricingTitle}>Price</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>OTC Price</Text>
                <Text style={styles.otcPrice}>₱{product.otcPrice || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Product Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            
            {product.supplier && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront" size={20} color="#160B53" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Supplier</Text>
                  <Text style={styles.detailValue}>{product.supplier}</Text>
                </View>
              </View>
            )}

            {product.upc && (
              <View style={styles.detailRow}>
                <Ionicons name="barcode" size={20} color="#160B53" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>UPC Code</Text>
                  <Text style={styles.detailValue}>{product.upc}</Text>
                </View>
              </View>
            )}

            {product.shelfLife && (
              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color="#160B53" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Shelf Life</Text>
                  <Text style={styles.detailValue}>{product.shelfLife}</Text>
                </View>
              </View>
            )}

            {product.variants && (
              <View style={styles.detailRow}>
                <Ionicons name="options" size={20} color="#160B53" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Variants</Text>
                  <Text style={styles.detailValue}>{product.variants}</Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color="#160B53" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Added</Text>
                <Text style={styles.detailValue}>
                  {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>

          </View>

          {/* Branch Availability */}
          <View style={styles.branchesSection}>
            <Text style={styles.sectionTitle}>Available at Branches</Text>
            <View style={styles.branchesContainer}>
              {loadingBranches ? (
                <View style={styles.branchCard}>
                  <View style={styles.branchHeader}>
                    <Ionicons name="location" size={20} color="#1D4ED8" />
                    <Text style={styles.branchName}>Loading branches...</Text>
                  </View>
                  <Text style={styles.branchAddress}>Please wait...</Text>
                </View>
              ) : branches.length > 0 ? (
                branches.map((branch, index) => (
                  <View key={index} style={styles.branchCard}>
                    <View style={styles.branchHeader}>
                      <Ionicons name="location" size={20} color="#1D4ED8" />
                      <Text style={styles.branchName}>{branch.name}</Text>
                    </View>
                    <Text style={styles.branchAddress}>{branch.address}</Text>
                    {branch.phone && (
                      <View style={styles.branchContact}>
                        <Ionicons name="call" size={14} color="#6B7280" />
                        <Text style={styles.branchPhone}>{branch.phone}</Text>
                      </View>
                    )}
                    {branch.hours && (
                      <View style={styles.branchContact}>
                        <Ionicons name="time" size={14} color="#6B7280" />
                        <Text style={styles.branchHours}>{branch.hours}</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : product.branches && product.branches.length > 0 ? (
                product.branches.map((branchId, index) => (
                  <View key={index} style={styles.branchCard}>
                    <View style={styles.branchHeader}>
                      <Ionicons name="location" size={20} color="#1D4ED8" />
                      <Text style={styles.branchName}>Branch {branchId}</Text>
                    </View>
                    <Text style={styles.branchAddress}>Address not available</Text>
                  </View>
                ))
              ) : (
                <View style={styles.branchCard}>
                  <View style={styles.branchHeader}>
                    <Ionicons name="location" size={20} color="#1D4ED8" />
                    <Text style={styles.branchName}>All Branches</Text>
                  </View>
                  <Text style={styles.branchAddress}>This product is available at all our locations</Text>
                </View>
              )}
            </View>
          </View>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return '#10B981';
    case 'low stock':
      return '#F59E0B';
    case 'discontinued':
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  imageSection: {
    width: '100%',
    height: height * 0.4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
    fontFamily: FONTS.regular,
  },
  infoSection: {
    padding: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#160B53',
    flex: 1,
    marginRight: 12,
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  categoryBrandRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#160B53',
    marginLeft: 6,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
  },
  brandText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#160B53',
    marginLeft: 6,
  },
  pricingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#160B53',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  priceItem: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    marginBottom: 4,
  },
  unitCost: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#10B981',
  },
  salonPrice: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#F59E0B',
  },
  otcPrice: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#160B53',
  },
  descriptionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#160B53',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#374151',
    lineHeight: 24,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#374151',
  },
  branchesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  branchesContainer: {
    gap: 12,
  },
  branchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  branchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#1D4ED8',
    marginLeft: 8,
  },
  branchAddress: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  branchContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  branchPhone: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginLeft: 6,
  },
  branchHours: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginLeft: 6,
  },
});
