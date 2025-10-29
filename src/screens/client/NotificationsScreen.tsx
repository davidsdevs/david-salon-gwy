import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../hooks/redux';
import { APP_CONFIG, FONTS } from '../../constants';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../config/firebase';

const { width } = Dimensions.get('window');
const isIPhone = Platform.OS === 'ios';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  recipientId: string;
  recipientRole: string;
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  branchName?: string;
  clientName?: string;
  stylistName?: string;
  createdAt: any;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user?.id) {
      unsubscribe = setupRealtimeSubscription();
    } else {
      // If logged out, clear state and stop loading
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.id]);

  const setupRealtimeSubscription = () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for notifications subscription');
      return;
    }

    console.log('🔄 Setting up real-time subscription for notifications');
    
    const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('recipientId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('📡 Real-time update received for notifications:', querySnapshot.docs.length);
      
      const notificationsData: Notification[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notificationsData.push({
          id: doc.id,
          title: data['title'] || data.title || 'Notification',
          message: data['message'] || data.message || '',
          type: data['type'] || data.type || 'general',
          isRead: data['isRead'] ?? data.isRead ?? false,
          recipientId: data['recipientId'] || data.recipientId || '',
          recipientRole: data['recipientRole'] || data.recipientRole || 'client',
          appointmentId: data['appointmentId'] || data.appointmentId || '',
          appointmentDate: data['appointmentDate'] || data.appointmentDate || '',
          appointmentTime: data['appointmentTime'] || data.appointmentTime || '',
          branchName: data['branchName'] || data.branchName || '',
          clientName: data['clientName'] || data.clientName || '',
          stylistName: data['stylistName'] || data.stylistName || '',
          createdAt: data['createdAt'] || data.createdAt
        });
      });
      
      setNotifications(notificationsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('❌ Error in notifications subscription:', error);
      setError('Failed to load notifications');
      setLoading(false);
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered for notifications');
    setRefreshing(true);
    // The real-time subscription will handle updating the notifications
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment_confirmed':
      case 'appointment_reminder':
      case 'appointment_cancelled':
      case 'appointment_rescheduled':
        return 'calendar';
      case 'appointment_completed':
        return 'checkmark-circle';
      case 'promotion':
        return 'pricetag';
      case 'reward':
        return 'gift';
      case 'welcome':
        return 'person-add';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment_confirmed':
        return '#10B981';
      case 'appointment_reminder':
        return '#F59E0B';
      case 'appointment_cancelled':
        return '#EF4444';
      case 'appointment_rescheduled':
        return '#8B5CF6';
      case 'appointment_completed':
        return '#10B981';
      case 'promotion':
        return '#FF6B35';
      case 'reward':
        return '#8B5CF6';
      case 'welcome':
        return '#3B82F6';
      default:
        return '#160B53';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Just now';
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, id);
      await updateDoc(notificationRef, {
        isRead: true
      });
      console.log('✅ Notification marked as read:', id);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const updatePromises = unreadNotifications.map(notification => {
        const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, notification.id);
        return updateDoc(notificationRef, { isRead: true });
      });
      
      await Promise.all(updatePromises);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // For web, render without ScreenWrapper to avoid duplicate headers
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {/* Notifications Header */}
        <View style={styles.section}>
          <View style={styles.headerContainer}>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.pageSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </Text>
        </View>

        {/* Notifications List */}
        <View style={styles.section}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll receive notifications about your appointments and updates here</Text>
            </View>
          ) : (
            <View style={styles.notificationsContainer}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadNotification
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={styles.notificationLeft}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: getNotificationColor(notification.type) + '20' }
                    ]}>
                      <Ionicons 
                        name={getNotificationIcon(notification.type) as any} 
                        size={20} 
                        color={getNotificationColor(notification.type)} 
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationTitle,
                          !notification.isRead && styles.unreadText
                        ]}>
                          {notification.title}
                        </Text>
                        {!notification.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      {notification.appointmentDate && notification.appointmentTime && (
                        <Text style={styles.appointmentDetails}>
                          {new Date(notification.appointmentDate).toLocaleDateString()} at {notification.appointmentTime}
                          {notification.branchName && ` • ${notification.branchName}`}
                        </Text>
                      )}
                      <Text style={styles.notificationTime}>
                        {formatTime(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <ScreenWrapper title="Notifications" showBackButton={true} scrollable={false}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Notifications Header */}
        <View style={styles.section}>
          <View style={styles.headerContainer}>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.markAllButton}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.pageSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </Text>
        </View>

        {/* Notifications List */}
        <View style={styles.section}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll receive notifications about your appointments and updates here</Text>
            </View>
          ) : (
            <View style={styles.notificationsContainer}>
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadNotification
                  ]}
                  onPress={() => markAsRead(notification.id)}
                >
                  <View style={styles.notificationLeft}>
                    <View style={[
                      styles.notificationIcon,
                      { backgroundColor: getNotificationColor(notification.type) + '20' }
                    ]}>
                      <Ionicons 
                        name={getNotificationIcon(notification.type) as any} 
                        size={20} 
                        color={getNotificationColor(notification.type)} 
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text style={[
                          styles.notificationTitle,
                          !notification.isRead && styles.unreadText
                        ]}>
                          {notification.title}
                        </Text>
                        {!notification.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      {notification.appointmentDate && notification.appointmentTime && (
                        <Text style={styles.appointmentDetails}>
                          {new Date(notification.appointmentDate).toLocaleDateString()} at {notification.appointmentTime}
                          {notification.branchName && ` • ${notification.branchName}`}
                        </Text>
                      )}
                      <Text style={styles.notificationTime}>
                        {formatTime(notification.createdAt)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: '100%',
  },
  section: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    paddingTop: Platform.OS === 'web' ? 0 : Platform.OS === 'android' ? 30 : 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: Platform.OS === 'web' ? 25 : Platform.OS === 'ios' ? 18 : Platform.OS === 'android' ? 16 : 20,
    color: Platform.OS === 'web' ? '#160B53' : '#160B53',
    fontFamily: Platform.OS === 'web' ? 'Poppins_700Bold' : FONTS.bold,
  },
  pageSubtitle: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#666',
    fontFamily: FONTS.regular,
  },
  markAllButton: {
    backgroundColor: '#160B53',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
    borderRadius: 6,
  },
  markAllText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 12 : 10,
    fontFamily: FONTS.semiBold,
  },
  notificationsContainer: {
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 14 : 16,
    shadowColor: Platform.OS === 'web' ? '#000000' : '#000',
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 2 } : { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0.25 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 15 : 8,
    elevation: Platform.OS === 'web' ? 0 : 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#160B53',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: Platform.OS === 'android' ? 14 : Platform.OS === 'ios' ? 15 : 16,
    color: '#160B53',
    fontFamily: FONTS.semiBold,
    flex: 1,
  },
  unreadText: {
    fontFamily: FONTS.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#160B53',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: FONTS.regular,
  },
  notificationTime: {
    fontSize: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    color: '#999',
    fontFamily: FONTS.regular,
  },
  actionRequiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  actionRequiredText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 8 : Platform.OS === 'ios' ? 9 : 10,
    fontFamily: FONTS.semiBold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_CONFIG.primaryColor,
    fontFamily: FONTS.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
    fontFamily: FONTS.semiBold,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  appointmentDetails: {
    fontSize: Platform.OS === 'android' ? 11 : Platform.OS === 'ios' ? 12 : 13,
    color: '#8B5CF6',
    fontFamily: FONTS.medium,
    marginTop: 4,
    marginBottom: 4,
  },
});
