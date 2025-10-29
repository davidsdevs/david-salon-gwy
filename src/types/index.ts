// Navigation types
export type RootStackParamList = {
  Root: undefined;
  Onboarding: undefined;
  Login: undefined;
  LoginPage: undefined;
  Register: undefined;
  Main: undefined;
  MainTabs: undefined;
  StylistTabs: undefined;
  Booking: undefined;
  Notifications: undefined;
  StylistNotifications: undefined;
  Settings: undefined;
  StylistProfile: undefined;
  StylistEditProfile: undefined;
  StylistChangePassword: undefined;
  StylistClientDetails: { client: any };
  ProductDetails: { product: Product };
  AppointmentDetails: { appointment: Appointment };
  TransactionDetails: { appointment: Appointment };
  EditProfile: undefined;
  TransactionHistory: undefined;
  NotificationSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Appointments: undefined;
  Products: undefined;
  Rewards: undefined;
  Profile: undefined;
};

export type StylistTabParamList = {
  StylistDashboard: undefined;
  StylistAppointments: undefined;
  StylistClients: undefined;
  StylistSchedule: undefined;
  StylistPortfolio: undefined;
};

export type BookingStackParamList = {
  BranchSelection: undefined;
  DateTimeSelection: { branchId: number };
  ServiceStylistSelection: { 
    branchId: number; 
    selectedDate: string; 
    selectedTime: string; 
  };
  BookingSummary: { 
    branchId: number; 
    selectedDate: string; 
    selectedTime: string; 
    selectedServices: any[]; 
    selectedStylists: { [serviceId: number]: any }; 
  };
};

// Screen props
export interface ScreenProps {
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
}

// User types
export interface User {
  id: string;
  uid?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  profileImage?: string;
  userType?: 'client' | 'stylist' | 'admin';
  isActive?: boolean;
  membershipLevel?: 'Gold' | 'Platinum' | 'Silver';
  points?: number;
  memberSince?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Appointment types
export interface Appointment {
  id: string | number;
  service?: string;
  stylist?: string;
  date?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  duration?: number | string;
  location?: string;
  status?: 'confirmed' | 'pending' | 'cancelled' | 'scheduled' | 'completed' | 'in_progress' | 'no_show' | 'pending_reschedule';
  // Additional compatibility fields
  price?: number | string;
  client?: string;
  clientType?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  supplier: string;
  imageUrl: string;
  otcPrice: number;
  salonUsePrice: number;
  unitCost: number;
  upc: string;
  shelfLife: string;
  variants: string;
  status: string;
  branches: string[];
  createdAt: string;
  updatedAt: string;
}

// Reward types
export interface Reward {
  id: number;
  title: string;
  description: string;
  points: string;
  buttonText: string;
  buttonStyle: 'filled' | 'outline' | 'disabled';
  available: boolean;
}

export interface Promotion {
  id: number;
  title: string;
  description: string;
  validUntil: string;
  discount: string;
  buttonText: string;
  buttonStyle: 'outline';
}
