import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS, TYPOGRAPHY_STYLES } from '../../constants';
import { Appointment } from '../../types/api';
import { useAuth } from '../../hooks/redux';
import AppointmentService from '../../services/appointmentService';
import ServicePricingService from '../../services/servicePricingService';
import { useServicePricing } from '../../hooks/useServicePricing';

const { width } = Dimensions.get('window');
const isIPhone = Platform.OS === 'ios';

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [branchNames, setBranchNames] = useState<{ [branchId: string]: string }>({});
  const [serviceNames, setServiceNames] = useState<{ [serviceId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const navigation = useNavigation();
  const { user } = useAuth();
  const { servicePricing, loading: pricingLoading, calculateAppointmentTotal } = useServicePricing(user?.branchId || undefined);

  // Helper function to calculate branch-specific price for an appointment
  const calculateBranchSpecificPrice = (appointment: Appointment): number => {
    console.log('🔍 Calculating price for appointment:', {
      id: appointment.id,
      totalPrice: appointment.totalPrice,
      finalPrice: appointment.finalPrice,
      price: appointment.price,
      totalCost: (appointment as any).totalCost,
      serviceStylistPairs: (appointment as any).serviceStylistPairs,
      branchId: appointment.branchId,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.appointmentTime,
      status: appointment.status,
      clientName: (appointment as any).clientName,
      userBranchId: user?.branchId,
      servicePricing: servicePricing
    });
    
    // If we have serviceStylistPairs, calculate the total from individual services using branch-specific pricing
    if ((appointment as any).serviceStylistPairs && Array.isArray((appointment as any).serviceStylistPairs)) {
      const servicePairs = (appointment as any).serviceStylistPairs;
      
      console.log('🔍 Multiple services detected:', servicePairs.length, 'services');
      
      // Calculate individual service prices and total
      const individualPrices = servicePairs.map((pair: any) => {
        const price = getServicePrice(pair.serviceId);
        console.log(`💰 Service ${pair.serviceId}: ₱${price}`);
        return { serviceId: pair.serviceId, price };
      });
      
      const totalPrice = calculateAppointmentTotal(servicePairs);
      
      // Enhanced logging for multiple services
      console.log('💰 Individual service prices:', individualPrices);
      console.log('💰 Service count:', servicePairs.length);
      console.log('💰 Calculated TOTAL from serviceStylistPairs with branch pricing:', totalPrice);
      console.log('💰 Sum verification:', individualPrices.reduce((sum: number, item: any) => sum + item.price, 0));
      
      return totalPrice;
    }
    
    // Try multiple price fields in order of preference - prioritize totalPrice from Firestore
    const price = appointment.totalPrice || 
                  appointment.finalPrice || 
                  appointment.price || 
                  (appointment as any).totalCost || 
                  0;
    
    console.log('💰 Calculated price:', price);
    console.log('💰 Price breakdown:', {
      totalPrice: appointment.totalPrice,
      finalPrice: appointment.finalPrice,
      price: appointment.price,
      totalCost: (appointment as any).totalCost,
      selectedPrice: price
    });
    return price;
  };

  // Helper function to get individual service price
  const getServicePrice = (serviceId: string): number => {
    return servicePricing[serviceId] || 0;
  };

  // Helper function to get service names from serviceStylistPairs
  const getServiceNames = (appointment: Appointment): string => {
    if (!appointment.serviceStylistPairs || appointment.serviceStylistPairs.length === 0) {
      return 'Service';
    }

    if (appointment.serviceStylistPairs.length === 1) {
      const firstPair = appointment.serviceStylistPairs[0];
      return firstPair?.serviceName || 
             serviceNames[firstPair?.serviceId || ''] || 
             firstPair?.serviceId || 'Service';
    }

    // For multiple services, show the first few service names
    const serviceNamesList = appointment.serviceStylistPairs
      .slice(0, 2) // Show first 2 services
      .map(pair => pair.serviceName || serviceNames[pair.serviceId] || pair.serviceId)
      .filter(Boolean);
    
    if (serviceNamesList.length === 0) return 'Services';
    
    const displayText = serviceNamesList.join(', ');
    const remainingCount = appointment.serviceStylistPairs.length - serviceNamesList.length;
    
    return remainingCount > 0 
      ? `${displayText} +${remainingCount} more`
      : displayText;
  };

  const getStylistNames = (appointment: Appointment): string => {
    if (!appointment.serviceStylistPairs || appointment.serviceStylistPairs.length === 0) {
      return 'Stylist';
    }

    if (appointment.serviceStylistPairs.length === 1) {
      const firstPair = appointment.serviceStylistPairs[0];
      return firstPair?.stylistName || 'Stylist';
    }

    // For multiple stylists, show the first few stylist names
    const stylistNamesList = appointment.serviceStylistPairs
      .slice(0, 2) // Show first 2 stylists
      .map(pair => pair.stylistName || 'Stylist')
      .filter(Boolean);
    
    if (stylistNamesList.length === 0) return 'Stylists';
    
    const displayText = stylistNamesList.join(', ');
    const remainingCount = appointment.serviceStylistPairs.length - stylistNamesList.length;
    
    return remainingCount > 0 
      ? `${displayText} +${remainingCount} more`
      : displayText;
  };

  // Helper function to get detailed price breakdown for debugging
  const getPriceBreakdown = (appointment: Appointment) => {
    if ((appointment as any).serviceStylistPairs && Array.isArray((appointment as any).serviceStylistPairs)) {
      const servicePairs = (appointment as any).serviceStylistPairs;
      const breakdown = servicePairs.map((pair: any) => ({
        serviceId: pair.serviceId,
        serviceName: serviceNames[pair.serviceId] || pair.serviceId,
        price: getServicePrice(pair.serviceId),
        stylistId: pair.stylistId
      }));
      
      const total = breakdown.reduce((sum: number, item: any) => sum + item.price, 0);
      
      console.log('💰 Price Breakdown:', {
        appointmentId: appointment.id,
        breakdown,
        total,
        serviceCount: servicePairs.length
      });
      
      return { breakdown, total };
    }
    return { breakdown: [], total: 0 };
  };

  // Load appointments on component mount and set up real-time subscription
  useEffect(() => {
    if (user?.id) {
      console.log('🔄 Setting up real-time appointment subscription for user:', user.id);
      const unsubscribe = setupRealtimeSubscription();
      
      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 Cleaning up appointment subscription');
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
    
    // Return empty cleanup function if no user
    return () => {};
  }, [user?.id]);





  const loadAppointments = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const clientAppointments = await AppointmentService.getClientAppointments(user.id);
      
      // Enhanced debugging for appointment data structure
      console.log('🔄 Loaded appointments:', clientAppointments.length);
      console.log('📋 Appointment data structure:', clientAppointments.map(apt => ({
        id: apt.id,
        branchId: apt.branchId,
        appointmentDate: apt.appointmentDate,
        appointmentTime: apt.appointmentTime,
        clientId: apt.clientId,
        clientName: (apt as any).clientName,
        clientEmail: (apt as any).clientEmail,
        clientPhone: (apt as any).clientPhone,
        notes: apt.notes,
        status: apt.status,
        totalPrice: apt.totalPrice,
        serviceStylistPairs: (apt as any).serviceStylistPairs,
        history: (apt as any).history,
        createdAt: apt.createdAt,
        updatedAt: apt.updatedAt
      })));
      
      setAppointments(clientAppointments);
      
      
      // Fetch branch names for all unique branch IDs
      const uniqueBranchIds = [...new Set(clientAppointments.map(apt => apt.branchId).filter(Boolean))];
      if (uniqueBranchIds.length > 0) {
        console.log('🔄 Fetching branch names for:', uniqueBranchIds);
        const branchNamesMap = await AppointmentService.getBranchNames(uniqueBranchIds);
        setBranchNames(branchNamesMap);
      }

      // Fetch service names for all unique service IDs
      const allServiceIds = clientAppointments.flatMap(apt => 
        apt.serviceStylistPairs?.map(pair => pair.serviceId) || []
      ).filter(Boolean);
      const uniqueServiceIds = [...new Set(allServiceIds)];
      if (uniqueServiceIds.length > 0) {
        console.log('🔄 Fetching service names for:', uniqueServiceIds);
        const serviceNamesMap = await AppointmentService.getServiceNames(uniqueServiceIds);
        setServiceNames(serviceNamesMap);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      Alert.alert('Error', 'Failed to load appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const setupRealtimeSubscription = () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for real-time subscription');
      return;
    }

    console.log('🔄 Setting up real-time subscription for user:', user.id);
    
    const unsubscribe = AppointmentService.subscribeToClientAppointments(
      user.id,
      async (updatedAppointments) => {
        console.log('📡 Real-time update received:', updatedAppointments.length, 'appointments');
        
        // Removed active appointment check - users can now book multiple appointments
        
        setAppointments(updatedAppointments);
        
        // Fetch branch names for new appointments
        const uniqueBranchIds = [...new Set(updatedAppointments.map(apt => apt.branchId).filter(Boolean))];
        if (uniqueBranchIds.length > 0) {
          console.log('🔄 Fetching branch names for real-time update:', uniqueBranchIds);
          const branchNamesMap = await AppointmentService.getBranchNames(uniqueBranchIds);
          setBranchNames(prev => ({ ...prev, ...branchNamesMap }));
        }

        // Fetch service names for new appointments
        const allServiceIds = updatedAppointments.flatMap(apt => 
          apt.serviceStylistPairs?.map(pair => pair.serviceId) || []
        ).filter(Boolean);
        const uniqueServiceIds = [...new Set(allServiceIds)];
        if (uniqueServiceIds.length > 0) {
          console.log('🔄 Fetching service names for real-time update:', uniqueServiceIds);
          const serviceNamesMap = await AppointmentService.getServiceNames(uniqueServiceIds);
          setServiceNames(prev => ({ ...prev, ...serviceNamesMap }));
        }
        
        setLoading(false);
        setRefreshing(false);
        setLastUpdated(new Date());
      }
    );

    return unsubscribe;
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    // The real-time subscription will handle updating the appointments
    // We just need to trigger a refresh indicator
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Filter appointments based on selected filter
  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointmentDate || appointment.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'upcoming':
        // Show appointments with status 'in_service', 'confirmed', or 'pending'
        return ['in_service', 'confirmed', 'pending'].includes(appointment.status);
      case 'past':
        // Show appointments that are completed or cancelled
        return ['completed', 'cancelled'].includes(appointment.status);
      default:
        return ['in_service', 'confirmed', 'pending'].includes(appointment.status);
    }
  });

  // Sort appointments by date and time (closest date first)
  const sortedAppointments = filteredAppointments.sort((a, b) => {
    const dateA = new Date(`${a.appointmentDate || a.date} ${a.appointmentTime || a.startTime}`);
    const dateB = new Date(`${b.appointmentDate || b.date} ${b.appointmentTime || b.startTime}`);
    
    // For upcoming appointments, sort by status priority first, then by date
    if (filter === 'upcoming') {
      // Define status priority: pending = 1, confirmed = 2, in_service = 3
      const getStatusPriority = (status: string) => {
        switch (status) {
          case 'pending': return 1;
          case 'confirmed': return 2;
          case 'in_service': return 3;
          default: return 4;
        }
      };
      
      const statusPriorityA = getStatusPriority(a.status);
      const statusPriorityB = getStatusPriority(b.status);
      
      // First sort by status priority
      if (statusPriorityA !== statusPriorityB) {
        return statusPriorityA - statusPriorityB;
      }
      
      // If same status, sort by date (closest first)
      return dateA.getTime() - dateB.getTime();
    }
    // For past appointments, show most recent first
    else if (filter === 'past') {
      return dateB.getTime() - dateA.getTime();
    }
    return dateA.getTime() - dateB.getTime();
  });

  const handleAppointmentPress = async (appointment: Appointment) => {
    // Navigate to AppointmentDetails screen instead of showing modal
    (navigation as any).navigate('AppointmentDetails', { appointment });
  };


  // For web, render without ScreenWrapper to avoid duplicate headers
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {/* My Appointments Section */}
        <View style={styles.section}>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
              onPress={() => setFilter('upcoming')}
            >
              <Text style={[styles.filterButtonText, filter === 'upcoming' && styles.filterButtonTextActive]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
              onPress={() => setFilter('past')}
            >
              <Text style={[styles.filterButtonText, filter === 'past' && styles.filterButtonTextActive]}>
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              {filter === 'upcoming' ? 'Upcoming Appointments' : 'Past Appointments'}
            </Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#160B53" />
              <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
          ) : sortedAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'upcoming' ? 'You have no upcoming appointments' : 'You have no past appointments'}
              </Text>
            </View>
          ) : (
            sortedAppointments.map((appointment) => (
              <TouchableOpacity 
                key={appointment.id} 
                style={styles.appointmentCard}
                onPress={() => handleAppointmentPress(appointment)}
              >
                <View style={styles.appointmentLeft}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={20} color="#4A90E2" />
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentService}>
                      {getServiceNames(appointment)}
                    </Text>
                    <Text style={styles.appointmentStylist}>
                      {getStylistNames(appointment)}
                    </Text>
                    <View style={styles.appointmentInfo}>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="time" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {AppointmentService.formatDate(appointment.appointmentDate)} • {AppointmentService.formatTime(appointment.appointmentTime)}
                        </Text>
                      </View>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="location" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {branchNames[appointment.branchId || ''] || `Branch ${appointment.branchId || 'Unknown'}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.appointmentRight}>
                  {/* Enhanced Price Display for Multiple Services */}
                  {appointment.serviceStylistPairs && appointment.serviceStylistPairs.length > 1 ? (
                    <View style={styles.multiServicePriceContainer}>
                      <Text style={styles.totalPriceText}>
                        ₱{(appointment.totalPrice || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.serviceCountText}>
                        Total for {appointment.serviceStylistPairs.length} services
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.priceText}>
                      ₱{(appointment.totalPrice || 0).toLocaleString()}
                    </Text>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: AppointmentService.getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>
                      {AppointmentService.getStatusText(appointment.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <View style={styles.mainContainer}>
      <ScreenWrapper title="Appointments">
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
        {/* Page Title */}
        <View style={styles.section}>
        </View>

        {/* Filters Section */}
        <View style={styles.section}>
          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
              onPress={() => setFilter('upcoming')}
            >
              <Text style={[styles.filterButtonText, filter === 'upcoming' && styles.filterButtonTextActive]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
              onPress={() => setFilter('past')}
            >
              <Text style={[styles.filterButtonText, filter === 'past' && styles.filterButtonTextActive]}>
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Appointments List */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>
              {filter === 'upcoming' ? 'Upcoming Appointments' : 'Past Appointments'}
            </Text>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#160B53" />
              <Text style={styles.loadingText}>Loading appointments...</Text>
            </View>
          ) : sortedAppointments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No appointments found</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'upcoming' ? 'You have no upcoming appointments' : 'You have no past appointments'}
              </Text>
            </View>
          ) : (
            sortedAppointments.map((appointment) => (
              <TouchableOpacity 
                key={appointment.id} 
                style={styles.appointmentCard}
                onPress={() => handleAppointmentPress(appointment)}
              >
                <View style={styles.appointmentLeft}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={20} color="#4A90E2" />
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentService}>
                      {getServiceNames(appointment)}
                    </Text>
                    <Text style={styles.appointmentStylist}>
                      {getStylistNames(appointment)}
                    </Text>
                    <View style={styles.appointmentInfo}>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="time" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {AppointmentService.formatDate(appointment.appointmentDate)} • {AppointmentService.formatTime(appointment.appointmentTime)}
                        </Text>
                      </View>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="location" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {branchNames[appointment.branchId || ''] || `Branch ${appointment.branchId || 'Unknown'}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.appointmentRight}>
                  {/* Enhanced Price Display for Multiple Services */}
                  {appointment.serviceStylistPairs && appointment.serviceStylistPairs.length > 1 ? (
                    <View style={styles.multiServicePriceContainer}>
                      <Text style={styles.totalPriceText}>
                        ₱{(appointment.totalPrice || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.serviceCountText}>
                        Total for {appointment.serviceStylistPairs.length} services
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.priceText}>
                      ₱{(appointment.totalPrice || 0).toLocaleString()}
                    </Text>
                  )}
                  <View style={[styles.statusBadge, { backgroundColor: AppointmentService.getStatusColor(appointment.status) }]}>
                    <Text style={styles.statusText}>
                      {AppointmentService.getStatusText(appointment.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
      </ScreenWrapper>
      
      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => {
          (navigation as any).navigate('Booking');
        }}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="add" 
          size={24} 
          color="#FFFFFF" 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  pageTitle: {
    ...TYPOGRAPHY_STYLES.header,
    marginBottom: Platform.OS === 'web' ? 16 : 4,
  },
  pageSubtitle: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#6B7280',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY_STYLES.sectionTitle,
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentService: {
    ...TYPOGRAPHY_STYLES.body,
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
  },
  appointmentStylist: {
    ...TYPOGRAPHY_STYLES.label,
    marginBottom: 8,
  },
  appointmentInfo: {
    gap: 4,
  },
  appointmentInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentInfoText: {
    ...TYPOGRAPHY_STYLES.caption,
    marginLeft: 6,
  },
  appointmentRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    ...TYPOGRAPHY_STYLES.price,
    marginBottom: 8,
  },
  multiServicePriceContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  totalPriceText: {
    ...TYPOGRAPHY_STYLES.price,
    marginBottom: 2,
  },
  serviceCountText: {
    ...TYPOGRAPHY_STYLES.caption,
  },
  summaryText: {
    ...TYPOGRAPHY_STYLES.tiny,
    color: '#999',
    fontStyle: 'italic',
  },
  debugText: {
    ...TYPOGRAPHY_STYLES.tiny,
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    ...TYPOGRAPHY_STYLES.status,
  },
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  filterButtonActive: {
    backgroundColor: '#160B53',
    borderColor: '#160B53',
  },
  filterButtonText: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#666666',
    fontFamily: FONTS.medium,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Status Filter styles
  statusFilterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  statusFilterLabel: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    fontWeight: '600',
    color: '#160B53',
    marginBottom: 8,
    fontFamily: FONTS.semiBold,
  },
  statusFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  statusFilterButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  statusFilterButtonText: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#666666',
    fontFamily: FONTS.medium,
  },
  statusFilterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Loading and empty states
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    ...TYPOGRAPHY_STYLES.sectionTitle,
    color: '#666666',
  },
  emptySubtext: {
    marginTop: 8,
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#999999',
    textAlign: 'center',
  },
  // Enhanced Card Layout Styles
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitle: {
    ...TYPOGRAPHY_STYLES.subheader,
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceSubtitle: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  cardContent: {
    padding: 24,
    paddingTop: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    fontWeight: '600',
    color: '#374151',
    fontFamily: FONTS.semiBold,
    minWidth: 80,
    marginRight: 8,
  },
  infoValue: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#1F2937',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 20,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  rescheduleButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  cancelButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_CONFIG.primaryColor,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
});