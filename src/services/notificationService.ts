import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { FirestoreNotification } from '../types/firebase';

export interface NotificationData {
  title: string;
  message: string;
  type: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  clientName: string;
  stylistName: string;
  branchName: string;
  recipientRole: string;
  recipientId: string;
  isRead: boolean;
}

export class NotificationService {
  /**
   * Create a notification in the notifications collection
   */
  static async createNotification(notificationData: NotificationData): Promise<string> {
    try {
      console.log('🔔 Creating notification with data:', notificationData);
      
      // Validate required fields
      const requiredFields = [
        'title',
        'message',
        'type',
        'appointmentId',
        'appointmentDate',
        'appointmentTime',
        'clientName',
        'stylistName',
        'branchName',
        'recipientRole',
        'recipientId'
      ];
      
      const missingFields = requiredFields.filter(field => !notificationData[field as keyof NotificationData]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Prepare notification data for Firestore
      const notification: Omit<FirestoreNotification, 'id' | 'createdAt' | 'updatedAt'> = {
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type as any,
        isRead: notificationData.isRead,
        appointmentId: notificationData.appointmentId,
        appointmentDate: notificationData.appointmentDate,
        appointmentTime: notificationData.appointmentTime,
        clientName: notificationData.clientName,
        stylistName: notificationData.stylistName,
        branchName: notificationData.branchName,
        recipientRole: notificationData.recipientRole,
        recipientId: notificationData.recipientId,
        userId: notificationData.recipientId // For backward compatibility
      };
      
      console.log('📋 Final notification data to save:', notification);
      
      const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
      const docRef = await addDoc(notificationsRef, {
        ...notification,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Notification created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      console.error('❌ Notification data that failed:', notificationData);
      
      // Re-throw with more specific error message
      if (error instanceof Error) {
        throw new Error(`Failed to create notification: ${error.message}`);
      } else {
        throw new Error('Failed to create notification: Unknown error');
      }
    }
  }

  /**
   * Create appointment notification for stylist when user books appointment
   */
  static async createStylistAppointmentNotification(
    appointmentId: string,
    appointmentDate: string,
    appointmentTime: string,
    clientName: string,
    stylistName: string,
    stylistId: string,
    branchName: string
  ): Promise<string> {
    try {
      console.log('🔔 Creating appointment notification for stylist:', stylistId);
      
      const notificationData: NotificationData = {
        title: "New Appointment Assigned",
        message: `You have a new appointment with ${clientName} on ${appointmentDate}`,
        type: "appointment_created",
        appointmentId: appointmentId,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        clientName: clientName,
        stylistName: stylistName,
        branchName: branchName,
        recipientRole: "stylist",
        recipientId: stylistId,
        isRead: false
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('❌ Error creating stylist appointment notification:', error);
      throw error;
    }
  }

  /**
   * Create appointment notification for client when they book appointment
   */
  static async createClientAppointmentNotification(
    appointmentId: string,
    appointmentDate: string,
    appointmentTime: string,
    clientName: string,
    clientId: string,
    stylistName: string,
    branchName: string
  ): Promise<string> {
    try {
      console.log('🔔 Creating appointment notification for client:', clientId);
      
      const notificationData: NotificationData = {
        title: "Appointment Booked Successfully",
        message: `Your appointment has been scheduled for ${appointmentDate} at ${appointmentTime}`,
        type: "appointment_created",
        appointmentId: appointmentId,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTime,
        clientName: clientName,
        stylistName: stylistName,
        branchName: branchName,
        recipientRole: "client",
        recipientId: clientId,
        isRead: false
      };
      
      return await this.createNotification(notificationData);
    } catch (error) {
      console.error('❌ Error creating client appointment notification:', error);
      throw error;
    }
  }
}

export default NotificationService;
