import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../hooks/redux';
import { APP_CONFIG, FONTS } from '../../constants';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Appointment } from '../../types/api';
import AppointmentService from '../../services/appointmentService';

interface TransactionRecord {
  id: string;
  amountReceived?: number;
  appointmentId?: string;
  branchId: string;
  change?: number;
  clientId: string;
  clientInfo?: { name?: string; email?: string; phone?: string };
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

const { width } = Dimensions.get('window');

export default function TransactionHistory() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [branchNames, setBranchNames] = useState<{ [branchId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    if (user?.id) {
      unsubscribe = setupRealtimeSubscription();
    } else {
      // Logged out or missing user: clear state and stop loading
      setTransactions([]);
      setBranchNames({});
      setLoading(false);
      setRefreshing(false);
      setError(null);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  const setupRealtimeSubscription = () => {
    if (!user?.id) {
      console.log('⚠️ No user ID available for real-time subscription');
      return;
    }

    console.log('🔄 Setting up real-time subscription for user transactions');

    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('clientId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      console.log('📡 Real-time update received for transactions:', querySnapshot.docs.length);

      const txData: TransactionRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        txData.push({
          id: docSnap.id,
          amountReceived: data['amountReceived'],
          appointmentId: data['appointmentId'],
          branchId: data['branchId'] || '',
          change: data['change'],
          clientId: data['clientId'] || '',
          clientInfo: data['clientInfo'],
          createdAt: data['createdAt'],
          createdBy: data['createdBy'],
          discount: data['discount'],
          loyaltyEarned: data['loyaltyEarned'],
          notes: data['notes'],
          paymentMethod: data['paymentMethod'],
          processedAt: data['processedAt'],
          products: data['products'] || [],
          services: data['services'] || [],
          status: data['status'],
          subtotal: data['subtotal'],
          tax: data['tax'],
          total: data['total'],
          totalAmount: data['totalAmount'],
          transactionType: data['transactionType'],
          updatedAt: data['updatedAt']
        });
      });

      setTransactions(txData);

      const uniqueBranchIds = [...new Set(txData.map(t => t.branchId).filter(Boolean))];
      if (uniqueBranchIds.length > 0) {
        console.log('🔄 Fetching branch names for transactions:', uniqueBranchIds);
        const branchNamesMap = await AppointmentService.getBranchNames(uniqueBranchIds);
        setBranchNames(prev => ({ ...prev, ...branchNamesMap }));
      }

      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('❌ Error in real-time subscription:', error);
      setError('Failed to load transactions');
      setLoading(false);
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    // The real-time subscription will handle updating the appointments
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Filter transactions based on search query and date/time filters
  const filteredTransactions = transactions.filter(tx => {
    // Search filter
    const searchMatch = searchQuery === '' || 
      tx.clientInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.clientInfo?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branchNames[tx.branchId]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.notes || '')?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.services || [])?.some(s => (s.serviceName || '')?.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date filter
    let dateMatch = true;
    if (startDate || endDate) {
      const baseDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      const appointmentDate = baseDate instanceof Date && !isNaN(baseDate as any) ? baseDate : new Date();
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateMatch = dateMatch && appointmentDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && appointmentDate <= end;
      }
    }

    // Time filter
    let timeMatch = true;
    if (startTime || endTime) {
      const appointmentTime = '';
      if (startTime) {
        timeMatch = timeMatch && appointmentTime >= startTime;
      }
      if (endTime) {
        timeMatch = timeMatch && appointmentTime <= endTime;
      }
    }

    return searchMatch && dateMatch && timeMatch;
  });

  // Sort transactions by createdAt (most recent first)
  const sortedTransactions = filteredTransactions.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return (dateB?.getTime?.() || 0) - (dateA?.getTime?.() || 0);
  });

  const handleAppointmentPress = (appointment: Appointment) => {
    (navigation as any).navigate('TransactionDetails', { appointment });
  };
  const handleTransactionPress = (transaction: TransactionRecord) => {
    (navigation as any).navigate('TransactionDetails', { transaction });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'cash-outline';
      case 'card':
        return 'card-outline';
      case 'online':
        return 'globe-outline';
      default:
        return 'wallet-outline';
    }
  };

  // For web, render without ScreenWrapper to avoid duplicate headers
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={APP_CONFIG.primaryColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transaction History</Text>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search appointments..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowDateFilter(true)}
          >
            <Ionicons name="calendar" size={20} color={APP_CONFIG.primaryColor} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : sortedTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Your transactions will appear here once recorded</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.appointmentsList}
              showsVerticalScrollIndicator={false}
            >
              {sortedTransactions.map((tx) => (
                <TouchableOpacity 
                  key={tx.id} 
                  style={styles.appointmentCard}
                  onPress={() => handleTransactionPress(tx)}
                >
                  <View style={styles.appointmentLeft}>
                    <View style={styles.appointmentIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.appointmentDetails}>
                      <Text style={styles.appointmentService}>
                        {(tx.services || []).map(s => s.serviceName).filter(Boolean).join(', ') || 'Transaction'}
                      </Text>
                      <Text style={styles.appointmentStylist}>
                        {tx.clientInfo?.name || 'Client'}
                      </Text>
                      <View style={styles.appointmentInfo}>
                        <View style={styles.appointmentInfoItem}>
                          <Ionicons name="time" size={14} color="#666" />
                          <Text style={styles.appointmentInfoText}>
                            {formatDate(tx.createdAt)}
                          </Text>
                        </View>
                        <View style={styles.appointmentInfoItem}>
                          <Ionicons name="location" size={14} color="#666" />
                          <Text style={styles.appointmentInfoText}>
                            {branchNames[tx.branchId] || `Branch ${tx.branchId}`}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.appointmentRight}>
                    <Text style={styles.priceText}>
                      ₱{(tx.total || tx.totalAmount || 0).toLocaleString()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.statusText}>{(tx.status || 'completed').toString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Date/Time Filter Modal */}
        <Modal
          visible={showDateFilter}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDateFilter(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter by Date & Time</Text>
                <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Start Date:</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>End Date:</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Start Time:</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>End Time:</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.applyButton}
                  onPress={() => setShowDateFilter(false)}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <ScreenWrapper title="Transaction History" showBackButton={true} scrollable={false}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search and Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search appointments..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowDateFilter(true)}
          >
            <Ionicons name="calendar" size={20} color={APP_CONFIG.primaryColor} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : sortedTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Your transactions will appear here once recorded</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {sortedTransactions.map((tx) => (
              <TouchableOpacity 
                key={tx.id} 
                style={styles.appointmentCard}
                onPress={() => handleTransactionPress(tx)}
              >
                <View style={styles.appointmentLeft}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentService}>
                      {(tx.services || []).map(s => s.serviceName).filter(Boolean).join(', ') || 'Transaction'}
                    </Text>
                    <Text style={styles.appointmentStylist}>
                      {tx.clientInfo?.name || 'Client'}
                    </Text>
                    <View style={styles.appointmentInfo}>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="time" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {formatDate(tx.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.appointmentInfoItem}>
                        <Ionicons name="location" size={14} color="#666" />
                        <Text style={styles.appointmentInfoText}>
                          {branchNames[tx.branchId] || `Branch ${tx.branchId}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.appointmentRight}>
                  <Text style={styles.priceText}>
                    ₱{(tx.total || tx.totalAmount || 0).toLocaleString()}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.statusText}>{(tx.status || 'completed').toString()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Date/Time Filter Modal */}
        <Modal
          visible={showDateFilter}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDateFilter(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter by Date & Time</Text>
                <TouchableOpacity onPress={() => setShowDateFilter(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Start Date:</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>End Date:</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Start Time:</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>End Time:</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.applyButton}
                  onPress={() => setShowDateFilter(false)}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
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
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_CONFIG.primaryColor,
  },
  appointmentsList: {
    paddingHorizontal: 20,
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
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#1F2937',
    marginBottom: 4,
  },
  appointmentStylist: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: '#6B7280',
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
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6B7280',
    marginLeft: 6,
  },
  appointmentRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#1F2937',
  },
  modalContent: {
    marginBottom: 20,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: '#374151',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    backgroundColor: APP_CONFIG.primaryColor,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: APP_CONFIG.primaryColor,
  },
  content: {
    flex: 1,
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
  retryButton: {
    marginTop: 16,
    backgroundColor: APP_CONFIG.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
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
  transactionsList: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: FONTS.medium,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionStatusBadgeUnused: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transactionStatusTextUnused: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    textTransform: 'capitalize',
  },
  transactionTotal: {
    fontSize: 18,
    color: APP_CONFIG.primaryColor,
    fontFamily: FONTS.bold,
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: FONTS.medium,
    marginLeft: 8,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontFamily: FONTS.regular,
    flex: 1,
  },
  servicesContainer: {
    marginTop: 8,
  },
  servicesTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: FONTS.semiBold,
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#374151',
    fontFamily: FONTS.regular,
    flex: 1,
  },
  servicePrice: {
    fontSize: 14,
    color: APP_CONFIG.primaryColor,
    fontFamily: FONTS.medium,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: FONTS.semiBold,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: FONTS.regular,
    lineHeight: 20,
  },
});

