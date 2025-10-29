import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../config/firebase';

export interface Stylist {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string[];
  experience: number;
  rating: number;
  totalClients: number;
  totalEarnings: number;
  isAvailable: boolean;
  userType: string;
  employeeId: string;
  uid: string;
  roles: string[];
  isActive: boolean;
  workingHours: any;
  services: string[];
  createdAt: string;
  updatedAt: string;
}

export class StylistService {
  /**
   * Get stylist by ID
   */
  static async getStylistById(stylistId: string): Promise<Stylist | null> {
    try {
      console.log('🔄 Fetching stylist by ID:', stylistId);
      const stylistDoc = await getDoc(doc(db, COLLECTIONS.STYLISTS, stylistId));
      
      if (stylistDoc.exists()) {
        const data = stylistDoc.data();
        return {
          id: stylistDoc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          specialization: data.specialization || [],
          experience: data.experience || 0,
          rating: data.rating || 0,
          totalClients: data.totalClients || 0,
          totalEarnings: data.totalEarnings || 0,
          isAvailable: data.isAvailable ?? true,
          userType: 'stylist',
          employeeId: data.employeeId || '',
          uid: stylistDoc.id,
          roles: data.roles || [],
          isActive: data.isActive ?? true,
          workingHours: data.workingHours || {},
          services: data.services || [],
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching stylist:', error);
      return null;
    }
  }

  /**
   * Get multiple stylists by IDs
   */
  static async getStylistsByIds(stylistIds: string[]): Promise<Stylist[]> {
    try {
      console.log('🔄 Fetching stylists by IDs:', stylistIds);
      const stylists: Stylist[] = [];
      
      for (const stylistId of stylistIds) {
        const stylist = await this.getStylistById(stylistId);
        if (stylist) {
          stylists.push(stylist);
        }
      }
      
      return stylists;
    } catch (error) {
      console.error('❌ Error fetching stylists:', error);
      return [];
    }
  }

  /**
   * Get all active stylists
   */
  static async getAllStylists(): Promise<Stylist[]> {
    try {
      console.log('🔄 Fetching all stylists');
      const stylistsRef = collection(db, COLLECTIONS.STYLISTS);
      const q = query(stylistsRef, where('isActive', '==', true));
      
      const snapshot = await getDocs(q);
      const stylists: Stylist[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        stylists.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          specialization: data.specialization || [],
          experience: data.experience || 0,
          rating: data.rating || 0,
          totalClients: data.totalClients || 0,
          totalEarnings: data.totalEarnings || 0,
          isAvailable: data.isAvailable ?? true,
          userType: 'stylist',
          employeeId: data.employeeId || '',
          uid: doc.id,
          roles: data.roles || [],
          isActive: data.isActive ?? true,
          workingHours: data.workingHours || {},
          services: data.services || [],
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        });
      });
      
      return stylists;
    } catch (error) {
      console.error('❌ Error fetching all stylists:', error);
      return [];
    }
  }
}

