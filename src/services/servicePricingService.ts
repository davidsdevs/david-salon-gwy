import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface ServicePricing {
  serviceId: string;
  branchId: string;
  price: number;
}

export class ServicePricingService {
  private static readonly SERVICES_COLLECTION = 'services';

  // Get branch-specific price for a service
  static async getBranchSpecificPrice(serviceId: string, branchId: string): Promise<number> {
    try {
      console.log('🔄 Getting branch-specific price for service:', serviceId, 'branch:', branchId);
      
      const serviceDoc = await getDoc(doc(db, this.SERVICES_COLLECTION, serviceId));
      
      if (!serviceDoc.exists()) {
        console.log('❌ Service not found:', serviceId);
        return 0;
      }

      const serviceData = serviceDoc.data();
      console.log('🔍 Service data:', {
        id: serviceId,
        name: serviceData.name,
        prices: serviceData.prices,
        branches: serviceData.branches,
        defaultPrice: serviceData.price
      });
      
      // Check if service has prices and branches arrays
      if (serviceData.prices && serviceData.branches && 
          Array.isArray(serviceData.prices) && Array.isArray(serviceData.branches) && serviceData.branches.length > 0) {
        
        // Additional safety check before calling indexOf
        if (typeof branchId === 'string' && branchId.trim() !== '') {
          const branchIndex = serviceData.branches.indexOf(branchId);
          console.log('🔍 Branch lookup:', {
            branchId,
            branches: serviceData.branches,
            branchIndex,
            priceAtIndex: serviceData.prices[branchIndex]
          });
        
          if (branchIndex !== -1 && serviceData.prices[branchIndex] !== undefined) {
            console.log('✅ Found branch-specific price:', serviceData.prices[branchIndex]);
            return serviceData.prices[branchIndex];
          }
        }
      }
      
      // Fallback to default price
      const defaultPrice = serviceData.price || 0;
      console.log('⚠️ Using default price:', defaultPrice);
      return defaultPrice;
      
    } catch (error) {
      console.error('❌ Error getting branch-specific price:', error);
      return 0;
    }
  }

  // Get all services with their branch-specific pricing
  static async getAllServicesWithPricing(branchId: string): Promise<{ [serviceId: string]: number }> {
    try {
      console.log('🔄 Getting all services with pricing for branch:', branchId);
      
      const servicesRef = collection(db, this.SERVICES_COLLECTION);
      const servicesSnapshot = await getDocs(servicesRef);
      
      const servicePricing: { [serviceId: string]: number } = {};
      
      for (const serviceDoc of servicesSnapshot.docs) {
        const serviceData = serviceDoc.data();
        const serviceId = serviceDoc.id;
        
        // Get branch-specific price
        const price = await this.getBranchSpecificPrice(serviceId, branchId);
        servicePricing[serviceId] = price;
      }
      
      console.log('✅ Service pricing map:', servicePricing);
      return servicePricing;
      
    } catch (error) {
      console.error('❌ Error getting services with pricing:', error);
      return {};
    }
  }

  // Get default service pricing for users with branchId: null (can book at any branch)
  static async getDefaultServicePricing(): Promise<{ [serviceId: string]: number }> {
    try {
      console.log('🔄 Getting default service pricing for users with branchId: null');
      
      const servicesRef = collection(db, this.SERVICES_COLLECTION);
      const servicesSnapshot = await getDocs(servicesRef);
      
      const servicePricing: { [serviceId: string]: number } = {};
      
      for (const serviceDoc of servicesSnapshot.docs) {
        const serviceData = serviceDoc.data();
        const serviceId = serviceDoc.id;
        
        // Use the first available price or default price
        let price = 0;
        
        if (serviceData.prices && Array.isArray(serviceData.prices) && serviceData.prices.length > 0) {
          // Use the first price as default
          price = serviceData.prices[0];
        } else if (serviceData.price) {
          // Fallback to single price field
          price = serviceData.price;
        }
        
        servicePricing[serviceId] = price;
      }
      
      console.log('✅ Default service pricing map:', servicePricing);
      return servicePricing;
      
    } catch (error) {
      console.error('❌ Error getting default service pricing:', error);
      return {};
    }
  }

  // Calculate total price for an appointment with multiple services
  static async calculateAppointmentTotalPrice(
    serviceStylistPairs: Array<{ serviceId: string; stylistId: string }>,
    branchId: string
  ): Promise<number> {
    try {
      console.log('🔄 Calculating appointment total price for branch:', branchId);
      
      let totalPrice = 0;
      
      for (const pair of serviceStylistPairs) {
        const servicePrice = await this.getBranchSpecificPrice(pair.serviceId, branchId);
        totalPrice += servicePrice;
      }
      
      console.log('✅ Total appointment price:', totalPrice);
      return totalPrice;
      
    } catch (error) {
      console.error('❌ Error calculating appointment total price:', error);
      return 0;
    }
  }
}

export default ServicePricingService;
