import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS, TYPOGRAPHY_STYLES } from '../../constants';
import { Product } from '../../types';
import ProductService from '../../services/productService';
import { BranchService } from '../../services/branchService';
import { useAuth } from '../../hooks/redux';

const { width } = Dimensions.get('window');
const isIPhone = Platform.OS === 'ios';

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchIdToName, setBranchIdToName] = useState<{[key: string]: string}>({});
  const navigation = useNavigation();
  const { user } = useAuth();

  // Load products and branches based on auth state
  useEffect(() => {
    if (!user?.id) {
      // Logged out: clear data and skip fetching to avoid permission errors
      setProducts([]);
      setFilteredProducts([]);
      setBranches([]);
      setBranchIdToName({});
      setLoading(false);
      return;
    }
    loadProducts();
    loadBranches();
  }, [user?.id]);

  // Initialize filteredProducts when products are loaded
  useEffect(() => {
    if (products.length > 0) {
      console.log('🔄 Initializing filtered products:', products.length);
      setFilteredProducts(products);
    }
  }, [products]);

  // Apply filters when products, search query, or filter selections change
  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, selectedCategory, selectedBrand, selectedBranch, selectedDate]);

  const applyFilters = () => {
    console.log('🔍 Applying filters:', {
      searchQuery,
      selectedCategory,
      selectedBrand,
      selectedBranch,
      selectedDate,
      totalProducts: products.length
    });
    
    let filtered = [...products];

    // Apply search filter - real-time and general search
    if (searchQuery.trim()) {
      console.log('🔍 Applying search filter for:', searchQuery);
      filtered = filtered.filter(product => {
        const matches = 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.supplier.toLowerCase().includes(searchQuery.toLowerCase());
        
        console.log('🔍 Product search result:', {
          name: product.name,
          brand: product.brand,
          category: product.category,
          matches
        });
        
        return matches;
      });
      console.log('🔍 Search results:', filtered.length);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      console.log('🔍 Applying category filter for:', selectedCategory);
      filtered = filtered.filter(product => {
        const matches = product.category === selectedCategory;
        console.log('🔍 Category filter result:', {
          productCategory: product.category,
          selectedCategory,
          matches
        });
        return matches;
      });
      console.log('🔍 Category results:', filtered.length);
    }

    // Apply brand filter
    if (selectedBrand !== 'all') {
      console.log('🔍 Applying brand filter for:', selectedBrand);
      filtered = filtered.filter(product => {
        const matches = product.brand === selectedBrand;
        return matches;
      });
      console.log('🔍 Brand results:', filtered.length);
    }

    // Apply branch filter
    if (selectedBranch !== 'all') {
      console.log('🔍 Applying branch filter for:', selectedBranch);
      
      // Find the branch ID for the selected branch name
      const selectedBranchId = Object.keys(branchIdToName).find(
        branchId => branchIdToName[branchId] === selectedBranch
      );
      
      console.log('🔍 Selected branch ID:', selectedBranchId, 'for name:', selectedBranch);
      
      filtered = filtered.filter(product => {
        const matches = product.branches && selectedBranchId && product.branches.includes(selectedBranchId);
        console.log('🔍 Branch filter result:', {
          productName: product.name,
          productBranches: product.branches,
          selectedBranch,
          selectedBranchId,
          matches
        });
        return matches;
      });
      console.log('🔍 Branch results:', filtered.length);
    }

    // Apply date filter (based on createdAt date YYYY-MM-DD)
    if (selectedDate !== 'all') {
      filtered = filtered.filter(product => {
        const created = (product.createdAt || '').toString();
        const dateOnly = created.substring(0, 10);
        return dateOnly === selectedDate;
      });
      console.log('🔍 Date results:', filtered.length);
    }

    console.log('🔍 Final filtered results:', filtered.length);
    setFilteredProducts(filtered);
  };

  const loadProducts = async () => {
    console.log('🔄 loadProducts called - loading all products for client');
    
    try {
      setLoading(true);
      setError(null);
      
      // Load all products since clients can book at any branch
      const allProducts = await ProductService.getAllProducts();
      console.log('🔄 Loaded all products:', allProducts.length);
      console.log('🔄 Products data:', allProducts.map(p => ({ 
        id: p.id, 
        name: p.name, 
        brand: p.brand,
        category: p.category,
        otcPrice: p.otcPrice,
        branches: p.branches,
        status: p.status 
      })));
      
      console.log('📊 Product summary:');
      console.log('  - Total products loaded:', allProducts.length);
      console.log('  - Active products:', allProducts.filter(p => p.status === 'Active').length);
      console.log('  - Products with branches:', allProducts.filter(p => p.branches && p.branches.length > 0).length);
      console.log('  - Unique categories:', [...new Set(allProducts.map(p => p.category))].length);
      console.log('  - Unique brands:', [...new Set(allProducts.map(p => p.brand))].length);
      console.log('  - Unique branches:', [...new Set(allProducts.flatMap(p => p.branches || []))].length);
      
      setProducts(allProducts);
      
      if (allProducts.length === 0) {
        setError('No products available. Please contact support.');
      }
    } catch (error) {
      console.error('❌ Error loading products:', error);
      setError('Failed to load products');
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      console.log('🔄 Loading branches...');
      const allBranches = await BranchService.getAllBranches();
      console.log('🔄 Loaded branches:', allBranches.length);
      
      // Create mapping from branch ID to branch name
      const branchMapping: {[key: string]: string} = {};
      allBranches.forEach((branch: any) => {
        branchMapping[branch.id] = branch.name;
      });
      
      console.log('🔄 Branch mapping:', branchMapping);
      
      setBranches(allBranches);
      setBranchIdToName(branchMapping);
    } catch (error) {
      console.error('❌ Error loading branches:', error);
    }
  };

  // Get unique categories for filter options
  const getUniqueCategories = () => {
    const categories = [...new Set(products.map(product => product.category))];
    return categories.sort();
  };

  const getUniqueBrands = () => {
    const brands = [...new Set(products.map(product => product.brand))];
    return brands.sort();
  };

  const getUniqueBranches = () => {
    const allBranchIds = products.flatMap(product => product.branches || []);
    const uniqueBranchIds = [...new Set(allBranchIds)];
    
    // Convert branch IDs to names using the mapping
    const branchNames = uniqueBranchIds
      .map(branchId => branchIdToName[branchId])
      .filter(name => name) // Filter out undefined names
      .sort();
    
    console.log('🔍 Unique branches for filter:', branchNames);
    return branchNames;
  };

  // Dates (from product.createdAt, formatted YYYY-MM-DD)
  const getUniqueDates = () => {
    const dates = products
      .map(p => (p.createdAt || '').toString().substring(0, 10))
      .filter(d => d && d.length === 10);
    return [...new Set(dates)].sort().reverse();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedBranch('all');
    setSelectedDate('all');
  };

  const handleProductPress = (product: Product) => {
    (navigation as any).navigate('ProductDetails', { product });
  };


  // For web, render without ScreenWrapper to avoid duplicate headers
  if (Platform.OS === 'web') {
    return (
      <KeyboardAvoidingView 
        style={styles.webContainer}
        behavior="padding"
        keyboardVerticalOffset={20}
      >
        {/* Product Catalog Header */}
        <View style={styles.productsSection}>
          <Text style={styles.catalogTitle}>Product Catalog</Text>
          <Text style={styles.catalogSubtitle}>
            Showing {filteredProducts.length} of {products.length} products
            {searchQuery && ` (searching: "${searchQuery}")`}
            {selectedCategory !== 'all' && ` (category: "${selectedCategory}")`}
            {selectedBranch !== 'all' && ` (branch: "${selectedBranch}")`}
          </Text>
          
          {/* Search and Filter */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchContainer}>
              <View style={styles.searchIcon}>
                <Ionicons name="search" size={20} color="#999" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, selectedCategory !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="funnel-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedBrand !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowBrandModal(true)}
            >
              <Ionicons name="pricetags-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Brand</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedBranch !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowBranchModal(true)}
            >
              <Ionicons name="business-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Branch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedDate !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowDateModal(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Date</Text>
            </TouchableOpacity>
          </View>
          
          
          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#160B53" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  {user?.branchId ? 'No products available for your branch' : 'No branch assigned'}
                </Text>
              </View>
            ) : (
              filteredProducts.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.productImageContainer}>
                    {product.imageUrl ? (
                      <Image 
                        source={{ uri: product.imageUrl }} 
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={() => console.log('Failed to load image:', product.imageUrl)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image" size={40} color="#CCCCCC" />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₱{product.otcPrice}</Text>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
        
        {/* Category Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                <TouchableOpacity style={[styles.filterOption, selectedCategory === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedCategory('all'); setShowCategoryModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedCategory === 'all' && styles.filterOptionTextActive]}>All Categories</Text>
                </TouchableOpacity>
                {getUniqueCategories().map(category => (
                  <TouchableOpacity key={category} style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]} onPress={() => { setSelectedCategory(category); setShowCategoryModal(false); }}>
                    <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Brand Modal */}
        <Modal
          visible={showBrandModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBrandModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Brand</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowBrandModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                <TouchableOpacity style={[styles.filterOption, selectedBrand === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedBrand('all'); setShowBrandModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedBrand === 'all' && styles.filterOptionTextActive]}>All Brands</Text>
                </TouchableOpacity>
                {getUniqueBrands().map(brand => (
                  <TouchableOpacity key={brand} style={[styles.filterOption, selectedBrand === brand && styles.filterOptionActive]} onPress={() => { setSelectedBrand(brand); setShowBrandModal(false); }}>
                    <Text style={[styles.filterOptionText, selectedBrand === brand && styles.filterOptionTextActive]}>{brand}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Branch Modal */}
        <Modal
          visible={showBranchModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBranchModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Branch</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowBranchModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                <TouchableOpacity style={[styles.filterOption, selectedBranch === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedBranch('all'); setShowBranchModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedBranch === 'all' && styles.filterOptionTextActive]}>All Branches</Text>
                </TouchableOpacity>
                {getUniqueBranches().map(branch => (
                  <TouchableOpacity key={branch} style={[styles.filterOption, selectedBranch === branch && styles.filterOptionActive]} onPress={() => { setSelectedBranch(branch || ''); setShowBranchModal(false); }}>
                    <Text style={[styles.filterOptionText, selectedBranch === branch && styles.filterOptionTextActive]}>{branch}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Date Modal */}
        <Modal
          visible={showDateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowDateModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <Calendar
                  style={{ alignSelf: 'stretch' }}
                  onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                    setShowDateModal(false);
                  }}
                  markedDates={selectedDate !== 'all' ? { [selectedDate]: { selected: true } } : {}}
                  enableSwipeMonths={true}
                />
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity style={[styles.filterOption, selectedDate === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedDate('all'); setShowDateModal(false); }}>
                    <Text style={[styles.filterOptionText, selectedDate === 'all' && styles.filterOptionTextActive]}>Show All Dates</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <ScreenWrapper title="Products">
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Product Catalog Header */}
        <View style={styles.productsSection}>
          <Text style={styles.catalogTitle}>Product Catalog</Text>
          <Text style={styles.catalogSubtitle}>
            Showing {filteredProducts.length} of {products.length} products
            {searchQuery && ` (searching: "${searchQuery}")`}
            {selectedCategory !== 'all' && ` (category: "${selectedCategory}")`}
            {selectedBranch !== 'all' && ` (branch: "${selectedBranch}")`}
          </Text>
          
          {/* Search and Filter */}
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchContainer}>
              <View style={styles.searchIcon}>
                <Ionicons name="search" size={20} color="#999" />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[styles.filterButton, selectedCategory !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="funnel-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedBrand !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowBrandModal(true)}
            >
              <Ionicons name="pricetags-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Brand</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedBranch !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowBranchModal(true)}
            >
              <Ionicons name="business-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Branch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedDate !== 'all' && styles.filterButtonActive]}
              onPress={() => setShowDateModal(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.filterButtonText}>Date</Text>
            </TouchableOpacity>
          </View>
          {/* Products Grid */}
          <View style={styles.productsGrid}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#160B53" />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>No products found</Text>
                <Text style={styles.emptySubtext}>
                  {user?.branchId ? 'No products available for your branch' : 'No branch assigned'}
                </Text>
              </View>
            ) : (
              filteredProducts.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.productImageContainer}>
                    {product.imageUrl ? (
                      <Image 
                        source={{ uri: product.imageUrl }} 
                        style={styles.productImage}
                        resizeMode="cover"
                        onError={() => console.log('Failed to load image:', product.imageUrl)}
                      />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Ionicons name="image" size={40} color="#CCCCCC" />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₱{product.otcPrice}</Text>
                    <Text style={styles.productBrand}>{product.brand}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Mobile Category Modal */}
      <Modal visible={showCategoryModal} transparent={true} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity style={[styles.filterOption, selectedCategory === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedCategory('all'); setShowCategoryModal(false); }}>
                <Text style={[styles.filterOptionText, selectedCategory === 'all' && styles.filterOptionTextActive]}>All Categories</Text>
              </TouchableOpacity>
              {getUniqueCategories().map(category => (
                <TouchableOpacity key={category} style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]} onPress={() => { setSelectedCategory(category); setShowCategoryModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mobile Brand Modal */}
      <Modal visible={showBrandModal} transparent={true} animationType="slide" onRequestClose={() => setShowBrandModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Brand</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowBrandModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity style={[styles.filterOption, selectedBrand === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedBrand('all'); setShowBrandModal(false); }}>
                <Text style={[styles.filterOptionText, selectedBrand === 'all' && styles.filterOptionTextActive]}>All Brands</Text>
              </TouchableOpacity>
              {getUniqueBrands().map(brand => (
                <TouchableOpacity key={brand} style={[styles.filterOption, selectedBrand === brand && styles.filterOptionActive]} onPress={() => { setSelectedBrand(brand); setShowBrandModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedBrand === brand && styles.filterOptionTextActive]}>{brand}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mobile Branch Modal */}
      <Modal visible={showBranchModal} transparent={true} animationType="slide" onRequestClose={() => setShowBranchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Branch</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowBranchModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity style={[styles.filterOption, selectedBranch === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedBranch('all'); setShowBranchModal(false); }}>
                <Text style={[styles.filterOptionText, selectedBranch === 'all' && styles.filterOptionTextActive]}>All Branches</Text>
              </TouchableOpacity>
              {getUniqueBranches().map(branch => (
                <TouchableOpacity key={branch} style={[styles.filterOption, selectedBranch === branch && styles.filterOptionActive]} onPress={() => { setSelectedBranch(branch || ''); setShowBranchModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedBranch === branch && styles.filterOptionTextActive]}>{branch}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mobile Date Modal */}
      <Modal visible={showDateModal} transparent={true} animationType="slide" onRequestClose={() => setShowDateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowDateModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Calendar
                style={{ alignSelf: 'stretch' }}
                onDayPress={(day: any) => {
                  setSelectedDate(day.dateString);
                  setShowDateModal(false);
                }}
                markedDates={selectedDate !== 'all' ? { [selectedDate]: { selected: true } } : {}}
                enableSwipeMonths={true}
              />
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity style={[styles.filterOption, selectedDate === 'all' && styles.filterOptionActive]} onPress={() => { setSelectedDate('all'); setShowDateModal(false); }}>
                  <Text style={[styles.filterOptionText, selectedDate === 'all' && styles.filterOptionTextActive]}>Show All Dates</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: '100%',
  },
  scrollContainer: {
    flex: 1,
    paddingTop: isIPhone ? 110 : 90,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: isIPhone ? 12 : 15,
    paddingTop: isIPhone ? 50 : 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: '#160B53',
    fontFamily: FONTS.semiBold,
  },
  headerDate: {
    fontSize: 13,
    color: '#666',
    fontFamily: FONTS.regular,
  },
  catalogTitle: {
    ...TYPOGRAPHY_STYLES.header,
    color: '#160B53',
    marginBottom: Platform.OS === 'web' ? 16 : 4,
  },
  catalogSubtitle: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#666',
    marginBottom: 20,
  },
  searchContainer: {
    flex: 1,
    flexGrow: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY_STYLES.input,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#160B53',
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    height: Platform.OS === 'web' ? 44 : 36,
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
  productsSection: {
    padding: Platform.OS === 'web' ? 0 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : Platform.OS === 'android' ? 30 : 20,
    marginBottom: Platform.OS === 'web' ? 24 : 0,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
  },
  productCard: {
    width: Platform.OS === 'web' ? '23%' : (width - 60) / 2, // 4 columns for web, 2 for mobile
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  productImageContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 140 : 140,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 16,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 80,
  },
  productCategory: {
    ...TYPOGRAPHY_STYLES.tiny,
    color: '#160B53',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#333',
    marginBottom: 6,
    fontFamily: FONTS.semiBold,
    lineHeight: Platform.OS === 'web' ? undefined : 18,
  },
  productPrice: {
    ...TYPOGRAPHY_STYLES.price,
    color: '#160B53',
    marginTop: 6,
  },
  productBrand: {
    ...TYPOGRAPHY_STYLES.caption,
    color: '#666',
    marginTop: 2,
  },
  // Loading, Error, and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    ...TYPOGRAPHY_STYLES.body,
    color: '#160B53',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    ...TYPOGRAPHY_STYLES.body,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#160B53',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    ...TYPOGRAPHY_STYLES.subheader,
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#999',
    textAlign: 'center',
  },
  // Product display styles
  productDescription: {
    fontSize: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    color: '#666',
    fontFamily: FONTS.regular,
    marginBottom: 4,
    lineHeight: Platform.OS === 'web' ? undefined : 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  unitCost: {
    fontSize: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    color: '#999',
    fontFamily: FONTS.medium,
  },
  // Filter styles
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterOptions: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#160B53',
    width: 80,
    marginRight: 12,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#160B53',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#160B53',
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    ...TYPOGRAPHY_STYLES.subheader,
    color: '#160B53',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    width: '100%',
    flexGrow: 1,
  },
  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryOptionActive: {
    backgroundColor: '#160B53',
    borderColor: '#160B53',
  },
  categoryOptionText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: '#374151',
    textAlign: 'center',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    ...TYPOGRAPHY_STYLES.sectionTitle,
    color: '#160B53',
    marginBottom: 12,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterOptionActive: {
    backgroundColor: '#160B53',
    borderColor: '#160B53',
  },
  filterOptionText: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priceLabel: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#374151',
  },
  priceInput: {
    flex: 1,
    paddingVertical: 8,
    ...TYPOGRAPHY_STYLES.input,
    color: '#374151',
  },
  applyFiltersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#160B53',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  applyFiltersText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
});
