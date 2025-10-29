import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../config/firebase';
import { Appointment } from '../types/api';

export interface DashboardStats {
  todayAppointments: number;
  totalVisits: number;
  loyaltyPoints: number;
  favoriteStylists: number;
  totalSpent: number;
  referrals: number;
}

export interface RecentVisit {
  id: string;
  service: string;
  stylist: string;
  date: string;
  price: string;
  rating: number;
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingAppointments: Appointment[];
  recentVisits: RecentVisit[];
  membershipLevel: string;
  memberSince: string;
  points: number;
}

export class DashboardService {
  /**
   * Get dashboard statistics for a client
   */
  static async getDashboardData(clientId: string): Promise<DashboardData> {
    try {
      console.log('🔄 Fetching dashboard data for client:', clientId);
      
      // Fetch all client appointments
      const appointments = await this.getClientAppointments(clientId);
      
      // Calculate statistics
      const stats = await this.calculateStats(clientId, appointments);
      
      // Get upcoming appointments (next 3)
      const upcomingAppointments = this.getUpcomingAppointments(appointments);
      
      // Get recent visits (last 3 completed)
      const recentVisits = this.getRecentVisits(appointments);
      
      // Get user profile for membership info
      const userProfile = await this.getUserProfile(clientId);
      
      return {
        stats,
        upcomingAppointments,
        recentVisits,
        membershipLevel: userProfile?.membershipLevel || 'Gold',
        memberSince: userProfile?.memberSince || '2022',
        points: userProfile?.points || 1250
      };
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get all appointments for a client
   */
  private static async getClientAppointments(clientId: string): Promise<Appointment[]> {
    try {
      const appointmentsRef = collection(db, COLLECTIONS.APPOINTMENTS);
      // Remove orderBy to avoid composite index requirement
      const q = query(
        appointmentsRef, 
        where('clientId', '==', clientId)
      );
      
      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          appointments.push({
            id: docSnapshot.id,
            clientId: data.clientId,
            branchId: data.branchId,
            date: data.date,
            time: data.time,
            status: data.status,
            totalCost: data.totalCost || data.price || 0,
            createdAt: data.createdAt,
            serviceStylistPairs: data.serviceStylistPairs || [],
            // Add other fields as needed
          } as Appointment);
        } catch (error) {
          console.error('❌ Error mapping appointment:', docSnapshot.id, error);
        }
      }
      
      // Sort client-side to avoid composite index requirement
      appointments.sort((a, b) => {
        const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || '');
        const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || '');
        return dateB.getTime() - dateA.getTime(); // Descending order
      });
      
      return appointments;
    } catch (error) {
      console.error('❌ Error fetching client appointments:', error);
      return [];
    }
  }

  /**
   * Calculate dashboard statistics
   */
  private static async calculateStats(clientId: string, appointments: Appointment[]): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's appointments
    const todayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.date || '');
      return aptDate >= today && aptDate < tomorrow;
    }).length;

    // Count total visits (completed appointments)
    const totalVisits = appointments.filter(apt => 
      apt.status === 'completed' || apt.status === 'confirmed'
    ).length;

    // Calculate total spent
    const totalSpent = appointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.totalCost || 0), 0);

    // Get unique stylists count
    const uniqueStylists = new Set(
      appointments
        .filter(apt => apt.serviceStylistPairs)
        .flatMap(apt => apt.serviceStylistPairs?.map(pair => pair.stylistId) || [])
    ).size;

    return {
      todayAppointments,
      totalVisits,
      loyaltyPoints: 1250, // This could be calculated from user profile
      favoriteStylists: uniqueStylists,
      totalSpent,
      referrals: 3 // This could be fetched from referrals collection
    };
  }

  /**
   * Get upcoming appointments (next 3)
   */
  private static getUpcomingAppointments(appointments: Appointment[]): Appointment[] {
    const now = new Date();
    
    return appointments
      .filter(apt => {
        const aptDate = new Date(apt.date || '');
        return aptDate >= now && 
               (apt.status === 'confirmed' || apt.status === 'scheduled' || apt.status === 'pending');
      })
      .sort((a, b) => {
        const dateA = new Date(a.date || '');
        const dateB = new Date(b.date || '');
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
  }

  /**
   * Get recent visits (last 3 completed)
   */
  private static getRecentVisits(appointments: Appointment[]): RecentVisit[] {
    return appointments
      .filter(apt => apt.status === 'completed')
      .sort((a, b) => {
        const dateA = new Date(a.date || '');
        const dateB = new Date(b.date || '');
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 3)
      .map(apt => ({
        id: apt.id,
        service: apt.serviceStylistPairs?.[0]?.serviceName || 'Service',
        stylist: apt.serviceStylistPairs?.[0]?.stylistName || 'Stylist',
        date: apt.date || '',
        price: `₱${apt.totalCost || 0}`,
        rating: 5 // This could be fetched from reviews collection
      }));
  }

  /**
   * Get user profile for membership info
   */
  private static async getUserProfile(clientId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, clientId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      // Try clients collection as fallback
      const clientDoc = await getDoc(doc(db, COLLECTIONS.CLIENTS, clientId));
      if (clientDoc.exists()) {
        return clientDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get today's appointments for a client
   */
  static async getTodayAppointments(clientId: string): Promise<Appointment[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const appointmentsRef = collection(db, COLLECTIONS.APPOINTMENTS);
      const q = query(
        appointmentsRef,
        where('clientId', '==', clientId),
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<', Timestamp.fromDate(tomorrow)),
        orderBy('time', 'asc')
      );

      const snapshot = await getDocs(q);
      const appointments: Appointment[] = [];

      for (const docSnapshot of snapshot.docs) {
        try {
          const data = docSnapshot.data();
          appointments.push({
            id: docSnapshot.id,
            clientId: data.clientId,
            branchId: data.branchId,
            date: data.date,
            time: data.time,
            status: data.status,
            totalCost: data.totalCost || data.price || 0,
            createdAt: data.createdAt,
            serviceStylistPairs: data.serviceStylistPairs || [],
          } as Appointment);
        } catch (error) {
          console.error('❌ Error mapping today appointment:', docSnapshot.id, error);
        }
      }

      return appointments;
    } catch (error) {
      console.error('❌ Error fetching today appointments:', error);
      return [];
    }
  }

  /**
   * Get client statistics
   */
  static async getClientStats(clientId: string): Promise<{
    totalAppointments: number;
    completedAppointments: number;
    totalSpent: number;
    averageRating: number;
    favoriteServices: string[];
  }> {
    try {
      const appointments = await this.getClientAppointments(clientId);
      
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
      const totalSpent = appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + (apt.totalCost || 0), 0);
      
      // Get favorite services
      const serviceCounts: { [key: string]: number } = {};
      appointments.forEach(apt => {
        apt.serviceStylistPairs?.forEach(pair => {
          const serviceName = pair.serviceName || 'Unknown Service';
          serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
        });
      });
      
      const favoriteServices = Object.entries(serviceCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([service]) => service);

      return {
        totalAppointments,
        completedAppointments,
        totalSpent,
        averageRating: 4.8, // This could be calculated from reviews
        favoriteServices
      };
    } catch (error) {
      console.error('❌ Error fetching client stats:', error);
      return {
        totalAppointments: 0,
        completedAppointments: 0,
        totalSpent: 0,
        averageRating: 0,
        favoriteServices: []
      };
    }
  }
}
