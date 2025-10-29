import { useState, useEffect } from 'react';
import ServicePricingService from '../services/servicePricingService';

interface ServicePricing {
  [serviceId: string]: number;
}

export const useServicePricing = (branchId: string | undefined) => {
  const [servicePricing, setServicePricing] = useState<ServicePricing>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServicePricing = async () => {
      setLoading(true);
      try {
        if (branchId) {
          // Load pricing for specific branch
          const pricing = await ServicePricingService.getAllServicesWithPricing(branchId);
          setServicePricing(pricing);
        } else {
          // Load default pricing for all services (when user has branchId: null)
          // This allows users to book at any branch
          const pricing = await ServicePricingService.getDefaultServicePricing();
          setServicePricing(pricing);
        }
      } catch (error) {
        console.error('Error fetching service pricing:', error);
        // Set empty pricing as fallback
        setServicePricing({});
      } finally {
        setLoading(false);
      }
    };

    fetchServicePricing();
  }, [branchId]);

  const getServicePrice = (serviceId: string): number => {
    return servicePricing[serviceId] || 0;
  };

  const calculateAppointmentTotal = (serviceStylistPairs: Array<{ serviceId: string; stylistId: string }>): number => {
    return serviceStylistPairs.reduce((total, pair) => {
      return total + getServicePrice(pair.serviceId);
    }, 0);
  };

  return {
    servicePricing,
    loading,
    getServicePrice,
    calculateAppointmentTotal
  };
};
