import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDoc, doc } from 'firebase/firestore';
import ScreenWrapper from '../../components/ScreenWrapper';
import { APP_CONFIG, FONTS } from '../../constants';
import { Appointment } from '../../types/api';
import { useAuth } from '../../hooks/redux';
import AppointmentService from '../../services/appointmentService';
import { db, COLLECTIONS } from '../../config/firebase';

interface TransactionRecord {
  id: string;
  amountReceived?: number;
  appointmentId?: string;
  branchId: string;
  change?: number;
  clientId: string;
  clientInfo?: { email?: string; name?: string; phone?: string };
  createdAt?: any;
  createdBy?: string;
  discount?: number;
  loyaltyEarned?: number;
  notes?: string;
  paymentMethod?: string;
  processedAt?: any;
  products?: Array<{ id?: string; name?: string; price?: number; quantity?: number; stock?: number }>;
  services?: Array<{
    adjustedPrice?: number;
    adjustmentReason?: string;
    clientType?: string;
    price?: number;
    priceAdjustment?: number;
    serviceId?: string;
    serviceName?: string;
    stylistId?: string;
    stylistName?: string;
  }>;
  status?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  totalAmount?: number;
  transactionType?: string;
  updatedAt?: any;
}

const { width, height } = Dimensions.get('window');

