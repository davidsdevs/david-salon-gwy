import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ServicePricingService from '../services/servicePricingService';

interface BranchSpecificPricingProps {
  serviceId: string;
  branchId: string;
  fallbackPrice?: number;
}

export default function BranchSpecificPricing({ 
  serviceId, 
  branchId, 
  fallbackPrice = 0 
}: BranchSpecificPricingProps) {
  const [price, setPrice] = useState<number>(fallbackPrice);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranchSpecificPrice = async () => {
      try {
        setLoading(true);
        const branchPrice = await ServicePricingService.getBranchSpecificPrice(serviceId, branchId);
        setPrice(branchPrice);
      } catch (error) {
        console.error('Error fetching branch-specific price:', error);
        setPrice(fallbackPrice);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId && branchId) {
      fetchBranchSpecificPrice();
    } else {
      setPrice(fallbackPrice);
      setLoading(false);
    }
  }, [serviceId, branchId, fallbackPrice]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.priceText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.priceText}>₱{price}</Text>
      {price !== fallbackPrice && (
        <Text style={styles.branchNote}>Branch-specific pricing</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#160B53',
  },
  branchNote: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
});
