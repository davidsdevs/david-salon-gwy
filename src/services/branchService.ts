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

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  isActive: boolean;
}

export class BranchService {
  /**
   * Get branch by ID
   */
  static async getBranchById(branchId: string): Promise<Branch | null> {
    try {
      console.log('🔄 Fetching branch by ID:', branchId);
      const branchDoc = await getDoc(doc(db, COLLECTIONS.BRANCHES, branchId));
      
      if (branchDoc.exists()) {
        const data = branchDoc.data();
        return {
          id: branchDoc.id,
          name: data.name || 'Unknown Branch',
          address: data.address || 'Address not available',
          phone: data.phone || 'Phone not available',
          hours: data.hours || 'Hours not available',
          isActive: data.isActive || false
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching branch:', error);
      return null;
    }
  }

  /**
   * Get multiple branches by IDs
   */
  static async getBranchesByIds(branchIds: string[]): Promise<Branch[]> {
    try {
      console.log('🔄 Fetching branches by IDs:', branchIds);
      const branches: Branch[] = [];
      
      for (const branchId of branchIds) {
        const branch = await this.getBranchById(branchId);
        if (branch) {
          branches.push(branch);
        }
      }
      
      return branches;
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      return [];
    }
  }

  /**
   * Get all active branches
   */
  static async getAllBranches(): Promise<Branch[]> {
    try {
      console.log('🔄 Fetching all branches');
      const branchesRef = collection(db, COLLECTIONS.BRANCHES);
      const q = query(branchesRef, where('isActive', '==', true));
      
      const snapshot = await getDocs(q);
      const branches: Branch[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        branches.push({
          id: doc.id,
          name: data.name || 'Unknown Branch',
          address: data.address || 'Address not available',
          phone: data.phone || 'Phone not available',
          hours: data.hours || 'Hours not available',
          isActive: data.isActive || false
        });
      });
      
      return branches;
    } catch (error) {
      console.error('❌ Error fetching all branches:', error);
      return [];
    }
  }
}

