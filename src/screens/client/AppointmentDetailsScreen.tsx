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
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getDoc, doc } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS } from '../../constants';
import { Appointment } from '../../types/api';
import { useAuth } from '../../hooks/redux';
import AppointmentService from '../../services/appointmentService';
import { db, COLLECTIONS } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

export default function AppointmentDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { appointment } = route.params as { appointment: Appointment };
  const { user } = useAuth();
  
  const [stylists, setStylists] = useState<{[key: string]: {firstName: string, lastName: string, name: string}}>({});
  const [serviceNames, setServiceNames] = useState<{ [serviceId: string]: string }>({});
  const [branchName, setBranchName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Reschedule states
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [confirmRescheduleVisible, setConfirmRescheduleVisible] = useState(false);
  
  // Cancel states
  const [confirmCancelVisible, setConfirmCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadAppointmentDetails();
  }, [appointment]);

  const loadAppointmentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch stylist information from users collection if serviceStylistPairs exist
      if (appointment.serviceStylistPairs && appointment.serviceStylistPairs.length > 0) {
        const stylistIds = appointment.serviceStylistPairs.map(pair => pair.stylistId);
        const stylistMap: {[key: string]: {firstName: string, lastName: string, name: string}} = {};
        
        // Fetch each stylist from users collection
        for (const stylistId of stylistIds) {
          try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, stylistId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const firstName = userData['firstName'] || userData.firstName || 'Stylist';
              const lastName = userData['lastName'] || userData.lastName || 'Name';
              const fullName = `${firstName} ${lastName}`.trim();
              
              stylistMap[stylistId] = {
                firstName,
                lastName,
                name: fullName
              };
              console.log('✅ Fetched stylist from users collection:', fullName);
            } else {
              console.log('⚠️ Stylist not found in users collection:', stylistId);
              stylistMap[stylistId] = {
                firstName: 'Stylist',
                lastName: 'Name',
                name: 'Stylist Name'
              };
            }
          } catch (error) {
            console.error('❌ Error fetching stylist from users collection:', stylistId, error);
            stylistMap[stylistId] = {
              firstName: 'Stylist',
              lastName: 'Name',
              name: 'Stylist Name'
            };
          }
        }
        
        setStylists(stylistMap);
      }

      // Fetch service names
      const allServiceIds = appointment.serviceStylistPairs?.map(pair => pair.serviceId) || [];
      if (allServiceIds.length > 0) {
        const serviceNamesMap = await AppointmentService.getServiceNames(allServiceIds);
        setServiceNames(serviceNamesMap);
      }

      // Fetch branch name
      if (appointment.branchId) {
        const branchNamesMap = await AppointmentService.getBranchNames([appointment.branchId]);
        setBranchName(branchNamesMap[appointment.branchId] || `Branch ${appointment.branchId}`);
      }
    } catch (error) {
      console.error('Error loading appointment details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if appointment can be rescheduled
  const canReschedule = () => {
    return appointment.status === 'scheduled' || appointment.status === 'pending';
  };

  // Check if appointment can be cancelled
  const canCancel = () => {
    return appointment.status === 'scheduled' || appointment.status === 'pending' || appointment.status === 'confirmed';
  };

  const handleReschedule = () => {
    if (!canReschedule()) {
      Alert.alert('Cannot Reschedule', 'This appointment cannot be rescheduled. Only scheduled or pending appointments can be rescheduled.');
      return;
    }

    // Set the initial date and time from the appointment
    const appointmentDate = new Date(appointment.appointmentDate || appointment.date);
    const appointmentTime = new Date(`${appointment.appointmentDate || appointment.date} ${appointment.appointmentTime || appointment.startTime}`);
    
    setSelectedDate(appointmentDate);
    setSelectedTime(appointmentTime);
    setRescheduleNotes('');
    setRescheduleModalVisible(true);
  };

  const handleRescheduleSubmit = () => {
    if (!rescheduleNotes.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for rescheduling the appointment.');
      return;
    }

    if (!selectedTime) return;

    // Prepare formatted date/time for confirmation
    const newDate = selectedDate.toISOString().split('T')[0];
    const newTime = selectedTime?.toTimeString().split(' ')[0].substring(0, 5) || '00:00';
    const formattedDate = AppointmentService.formatDate(newDate);
    const formattedTime = AppointmentService.formatTime(newTime);

    // Open confirmation modal for reschedule
    setConfirmRescheduleVisible(true);
  };

  const handleCancel = () => {
    if (!canCancel()) {
      Alert.alert('Cannot Cancel', 'This appointment cannot be cancelled.');
      return;
    }
    setConfirmCancelVisible(true);
  };

  const confirmReschedule = async () => {
    if (!appointment.id) return;
    if (!rescheduleNotes.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for rescheduling the appointment.');
      return;
    }

    try {
      const newDate = selectedDate.toISOString().split('T')[0];
      const newTime = selectedTime?.toTimeString().split(' ')[0].substring(0,5) || '00:00';
      
      // Create reschedule data with proper structure
      const rescheduleData = {
        newDate,
        newTime,
        reason: rescheduleNotes.trim(),
        requestedBy: user?.id || 'client',
        requestedAt: new Date().toISOString()
      };

      await AppointmentService.rescheduleAppointment(appointment.id, newDate, newTime, rescheduleNotes.trim());
      Alert.alert('Reschedule Request Submitted', 'Your reschedule request has been submitted. You will be placed in a queue and notified once confirmed.');
      setRescheduleModalVisible(false);
      setConfirmRescheduleVisible(false);
      setRescheduleNotes('');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      Alert.alert('Error', 'Failed to reschedule appointment. Please try again.');
    }
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required Field', 'Please provide a reason for cancelling the appointment.');
      return;
    }
    if (!appointment.id) return;
    
    try {
      // Create cancellation data with proper structure
      const cancellationData = {
        reason: cancelReason.trim(),
        cancelledBy: user?.id || 'client',
        cancelledAt: new Date().toISOString()
      };

      await AppointmentService.cancelAppointment(appointment.id, cancellationData);
      Alert.alert('Success', 'Appointment cancelled successfully');
      setConfirmCancelVisible(false);
      setCancelReason('');
      navigation.goBack();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment. Please try again.');
    }
  };

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

  if (loading) {
    return (
      <ScreenWrapper title="Appointment Details" showBackButton={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#160B53" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Appointment Details" showBackButton={true}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Appointment Header */}
          <View style={styles.headerSection}>
            <View style={styles.appointmentIcon}>
              <Ionicons name="calendar" size={32} color="#4A90E2" />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.appointmentTitle}>
                {getServiceNames(appointment)}
              </Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: AppointmentService.getStatusColor(appointment.status) }]}>
                  <Text style={styles.statusText}>
                    {AppointmentService.getStatusText(appointment.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Appointment Information */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Appointment Information</Text>
            
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color="#160B53" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {AppointmentService.formatDate(appointment.appointmentDate)} at {AppointmentService.formatTime(appointment.appointmentTime)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location" size={20} color="#160B53" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>
                  {branchName || `Branch ${appointment.branchId || 'Unknown'}`}
                </Text>
              </View>
            </View>

            {appointment.notes && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text" size={20} color="#160B53" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{appointment.notes}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Services & Stylists */}
          {appointment.serviceStylistPairs && appointment.serviceStylistPairs.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Services & Stylists</Text>
              <View style={styles.servicesContainer}>
              {appointment.serviceStylistPairs.map((pair, index) => {
                const stylist = stylists[pair.stylistId];
                const stylistName = stylist ? stylist.name : `Stylist ${pair.stylistId}`;
                const serviceName = serviceNames[pair.serviceId] || pair.serviceName || pair.serviceId;
                
                return (
                  <View key={index} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <Ionicons name="cut" size={20} color="#4A90E2" />
                      <Text style={styles.serviceName}>{serviceName}</Text>
                    </View>
                    <View style={styles.serviceDetails}>
                      <View style={styles.stylistInfo}>
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.stylistName}>{stylistName}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
              </View>
            </View>
          )}

          {/* Pricing Section */}
          <View style={styles.pricingSection}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.priceCard}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total Price</Text>
                <Text style={styles.priceValue}>₱{(appointment.totalPrice || 0).toLocaleString()}</Text>
              </View>
              {appointment.serviceStylistPairs && appointment.serviceStylistPairs.length > 1 && (
                <Text style={styles.priceSubtext}>
                  Total for {appointment.serviceStylistPairs.length} services
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {(canReschedule() || canCancel()) && (
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionButtons}>
                {canReschedule() && (
                  <TouchableOpacity style={styles.rescheduleButton} onPress={handleReschedule}>
                    <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                  </TouchableOpacity>
                )}
                {canCancel() && (
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Ionicons name="close-circle-outline" size={20} color="#160B53" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Status Information */}
          {!canReschedule() && !canCancel() && (
            <View style={styles.statusInfoSection}>
              <Text style={styles.sectionTitle}>Appointment Status</Text>
              <View style={styles.statusInfoCard}>
                <Ionicons name="information-circle" size={24} color="#4A90E2" />
                <View style={styles.statusInfoContent}>
                  <Text style={styles.statusInfoTitle}>
                    {appointment.status === 'completed' ? 'Appointment Completed' : 
                     appointment.status === 'cancelled' ? 'Appointment Cancelled' : 
                     'Appointment Not Available for Changes'}
                  </Text>
                  <Text style={styles.statusInfoText}>
                    {appointment.status === 'completed' ? 'This appointment has been completed and cannot be modified.' :
                     appointment.status === 'cancelled' ? 'This appointment has been cancelled.' :
                     'This appointment cannot be rescheduled or cancelled at this time.'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Reschedule Modal */}
        {rescheduleModalVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.rescheduleModalContent}>
              <View style={styles.rescheduleModalHeader}>
                <Text style={styles.rescheduleModalTitle}>Reschedule Appointment</Text>
                <TouchableOpacity 
                  onPress={() => setRescheduleModalVisible(false)} 
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.rescheduleForm}>
                <Text style={styles.rescheduleNote}>
                  📋 You will be placed in a queue and notified once your reschedule request is confirmed.
                </Text>
                
                {/* Date Selection */}
                <View style={styles.rescheduleField}>
                  <Text style={styles.rescheduleLabel}>New Date</Text>
                  <TouchableOpacity 
                    style={styles.rescheduleInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.rescheduleInputText}>
                      {selectedDate.toLocaleDateString()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {/* Time Selection */}
                <View style={styles.rescheduleField}>
                  <Text style={styles.rescheduleLabel}>New Time</Text>
                  <TouchableOpacity 
                    style={styles.rescheduleInput}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.rescheduleInputText}>
                      {selectedTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {/* Notes */}
                <View style={styles.rescheduleField}>
                  <Text style={styles.rescheduleLabel}>Reason for Rescheduling *</Text>
                  <TextInput
                    style={[
                      styles.rescheduleTextArea,
                      !rescheduleNotes.trim() && styles.requiredField
                    ]}
                    placeholder="Please provide a reason for rescheduling this appointment..."
                    value={rescheduleNotes}
                    onChangeText={setRescheduleNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {!rescheduleNotes.trim() && (
                    <Text style={styles.requiredFieldText}>This field is required</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.rescheduleActions}>
                <TouchableOpacity 
                  style={styles.rescheduleCancelButton}
                  onPress={() => setRescheduleModalVisible(false)}
                >
                  <Text style={styles.rescheduleCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.rescheduleSubmitButton,
                    !rescheduleNotes.trim() && styles.rescheduleSubmitButtonDisabled
                  ]}
                  onPress={handleRescheduleSubmit}
                  disabled={!rescheduleNotes.trim()}
                >
                  <Text style={[
                    styles.rescheduleSubmitButtonText,
                    !rescheduleNotes.trim() && styles.rescheduleSubmitButtonTextDisabled
                  ]}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Confirm Reschedule Modal */}
        {confirmRescheduleVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModalContent}>
              <Text style={styles.confirmModalTitle}>Confirm Reschedule</Text>
              <Text style={styles.confirmModalText}>
                Reschedule appointment to {AppointmentService.formatDate(selectedDate.toISOString().split('T')[0])} at {AppointmentService.formatTime(selectedTime.toTimeString().split(' ')[0].substring(0,5))}?
              </Text>
              <View style={styles.confirmModalActions}>
                <TouchableOpacity style={styles.confirmModalButton} onPress={() => setConfirmRescheduleVisible(false)}>
                  <Text style={styles.confirmModalButtonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmModalButton, styles.confirmModalPrimary]}
                  onPress={confirmReschedule}
                >
                  <Text style={[styles.confirmModalButtonText, styles.confirmModalPrimaryText]}>Yes, Reschedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Confirm Cancel Modal */}
        {confirmCancelVisible && (
          <View style={styles.modalOverlay}>
            <View style={styles.cancelModalContent}>
              <Text style={styles.confirmModalTitle}>Cancel Appointment</Text>
              <Text style={styles.confirmModalText}>Are you sure you want to cancel this appointment? This action cannot be undone.</Text>
              
              <View style={styles.cancelReasonField}>
                <Text style={styles.cancelReasonLabel}>Reason for Cancellation *</Text>
                <TextInput
                  style={[
                    styles.cancelReasonInput,
                    !cancelReason.trim() && styles.requiredField
                  ]}
                  placeholder="Please provide a reason for cancelling this appointment..."
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {!cancelReason.trim() && (
                  <Text style={styles.requiredFieldText}>This field is required</Text>
                )}
              </View>

              <View style={styles.confirmModalActions}>
                <TouchableOpacity 
                  style={styles.confirmModalButton} 
                  onPress={() => {
                    setConfirmCancelVisible(false);
                    setCancelReason('');
                  }}
                >
                  <Text style={styles.confirmModalButtonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmModalButton, 
                    styles.confirmModalDestructive,
                    !cancelReason.trim() && styles.confirmModalButtonDisabled
                  ]}
                  onPress={confirmCancel}
                  disabled={!cancelReason.trim()}
                >
                  <Text style={[
                    styles.confirmModalButtonText, 
                    styles.confirmModalDestructiveText,
                    !cancelReason.trim() && styles.confirmModalButtonTextDisabled
                  ]}>Yes, Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event: any, selectedDate?: Date) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setSelectedDate(selectedDate);
              }
            }}
          />
        )}
        
        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={(event: any, selectedTime?: Date) => {
              setShowTimePicker(false);
              if (selectedTime) {
                setSelectedTime(selectedTime);
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: FONTS.regular,
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#160B53',
    marginBottom: 8,
  },
  statusContainer: {
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#160B53',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#374151',
  },
  servicesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  servicesContainer: {
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#1D4ED8',
    marginLeft: 8,
  },
  serviceDetails: {
    marginLeft: 28,
  },
  stylistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stylistName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
    marginLeft: 6,
  },
  pricingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  priceCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#160B53',
  },
  priceSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  rescheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#160B53',
    gap: 8,
  },
  cancelButtonText: {
    color: '#160B53',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  rescheduleModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.95,
    maxWidth: 500,
    maxHeight: '90%',
  },
  rescheduleModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rescheduleModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#160B53',
    fontFamily: FONTS.bold,
  },
  modalCloseButton: {
    padding: 4,
  },
  rescheduleForm: {
    marginBottom: 24,
  },
  rescheduleNote: {
    fontSize: 14,
    color: '#4A90E2',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
  rescheduleField: {
    marginBottom: 20,
  },
  rescheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#160B53',
    marginBottom: 8,
    fontFamily: FONTS.semiBold,
  },
  rescheduleInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rescheduleInputText: {
    fontSize: 14,
    color: '#160B53',
    fontFamily: FONTS.regular,
  },
  rescheduleTextArea: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#160B53',
    fontFamily: FONTS.regular,
    minHeight: 80,
  },
  rescheduleActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rescheduleCancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rescheduleCancelButtonText: {
    fontSize: 14,
    color: '#666666',
    fontFamily: FONTS.semiBold,
  },
  rescheduleSubmitButton: {
    flex: 1,
    backgroundColor: APP_CONFIG.primaryColor,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rescheduleSubmitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.85,
    maxWidth: 420,
    alignItems: 'center',
  },
  cancelModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxWidth: 500,
    alignItems: 'center',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#160B53',
    marginBottom: 12,
    fontFamily: FONTS.bold,
  },
  confirmModalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  confirmModalButtonText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: FONTS.semiBold,
  },
  confirmModalDestructive: {
    backgroundColor: '#EF4444',
  },
  confirmModalDestructiveText: {
    color: '#FFFFFF',
  },
  confirmModalPrimary: {
    backgroundColor: APP_CONFIG.primaryColor,
  },
  confirmModalPrimaryText: {
    color: '#FFFFFF',
  },
  confirmModalButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  confirmModalButtonTextDisabled: {
    color: '#9CA3AF',
  },
  cancelReasonField: {
    width: '100%',
    marginBottom: 20,
  },
  cancelReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#160B53',
    marginBottom: 8,
    fontFamily: FONTS.semiBold,
  },
  cancelReasonInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#160B53',
    fontFamily: FONTS.regular,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Status Info Section
  statusInfoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusInfoTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#1D4ED8',
    marginBottom: 4,
  },
  statusInfoText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    lineHeight: 20,
  },
  // Required Field Styles
  requiredField: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  requiredFieldText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#EF4444',
    marginTop: 4,
  },
  rescheduleSubmitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  rescheduleSubmitButtonTextDisabled: {
    color: '#9CA3AF',
  },
});
