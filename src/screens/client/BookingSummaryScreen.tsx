import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import ResponsiveLayout from '../../components/ResponsiveLayout';
import { APP_CONFIG, FONTS, TYPOGRAPHY_STYLES } from '../../constants';
import MobileAppointmentService, { AppointmentData } from '../../services/mobileAppointmentService';
import AppointmentService from '../../services/appointmentService';
import { useAuth } from '../../hooks/redux';
import { useBooking } from '../../context/BookingContext';
import { useServicePricing } from '../../hooks/useServicePricing';

const { width } = Dimensions.get('window');

export default function BookingSummaryScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { state, resetBooking } = useBooking();
  const { servicePricing, calculateAppointmentTotal } = useServicePricing(state.bookingData.branchId || undefined);
  
  const [isCreating, setIsCreating] = useState(false);
  const [notes, setNotes] = useState(state.bookingData.notes || '');
  const [notesError, setNotesError] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const branchNames = {
    1: "David's Salon - Makati",
    2: "David's Salon - BGC", 
    3: "David's Salon - Ortigas",
    4: "David's Salon - Alabang",
  };

  const getBranchName = (branchId: string | number | undefined) => {
    if (!branchId) return 'Unknown Branch';
    
    // Convert to number if it's a string
    const numericId = typeof branchId === 'string' ? parseInt(branchId) : branchId;
    
    // Check if it's a valid branch ID
    if (numericId === 1 || numericId === 2 || numericId === 3 || numericId === 4) {
      return branchNames[numericId as keyof typeof branchNames];
    }
    
    return 'Unknown Branch';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) {
      return 'N/A';
    }
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours || '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error('Error formatting time:', error, 'timeString:', timeString);
      return 'Invalid Time';
    }
  };

  const getTotalPrice = () => {
    // Calculate total from individual services if available
    if (state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0) {
      let total = 0;
      console.log('💰 Calculating total price from services:');
      state.bookingData.selectedServices.forEach(service => {
        // Use servicePricing if available, otherwise fall back to service.price
        const servicePrice = servicePricing[service.id] || service.price || 0;
        const numericPrice = typeof servicePrice === 'string' ? parseFloat(servicePrice) || 0 : servicePrice;
        total += numericPrice;
        console.log(`  - ${service.name}: ₱${numericPrice} (from ${servicePricing[service.id] ? 'servicePricing' : 'service.price'})`);
      });
      console.log(`💰 Total calculated: ₱${total}`);
      return total;
    }
    
    // Fallback to single service or booking data total
    const totalPrice = state.bookingData.totalPrice || state.bookingData.servicePrice || 0;
    const fallbackTotal = typeof totalPrice === 'string' ? parseFloat(totalPrice) || 0 : totalPrice;
    console.log(`💰 Using fallback total: ₱${fallbackTotal}`);
    return fallbackTotal;
  };

  const getTotalDuration = () => {
    // Use totalDuration if available (for multiple services), otherwise fall back to serviceDuration
    const totalDuration = state.bookingData.totalDuration || state.bookingData.serviceDuration || 0;
    // Ensure it's a number, not a string
    return typeof totalDuration === 'string' ? parseInt(totalDuration) || 0 : totalDuration;
  };

  const handleCreateAppointment = async () => {
    // Validation 1: Check if user is logged in
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to book an appointment.');
      return;
    }

    // Validation 2: Check if user has required information
    if (!user.id || !user.name || !user.email) {
      Alert.alert('Incomplete Profile', 'Please complete your profile information before booking.');
      return;
    }

    // Validation 3: Check if booking data is complete
    if (!state.bookingData.branchId || !state.bookingData.date || !state.bookingData.time) {
      Alert.alert('Missing Information', 'Please go back and select a branch, date, and time.');
      return;
    }

    // Validation 4: Check if services are selected
    if (!state.bookingData.selectedServices || state.bookingData.selectedServices.length === 0) {
      if (!state.bookingData.serviceId) {
        Alert.alert('No Services Selected', 'Please go back and select at least one service.');
        return;
      }
    }

    // Validation 5: Check if stylists are assigned
    if (state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0) {
      const servicesWithoutStylists = state.bookingData.selectedServices.filter(service => 
        !state.bookingData.selectedStylists?.[service.id]
      );
      if (servicesWithoutStylists.length > 0) {
        Alert.alert('Stylist Assignment Required', 'Please go back and assign stylists for all services.');
        return;
      }
    } else if (!state.bookingData.stylistId) {
      Alert.alert('No Stylist Assigned', 'Please go back and select a stylist.');
      return;
    }

    // Validation 6: Validate date format and future date
    const appointmentDate = new Date(state.bookingData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(appointmentDate.getTime())) {
      Alert.alert('Invalid Date', 'Please select a valid appointment date.');
      return;
    }
    
    if (appointmentDate < today) {
      Alert.alert('Invalid Date', 'Please select a future date for your appointment.');
      return;
    }

    // Validation 7: Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!state.bookingData.time || !timeRegex.test(state.bookingData.time)) {
      Alert.alert('Invalid Time', 'Please select a valid appointment time.');
      return;
    }

    // Validation 8: Check if total price is valid
    const totalPrice = getTotalPrice();
    if (totalPrice <= 0) {
      Alert.alert('Invalid Price', 'The total price is invalid. Please go back and reselect services.');
      return;
    }

    // Validation 9: Check if total duration is valid
    const totalDuration = getTotalDuration();
    if (totalDuration <= 0) {
      Alert.alert('Invalid Duration', 'The total duration is invalid. Please go back and reselect services.');
      return;
    }

    // Validation 10: Check for duplicate services
    if (state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0) {
      const serviceIds = state.bookingData.selectedServices.map(s => s.id);
      const uniqueServiceIds = [...new Set(serviceIds)];
      if (serviceIds.length !== uniqueServiceIds.length) {
        Alert.alert('Duplicate Services', 'You have selected the same service multiple times. Please go back and fix this.');
        return;
      }
    }

    // Validation 11: Check notes validation
    if (notesError) {
      Alert.alert('Invalid Notes', 'Please fix the notes field before proceeding.');
      return;
    }

    // Validation 12: Check notes length
    if (notes.length > 500) {
      Alert.alert('Notes Too Long', 'Notes cannot exceed 500 characters.');
      return;
    }

    // Validation 13: Removed - Users can now book multiple appointments

    // Show confirmation modal
    setShowConfirmationModal(true);
  };

  const handleConfirmAppointment = async () => {
    setShowConfirmationModal(false);
    setIsCreating(true);
    
    try {
      console.log('🔄 Starting appointment creation process...');
      console.log('📋 User data:', {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone
      });
      console.log('📋 Booking data:', state.bookingData);
      // Validation 11: Final data integrity check before creating appointment
      const requiredFields = ['branchId', 'date', 'time'];
      const missingFields = requiredFields.filter(field => !state.bookingData[field as keyof typeof state.bookingData]);
      
      if (missingFields.length > 0) {
        Alert.alert('Missing Required Information', `Please complete: ${missingFields.join(', ')}`);
        return;
      }

      // Validation 12: Check if appointment time is in the future
      const appointmentDateTime = new Date(`${state.bookingData.date}T${state.bookingData.time}`);
      const now = new Date();
      
      if (appointmentDateTime <= now) {
        Alert.alert('Invalid Appointment Time', 'Please select a future date and time for your appointment.');
        return;
      }

      // Validation 13: Check if appointment is within business hours (optional - can be customized)
      const appointmentHour = appointmentDateTime.getHours();
      if (appointmentHour < 8 || appointmentHour > 20) {
        Alert.alert('Outside Business Hours', 'Please select a time between 8:00 AM and 8:00 PM.');
        return;
      }

      // Validation 14: Ensure date and time are in correct format for appointments collection
      const appointmentDate = state.bookingData.date || '';
      const appointmentTime = state.bookingData.time || '';
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(appointmentDate)) {
        Alert.alert('Invalid Date Format', 'Appointment date must be in YYYY-MM-DD format.');
        return;
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^\d{2}:\d{2}$/;
      if (!timeRegex.test(appointmentTime)) {
        Alert.alert('Invalid Time Format', 'Appointment time must be in HH:MM format.');
        return;
      }

      // Prepare appointment data to match your normalized database structure
      // Handle multiple services with their assigned stylists
      const serviceStylistPairs = state.bookingData.selectedServices?.map(service => {
        const stylist = state.bookingData.selectedStylists?.[service.id];
        // Use servicePricing for accurate pricing, fallback to service.price
        const servicePrice = servicePricing[service.id] || service.price || 0;
        return {
          serviceId: service.id,
          serviceName: service.name,
          servicePrice: servicePrice,
          stylistId: stylist?.id || state.bookingData.stylistId || '',
          stylistName: stylist ? `${stylist.firstName} ${stylist.lastName}` : state.bookingData.stylistName || ''
        };
      }) || [];

      // If single service (fallback), create serviceStylistPairs array
      if (serviceStylistPairs.length === 0 && state.bookingData.serviceId) {
        // Use servicePricing for accurate pricing, fallback to servicePrice
        const servicePrice = servicePricing[state.bookingData.serviceId] || state.bookingData.servicePrice || 0;
        serviceStylistPairs.push({
          serviceId: state.bookingData.serviceId,
          serviceName: state.bookingData.serviceName || 'Service',
          servicePrice: servicePrice,
          stylistId: state.bookingData.stylistId || '',
          stylistName: state.bookingData.stylistName || ''
        });
      }

      const appointmentData = {
        // Core appointment fields - exact match with appointments collection
        appointmentDate: state.bookingData.date || '', // string: 'YYYY-MM-DD' format
        appointmentTime: state.bookingData.time || '', // string: 'HH:MM' format (24-hour)
        branchId: state.bookingData.branchId || '', // string: unique identifier for branch
        clientEmail: user?.email || '', // string: client's email address
        clientId: user?.id || '', // string: unique user ID of the client
        clientName: user?.name || 'Client', // string: full name of the client
        clientPhone: user?.phone || '', // string: client's contact phone number
        createdBy: user?.id || '', // string: user ID who created the appointment
        notes: notes || '', // string: general instructions or comments
        status: "pending", // string: current state of the booking
        totalPrice: getTotalPrice(), // number: sum of all service prices
        
        // Complex fields - exact match with appointments collection
        history: [{
          action: "created", // string: type of change performed
          by: user?.id || '', // string: user ID who executed the action
          notes: "Appointment created", // string: description providing context
          timestamp: new Date().toISOString() // string: specific time the action was logged
        }],
        
        serviceStylistPairs: serviceStylistPairs.map(pair => ({
          serviceId: pair.serviceId, // string: unique ID of the service
          serviceName: pair.serviceName, // string: full name of the service
          servicePrice: pair.servicePrice, // number: cost of this specific service
          stylistId: pair.stylistId, // string: unique user ID of assigned staff
          stylistName: pair.stylistName // string: full name of assigned staff
        }))
        
        // Note: createdAt and updatedAt will be handled by the service using serverTimestamp()
      };

      // Validation 15: Final appointment data validation
      if (!appointmentData.serviceStylistPairs || appointmentData.serviceStylistPairs.length === 0) {
        Alert.alert('No Services', 'No services selected for this appointment.');
        return;
      }

      if (!appointmentData.serviceStylistPairs[0]?.stylistId) {
        Alert.alert('No Stylist', 'No stylist assigned to this appointment.');
        return;
      }

      // Validation 16: Ensure each service has a stylist assigned
      const servicesWithoutStylists = serviceStylistPairs.filter(pair => !pair.stylistId);
      if (servicesWithoutStylists.length > 0) {
        Alert.alert('Stylist Assignment Required', 'All services must have a stylist assigned.');
        return;
      }

      // Log the final appointment data before creation
      console.log('📋 Final appointment data to be created:', appointmentData);
      console.log('📋 Appointment fields validation:');
      console.log('  - appointmentDate:', appointmentData.appointmentDate, '(string, YYYY-MM-DD)');
      console.log('  - appointmentTime:', appointmentData.appointmentTime, '(string, HH:MM)');
      console.log('  - branchId:', appointmentData.branchId, '(string)');
      console.log('  - clientEmail:', appointmentData.clientEmail, '(string)');
      console.log('  - clientId:', appointmentData.clientId, '(string)');
      console.log('  - clientName:', appointmentData.clientName, '(string)');
      console.log('  - clientPhone:', appointmentData.clientPhone, '(string)');
      console.log('  - createdBy:', appointmentData.createdBy, '(string)');
      console.log('  - notes:', appointmentData.notes, '(string)');
      console.log('  - status:', appointmentData.status, '(string)');
      console.log('  - totalPrice:', appointmentData.totalPrice, '(number)');
      console.log('  - serviceStylistPairs count:', appointmentData.serviceStylistPairs.length);
      console.log('  - history count:', appointmentData.history.length);
      
      // Create appointment
      const appointmentId = await MobileAppointmentService.createAppointment(appointmentData);
      
      console.log('✅ Appointment created successfully with ID:', appointmentId);
      
      Alert.alert(
        'Appointment Booked Successfully!',
        `Your appointment has been confirmed for ${state.bookingData.date} at ${state.bookingData.time}.`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              resetBooking(); // Clear booking context
              // Navigate back to the main screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' as never }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error creating appointment:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          Alert.alert('Network Error', 'Please check your internet connection and try again.');
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          Alert.alert('Permission Denied', 'You do not have permission to create this appointment. Please log in again.');
        } else if (error.message.includes('conflict') || error.message.includes('duplicate')) {
          Alert.alert('Appointment Conflict', 'There may be a scheduling conflict. Please try a different time.');
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
          Alert.alert('Invalid Data', 'Some appointment information is invalid. Please go back and check your selections.');
        } else if (error.message.includes('FirebaseError') || error.message.includes('firestore')) {
          Alert.alert('Database Error', 'There was an issue saving your appointment. Please try again.');
        } else {
          Alert.alert('Booking Error', `Failed to book appointment: ${error.message}`);
        }
      } else {
        Alert.alert('Unknown Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    setNotesError(null);
    
    // Validation: Check notes length
    if (text.length > 500) {
      setNotesError('Notes cannot exceed 500 characters');
    } else if (text.trim().length === 0 && text.length > 0) {
      setNotesError('Notes cannot contain only spaces');
    } else {
      setNotesError(null);
    }
  };

  const handlePrevious = () => {
    navigation.goBack();
  };


  // For web, render with ResponsiveLayout to include sidebar
  if (Platform.OS === 'web') {
    return (
      <ResponsiveLayout currentScreen="Booking">
        <View style={styles.webContainer}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Select Branch</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Date & Time</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Services & Stylist</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, styles.activeStep]}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <Text style={styles.stepLabel}>Summary</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review & Confirm</Text>
          <Text style={styles.sectionSubtitle}>Review your appointment details before confirming</Text>
          
          <View style={styles.summaryCard}>
            {/* Client Information */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Client Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{user?.name || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>Not provided</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Birthday</Text>
                  <Text style={styles.infoValue}>Not provided</Text>
                </View>
              </View>
            </View>

            {/* Appointment Details */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Appointment Details</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Branch</Text>
                  <Text style={styles.infoValue}>{state.bookingData.branchName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{formatDate(state.bookingData.date || '')}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{formatTime(state.bookingData.time || '')}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{getTotalDuration()} minutes</Text>
                </View>
              </View>
            </View>

            {/* Services & Stylists */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Services & Stylists</Text>
              <View style={styles.servicesList}>
                {state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0 ? (
                  // Display all selected services
                  state.bookingData.selectedServices.map((service, index) => {
                    const stylist = state.bookingData.selectedStylists?.[service.id];
                    return (
                      <View key={service.id} style={styles.serviceItem}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                          <Text style={styles.serviceCategory}>{service.category}</Text>
                          <Text style={styles.serviceDuration}>{service.duration} min</Text>
                        </View>
                        <View style={styles.serviceDetails}>
                          <Text style={styles.stylistName}>
                            with {stylist?.name || 'No stylist assigned'}
                          </Text>
                          <Text style={styles.servicePrice}>₱{servicePricing[service.id] || service.price}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  // Fallback to single service display
                  <View style={styles.serviceItem}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{state.bookingData.serviceName}</Text>
                      <Text style={styles.serviceCategory}>General</Text>
                      <Text style={styles.serviceDuration}>{state.bookingData.serviceDuration} min</Text>
                    </View>
                    <View style={styles.serviceDetails}>
                      <Text style={styles.stylistName}>
                        with {state.bookingData.stylistName || 'No stylist assigned'}
                      </Text>
                      <Text style={styles.servicePrice}>₱{state.bookingData.servicePrice}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionHeader}>Additional Notes</Text>
              <TextInput
                style={[styles.notesInput, notesError && styles.notesInputError]}
                value={notes}
                onChangeText={handleNotesChange}
                placeholder="Add any special requests or notes for your appointment..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {notesError && (
                <Text style={styles.notesErrorText}>{notesError}</Text>
              )}
              <Text style={styles.notesCharCount}>{notes.length}/500 characters</Text>
            </View>

            {/* Total Cost */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <View style={styles.totalLabelContainer}>
                  <Text style={styles.totalLabel}>Total Price</Text>
                  <View style={styles.estimateBadge}>
                    <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
                  </View>
                </View>
                <Text style={styles.totalValue}>₱{getTotalPrice()}</Text>
              </View>
              <Text style={styles.totalNote}>* Final cost may vary based on service complexity and additional requirements</Text>
            </View>
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={styles.previousButton}
            onPress={handlePrevious}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.previousButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.createButton, isCreating && styles.disabledButton]}
            onPress={handleCreateAppointment}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.createButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Book Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </ResponsiveLayout>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <ScreenWrapper title="Book Appointment" scrollable={false}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Select Branch</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Date & Time</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Services & Stylist</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <View style={[styles.stepCircle, styles.activeStep]}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <Text style={styles.stepLabel}>Summary</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Review & Confirm</Text>
          <Text style={styles.sectionSubtitle}>Review your appointment details before confirming</Text>
          
          <View style={styles.summaryCard}>
            {/* Client Information */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Client Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{user?.name || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Gender</Text>
                  <Text style={styles.infoValue}>Not provided</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Birthday</Text>
                  <Text style={styles.infoValue}>Not provided</Text>
                </View>
              </View>
            </View>

            {/* Appointment Details */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Appointment Details</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Branch</Text>
                  <Text style={styles.infoValue}>{state.bookingData.branchName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>{formatDate(state.bookingData.date || '')}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>{formatTime(state.bookingData.time || '')}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{getTotalDuration()} minutes</Text>
                </View>
              </View>
            </View>

            {/* Services & Stylists */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeader}>Services & Stylists</Text>
              <View style={styles.servicesList}>
                {state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0 ? (
                  // Display all selected services
                  state.bookingData.selectedServices.map((service, index) => {
                    const stylist = state.bookingData.selectedStylists?.[service.id];
                    return (
                      <View key={service.id} style={styles.serviceItem}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{service.name}</Text>
                          <Text style={styles.serviceCategory}>{service.category}</Text>
                          <Text style={styles.serviceDuration}>{service.duration} min</Text>
                        </View>
                        <View style={styles.serviceDetails}>
                          <Text style={styles.stylistName}>
                            with {stylist?.name || 'No stylist assigned'}
                          </Text>
                          <Text style={styles.servicePrice}>₱{servicePricing[service.id] || service.price}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  // Fallback to single service display
                  <View style={styles.serviceItem}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{state.bookingData.serviceName}</Text>
                      <Text style={styles.serviceCategory}>General</Text>
                      <Text style={styles.serviceDuration}>{state.bookingData.serviceDuration} min</Text>
                    </View>
                    <View style={styles.serviceDetails}>
                      <Text style={styles.stylistName}>
                        with {state.bookingData.stylistName || 'No stylist assigned'}
                      </Text>
                      <Text style={styles.servicePrice}>₱{state.bookingData.servicePrice}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Notes Section */}
            <View style={styles.notesSection}>
              <Text style={styles.sectionHeader}>Additional Notes</Text>
              <TextInput
                style={[styles.notesInput, notesError && styles.notesInputError]}
                value={notes}
                onChangeText={handleNotesChange}
                placeholder="Add any special requests or notes for your appointment..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {notesError && (
                <Text style={styles.notesErrorText}>{notesError}</Text>
              )}
              <Text style={styles.notesCharCount}>{notes.length}/500 characters</Text>
            </View>

            {/* Total Cost */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <View style={styles.totalLabelContainer}>
                  <Text style={styles.totalLabel}>Total Price</Text>
                  <View style={styles.estimateBadge}>
                    <Text style={styles.estimateBadgeText}>ESTIMATE</Text>
                  </View>
                </View>
                <Text style={styles.totalValue}>₱{getTotalPrice()}</Text>
              </View>
              <Text style={styles.totalNote}>* Final cost may vary based on service complexity and additional requirements</Text>
            </View>
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity 
            style={styles.previousButton}
            onPress={handlePrevious}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.previousButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.createButton, isCreating && styles.disabledButton]}
            onPress={handleCreateAppointment}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.createButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Book Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={32} color={APP_CONFIG.primaryColor} />
              <Text style={styles.modalTitle}>Confirm Appointment</Text>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                Please review your appointment details before confirming:
              </Text>
              
              {/* Appointment Summary Card */}
              <View style={styles.appointmentSummaryCard}>
                {/* Date & Time Section */}
                <View style={styles.summarySection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="calendar-outline" size={20} color={APP_CONFIG.primaryColor} />
                    <Text style={styles.sectionTitle}>Appointment Details</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{formatDate(state.bookingData.date || '')}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{formatTime(state.bookingData.time || '')}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Branch</Text>
                    <Text style={styles.detailValue}>
                      {state.bookingData.branchName || getBranchName(state.bookingData.branchId)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{getTotalDuration()} minutes</Text>
                  </View>
                </View>

                {/* Services & Stylists Section */}
                <View style={styles.summarySection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="cut-outline" size={20} color={APP_CONFIG.primaryColor} />
                    <Text style={styles.sectionTitle}>Services & Stylists</Text>
                  </View>
                  {state.bookingData.selectedServices && state.bookingData.selectedServices.length > 0 ? (
                    state.bookingData.selectedServices.map((service, index) => {
                      const stylist = state.bookingData.selectedStylists?.[service.id];
                      const servicePrice = servicePricing[service.id] || service.price || 0;
                      return (
                        <View key={service.id} style={styles.serviceItem}>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceName}>{service.name}</Text>
                            <Text style={styles.serviceCategory}>{service.category}</Text>
                            <Text style={styles.serviceDuration}>{service.duration} min</Text>
                          </View>
                          <View style={styles.serviceDetails}>
                            <Text style={styles.stylistName}>
                              Stylist: {stylist ? `${stylist.firstName} ${stylist.lastName}` : 'Not assigned'}
                            </Text>
                            <Text style={styles.servicePrice}>₱{servicePrice}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{state.bookingData.serviceName}</Text>
                        <Text style={styles.serviceCategory}>General</Text>
                        <Text style={styles.serviceDuration}>{state.bookingData.serviceDuration} min</Text>
                      </View>
                      <View style={styles.serviceDetails}>
                        <Text style={styles.stylistName}>
                          Stylist: {state.bookingData.stylistName || 'Not assigned'}
                        </Text>
                        <Text style={styles.servicePrice}>₱{state.bookingData.servicePrice}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Notes Section */}
                {notes && (
                  <View style={styles.summarySection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="document-text-outline" size={20} color={APP_CONFIG.primaryColor} />
                      <Text style={styles.sectionTitle}>Special Notes</Text>
                    </View>
                    <Text style={styles.notesText}>{notes}</Text>
                  </View>
                )}

                {/* Total Price Section */}
                <View style={styles.totalSection}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₱{getTotalPrice()}</Text>
                  </View>
                  <Text style={styles.totalNote}>* Final cost may vary based on service complexity</Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, isCreating && styles.disabledButton]}
                onPress={handleConfirmAppointment}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Creating...</Text>
                  </>
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: '100%',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingTop: Platform.OS === 'web' ? 0 : Platform.OS === 'android' ? 30 : 20,
    flexWrap: 'wrap',
    minHeight: Platform.OS === 'android' ? 60 : 70,
  },
  progressStep: {
    alignItems: 'center',
    minWidth: Platform.OS === 'android' ? 50 : 55,
    justifyContent: 'center',
  },
  stepCircle: {
    width: Platform.OS === 'web' ? 40 : Platform.OS === 'ios' ? 32 : 36,
    height: Platform.OS === 'web' ? 40 : Platform.OS === 'ios' ? 32 : 36,
    borderRadius: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 16 : 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  activeStep: {
    backgroundColor: APP_CONFIG.primaryColor,
  },
  stepNumber: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  stepLabel: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#666',
    textAlign: 'center',
    maxWidth: Platform.OS === 'android' ? 50 : 55,
    marginTop: 2,
  },
  progressLine: {
    width: Platform.OS === 'web' ? 60 : Platform.OS === 'android' ? 30 : 35,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Platform.OS === 'web' ? 8 : Platform.OS === 'android' ? 2 : 3,
    marginTop: Platform.OS === 'web' ? -20 : Platform.OS === 'android' ? -16 : -14,
    alignSelf: 'center',
  },
  section: {
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    marginBottom: 24,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#666',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Platform.OS === 'android' ? 20 : Platform.OS === 'ios' ? 22 : 24,
    shadowColor: Platform.OS === 'web' ? '#000000' : '#000',
    shadowOffset: Platform.OS === 'web' ? { width: 0, height: 2 } : { width: 0, height: 2 },
    shadowOpacity: Platform.OS === 'web' ? 0.25 : 0.1,
    shadowRadius: Platform.OS === 'web' ? 15 : 8,
    elevation: Platform.OS === 'web' ? 0 : 3,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    ...TYPOGRAPHY_STYLES.sectionTitle,
    color: '#1F2937',
    marginLeft: 8,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#160B53',
    flex: 1,
    textAlign: 'right',
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceInfo: {
    marginBottom: 8,
  },
  serviceName: {
    ...TYPOGRAPHY_STYLES.body,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceCategory: {
    ...TYPOGRAPHY_STYLES.label,
    color: APP_CONFIG.primaryColor,
    marginBottom: 2,
  },
  serviceDuration: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#6B7280',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stylistName: {
    ...TYPOGRAPHY_STYLES.caption,
    fontFamily: FONTS.medium,
    color: '#10B981',
    flex: 1,
  },
  servicePrice: {
    ...TYPOGRAPHY_STYLES.body,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
    marginLeft: 8,
  },
  notesSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
  },
  notesText: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: APP_CONFIG.primaryColor,
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    ...TYPOGRAPHY_STYLES.subheader,
    color: '#1F2937',
  },
  estimateBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  estimateBadgeText: {
    ...TYPOGRAPHY_STYLES.tiny,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  totalValue: {
    ...TYPOGRAPHY_STYLES.header,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
  },
  totalNote: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    paddingVertical: Platform.OS === 'web' ? 20 : 16,
    gap: Platform.OS === 'web' ? 0 : 12,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  previousButtonText: {
    ...TYPOGRAPHY_STYLES.sectionTitle,
    fontFamily: FONTS.medium,
    color: '#666',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: APP_CONFIG.primaryColor,
    gap: 8,
  },
  createButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  notesInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  notesErrorText: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#EF4444',
    marginTop: 4,
  },
  notesCharCount: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
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
    paddingHorizontal: 20,
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...TYPOGRAPHY_STYLES.header,
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: 20,
    maxHeight: 400,
  },
  modalText: {
    ...TYPOGRAPHY_STYLES.sectionTitle,
    fontFamily: FONTS.medium,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  appointmentDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    ...TYPOGRAPHY_STYLES.bodySmall,
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: APP_CONFIG.primaryColor,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  confirmButtonText: {
    ...TYPOGRAPHY_STYLES.button,
    color: '#FFFFFF',
  },
  serviceStylistList: {
    marginTop: 8,
  },
  serviceStylistItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  serviceStylistItem: {
    ...TYPOGRAPHY_STYLES.label,
    color: '#374151',
    flex: 1,
    lineHeight: 16,
  },
  serviceStylistPrice: {
    ...TYPOGRAPHY_STYLES.label,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
    marginLeft: 8,
  },
  // New modal styles for better layout
  appointmentSummaryCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summarySection: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});