export default function TransactionDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { transaction } = route.params as { transaction: TransactionRecord };
  const { user } = useAuth();
  
  const [stylists, setStylists] = useState<{[key: string]: {firstName: string, lastName: string, name: string}}>({});
  const [serviceNames, setServiceNames] = useState<{ [serviceId: string]: string }>({});
  const [branchName, setBranchName] = useState<string>('');
  const [processedByName, setProcessedByName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactionDetails();
  }, [transaction]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch stylist information from users collection if services exist
      if (transaction.services && transaction.services.length > 0) {
        const stylistIds = transaction.services.map(pair => pair.stylistId).filter(Boolean) as string[];
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

      // Fetch branch name
      if (transaction.branchId) {
        try {
          const branchDoc = await getDoc(doc(db, COLLECTIONS.BRANCHES, transaction.branchId));
          if (branchDoc.exists()) {
            const branchData = branchDoc.data();
            setBranchName(branchData['name'] || branchData.name || 'Unknown Branch');
          }
        } catch (error) {
          console.error('❌ Error fetching branch name:', error);
          setBranchName('Unknown Branch');
        }
      }

      // Fetch service names
      if (transaction.services && transaction.services.length > 0) {
        const serviceIds = transaction.services.map(pair => pair.serviceId).filter(Boolean) as string[];
        const serviceMap: { [serviceId: string]: string } = {};
        
        for (const serviceId of serviceIds) {
          try {
            const serviceDoc = await getDoc(doc(db, COLLECTIONS.SERVICES, serviceId));
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data();
              serviceMap[serviceId] = serviceData['name'] || serviceData.name || 'Service';
            }
          } catch (error) {
            console.error('❌ Error fetching service name:', serviceId, error);
            serviceMap[serviceId] = 'Service';
          }
        }
        
        setServiceNames(serviceMap);
      }
      
      // Fetch processedBy (createdBy) user name if available
      if (transaction.createdBy) {
        try {
          const processedDoc = await getDoc(doc(db, COLLECTIONS.USERS, transaction.createdBy));
          if (processedDoc.exists()) {
            const data = processedDoc.data();
            const firstName = data['firstName'] || data.firstName || '';
            const lastName = data['lastName'] || data.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'Staff';
            setProcessedByName(fullName);
          }
        } catch (error) {
          setProcessedByName('Staff');
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading transaction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return 'Invalid Time';
    }
  };

  const getTotalDuration = () => {
    if (!appointment.serviceStylistPairs || appointment.serviceStylistPairs.length === 0) {
      return 0;
    }
    
    return appointment.serviceStylistPairs.reduce((total, pair) => {
      // Assuming each service has a duration field, otherwise default to 60 minutes
      return total + (pair.duration || 60);
    }, 0);
  };

  if (loading) {
    return (
      <ScreenWrapper title="Transaction Details" showBackButton={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Transaction Details" showBackButton={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Transaction Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Transaction {transaction.status || 'Completed'}</Text>
            <Text style={styles.statusSubtitle}>
              Your transaction has been successfully recorded
            </Text>
          </View>
        </View>

        {/* Transaction Summary Card */}
        <View style={styles.summaryCard}>
          {/* Core Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={20} color={APP_CONFIG.primaryColor} />
              <Text style={styles.sectionTitle}>Transaction Details</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created At</Text>
              <Text style={styles.detailValue}>{transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleString() : 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Processed At</Text>
              <Text style={styles.detailValue}>{transaction.processedAt?.toDate ? transaction.processedAt.toDate().toLocaleString() : 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Branch</Text>
              <Text style={styles.detailValue}>{branchName || 'Unknown Branch'}</Text>
            </View>
            {/* Appointment ID intentionally hidden to avoid showing raw IDs */}
          </View>

          {/* Client Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={20} color={APP_CONFIG.primaryColor} />
              <Text style={styles.sectionTitle}>Client</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{transaction.clientInfo?.name || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{transaction.clientInfo?.email || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{transaction.clientInfo?.phone || '—'}</Text>
            </View>
          </View>

          {/* Payment Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={APP_CONFIG.primaryColor} />
              <Text style={styles.sectionTitle}>Payment</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{transaction.paymentMethod || '—'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Amount Received</Text>
              <Text style={styles.detailValue}>₱{(transaction.amountReceived || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Change</Text>
              <Text style={styles.detailValue}>₱{(transaction.change || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Processed By</Text>
              <Text style={styles.detailValue}>{processedByName || '—'}</Text>
            </View>
          </View>

          {/* Services Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cut-outline" size={20} color={APP_CONFIG.primaryColor} />
              <Text style={styles.sectionTitle}>Services</Text>
            </View>
            {transaction.services && transaction.services.length > 0 ? (
              transaction.services.map((pair, index) => {
                const stylist = pair.stylistId ? stylists[pair.stylistId] : undefined;
                return (
                  <View key={index} style={styles.serviceItem}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{pair.serviceName || (pair.serviceId ? serviceNames[pair.serviceId] : 'Service') || 'Service'}</Text>
                      <Text style={styles.serviceCategory}>By {stylist ? stylist.name : pair.stylistName || 'Stylist'}</Text>
                      <Text style={styles.serviceDuration}>₱{(pair.adjustedPrice ?? pair.price ?? 0).toLocaleString()} {pair.priceAdjustment ? `• Adj ${pair.priceAdjustment > 0 ? '+' : ''}${pair.priceAdjustment}` : ''}{pair.adjustmentReason ? ` • ${pair.adjustmentReason}` : ''}</Text>
                    </View>
                    <View style={styles.serviceDetails}>
                      {/* Stylist name already shown above */}
                      <Text style={styles.servicePrice}>₱{(pair.adjustedPrice ?? pair.price ?? 0).toLocaleString()}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>Service</Text>
                  <Text style={styles.serviceCategory}>—</Text>
                </View>
                <View style={styles.serviceDetails}>
                  <Text style={styles.stylistName}>Stylist: Not assigned</Text>
                  <Text style={styles.servicePrice}>₱0</Text>
                </View>
              </View>
            )}
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetags-outline" size={20} color={APP_CONFIG.primaryColor} />
              <Text style={styles.sectionTitle}>Products</Text>
            </View>
            {transaction.products && transaction.products.length > 0 ? (
              transaction.products.map((p, idx) => (
                <View key={idx} style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{p.name || 'Product'}</Text>
                  <Text style={styles.detailValue}>₱{(p.price || 0).toLocaleString()} × {p.quantity || 0} = ₱{(((p.price || 0) * (p.quantity || 0)) || 0).toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.notesText}>No products</Text>
            )}
          </View>

          {/* Notes Section */}
          {!!transaction.notes && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color={APP_CONFIG.primaryColor} />
                <Text style={styles.sectionTitle}>Special Notes</Text>
              </View>
              <Text style={styles.notesText}>{transaction.notes}</Text>
            </View>
          )}

          {/* Totals Section */}
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>₱{(transaction.subtotal || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>₱{(transaction.discount || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>₱{(transaction.tax || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₱{(transaction.total || transaction.totalAmount || 0).toLocaleString()}</Text>
            </View>
            <Text style={styles.totalNote}>* Payment completed successfully</Text>
          </View>
        </View>
        {/* Metadata removed to avoid raw IDs; use payment processed by instead */}
      </ScrollView>
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
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#10B981',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginLeft: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  serviceItem: {
    backgroundColor: '#F8F9FA',
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
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: APP_CONFIG.primaryColor,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6B7280',
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stylistName: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#10B981',
    flex: 1,
  },
  servicePrice: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
    marginLeft: 8,
  },
  notesText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
    lineHeight: 20,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  totalSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 16,
    margin: 20,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: '#10B981',
  },
  totalNote: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyAction: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginBottom: 4,
  },
  historyNotes: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
  },
});

