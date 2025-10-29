import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FilterTest() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  const categories = ['Hair Care', 'Skin Care', 'Makeup', 'Tools'];
  const brands = ['Brand A', 'Brand B', 'Brand C'];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filter Test Component</Text>
      
      <TouchableOpacity 
        style={styles.filterButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="filter" size={16} color="white" />
        <Text style={styles.filterButtonText}>Filter</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Products</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Category</Text>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedCategory === 'all' && styles.filterOptionActive]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[styles.filterOptionText, selectedCategory === 'all' && styles.filterOptionTextActive]}>
                    All Categories
                  </Text>
                </TouchableOpacity>
                
                {categories.map(category => (
                  <TouchableOpacity 
                    key={category}
                    style={[styles.filterOption, selectedCategory === category && styles.filterOptionActive]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={[styles.filterOptionText, selectedCategory === category && styles.filterOptionTextActive]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Brand Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Brand</Text>
                <TouchableOpacity 
                  style={[styles.filterOption, selectedBrand === 'all' && styles.filterOptionActive]}
                  onPress={() => setSelectedBrand('all')}
                >
                  <Text style={[styles.filterOptionText, selectedBrand === 'all' && styles.filterOptionTextActive]}>
                    All Brands
                  </Text>
                </TouchableOpacity>
                
                {brands.map(brand => (
                  <TouchableOpacity 
                    key={brand}
                    style={[styles.filterOption, selectedBrand === brand && styles.filterOptionActive]}
                    onPress={() => setSelectedBrand(brand)}
                  >
                    <Text style={[styles.filterOptionText, selectedBrand === brand && styles.filterOptionTextActive]}>
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedBrand('all');
                  setPriceRange({ min: 0, max: 10000 });
                }}
              >
                <Ionicons name="refresh" size={16} color="#160B53" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton} 
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#160B53',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#160B53',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#160B53',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    maxHeight: 300,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#160B53',
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#160B53',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#160B53',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
