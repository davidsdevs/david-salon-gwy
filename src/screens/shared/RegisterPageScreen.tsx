import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/redux';
import { FONTS } from '../../constants';
import FirebaseAuthService from '../../services/firebaseAuthService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../config/firebase';
import { auth } from '../../config/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { uploadImageToCloudinary } from '../../utils/configCloudinary';

// Import logo
const logoImage = require('../../../assets/logo.png');

const { width } = Dimensions.get('window');

// Cloudinary handled via utils/configCloudinary

interface RegistrationData {
  // Basic Information
  firstName: string;
  middleName: string;
  lastName: string;
  address: string;
  imageUrl: string;
  
  // Contacts
  email: string;
  phone: string;
  
  // Account Security
  password: string;
  confirmPassword: string;
  
  // Terms and Conditions
  acceptTerms: boolean;
}

export default function RegisterPageScreen() {
  const navigation = useNavigation();
  const { isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState<RegistrationData>({
    firstName: '',
    middleName: '',
    lastName: '',
    address: '',
    imageUrl: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const steps = [
    { id: 1, title: 'Basic Information', icon: 'person' },
    { id: 2, title: 'Contacts', icon: 'call' },
    { id: 3, title: 'Account Security', icon: 'shield-checkmark' },
  ];

  const updateFormData = (field: keyof RegistrationData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const uploadToCloudinary = async (imageUri: string): Promise<string> => uploadImageToCloudinary(imageUri);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Show loading state
        setLoading(true);
        
        try {
          // Upload to Cloudinary
          const cloudinaryUrl = await uploadToCloudinary(result.assets[0].uri);
          
          // Update form data with Cloudinary URL
          updateFormData('imageUrl', cloudinaryUrl);
          
          Alert.alert('Success', 'Profile picture uploaded successfully!');
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setLoading(false);
    }
  };

  const removeImage = () => {
    updateFormData('imageUrl', '');
  };


  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Basic Information
        if (!formData.firstName || !formData.firstName.trim()) {
          Alert.alert('Validation Error', 'First name is required');
          return false;
        }
        if (!formData.lastName || !formData.lastName.trim()) {
          Alert.alert('Validation Error', 'Last name is required');
          return false;
        }
        if (!formData.address || !formData.address.trim()) {
          Alert.alert('Validation Error', 'Address is required');
          return false;
        }
        return true;
        
      case 2: // Contacts
        if (!formData.email || !formData.email.trim()) {
          Alert.alert('Validation Error', 'Email is required');
          return false;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
          Alert.alert('Validation Error', 'Please enter a valid email address');
          return false;
        }
        if (!formData.phone || !formData.phone.trim()) {
          Alert.alert('Validation Error', 'Phone number is required');
          return false;
        }
        if (formData.phone.length < 10) {
          Alert.alert('Validation Error', 'Please enter a valid phone number');
          return false;
        }
        return true;
        
      case 3: // Account Security
        if (!formData.password) {
          Alert.alert('Validation Error', 'Password is required');
          return false;
        }
        if (formData.password.length < 6) {
          Alert.alert('Validation Error', 'Password must be at least 6 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          Alert.alert('Validation Error', 'Passwords do not match');
          return false;
        }
        if (!formData.acceptTerms) {
          Alert.alert('Validation Error', 'You must accept the terms and conditions');
          return false;
        }
        return true;
        
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegister();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep(3)) return;

    try {
      setLoading(true);
      
      // Create user account with Firebase Auth
      const userCredential = await FirebaseAuthService.register({
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        userType: 'client'
      });
      
      if (userCredential?.user) {
        const uid = userCredential.user.uid;
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        
        // Create user document in Firestore - matching users collection schema exactly
        const userData = {
          uid: uid,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          middleName: formData.middleName.trim() || '', // Empty string if not provided
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          imageURL: formData.imageUrl || '',
          isActive: false, // per provided schema example
          branchId: null, // Null for clients as per schema
          roles: ['client'], // Array of roles as per schema - default to client
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          deletedAt: null,
        };
        
        // Ensure no undefined values
        const cleanUserData = Object.fromEntries(
          Object.entries(userData).filter(([_, value]) => value !== undefined)
        );
        
        await setDoc(doc(db, COLLECTIONS.USERS, uid), cleanUserData);
        
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully! Please check your email and verify your account before logging in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login' as never),
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase errors
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already registered. Please use a different email.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters long.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage = error.message || errorMessage;
        }
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step.id ? styles.stepCircleActive : styles.stepCircleInactive,
            ]}
          >
            <Ionicons
              name={step.icon as any}
              size={20}
              color={currentStep >= step.id ? '#FFFFFF' : '#999999'}
            />
          </View>
          <Text
            style={[
              styles.stepTitle,
              currentStep >= step.id ? styles.stepTitleActive : styles.stepTitleInactive,
            ]}
          >
            {step.title}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBasicInformation = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      <Text style={styles.sectionSubtitle}>Tell us about yourself</Text>
      
      {/* Profile Picture Upload */}
      <View style={styles.imageUploadContainer}>
        <Text style={styles.inputLabel}>Profile Picture</Text>
        <View style={styles.imageUploadWrapper}>
          {loading ? (
            <View style={styles.imageUploadButton}>
              <ActivityIndicator size="large" color="#160B53" />
              <Text style={styles.imageUploadText}>Uploading...</Text>
            </View>
          ) : formData.imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: formData.imageUrl }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                <Ionicons name="close-circle" size={24} color="#FF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#160B53" />
              <Text style={styles.imageUploadText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>First Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your first name"
          value={formData.firstName}
          onChangeText={(text) => updateFormData('firstName', text)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Middle Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your middle name (optional)"
          value={formData.middleName}
          onChangeText={(text) => updateFormData('middleName', text)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Last Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your last name"
          value={formData.lastName}
          onChangeText={(text) => updateFormData('lastName', text)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Address *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter your complete address"
          value={formData.address}
          onChangeText={(text) => updateFormData('address', text)}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderContacts = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.sectionTitle}>Contact Information</Text>
      <Text style={styles.sectionSubtitle}>How can we reach you?</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="mail" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIconText}
            placeholder="Enter your email address"
            value={formData.email}
            onChangeText={(text) => updateFormData('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="call" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIconText}
            placeholder="Enter your phone number"
            value={formData.phone}
            onChangeText={(text) => updateFormData('phone', text)}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </View>
  );

  const renderAccountSecurity = () => (
    <View style={styles.stepContentContainer}>
      <Text style={styles.sectionTitle}>Account Security</Text>
      <Text style={styles.sectionSubtitle}>Create a secure password</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIconText}
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => updateFormData('password', text)}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password *</Text>
        <View style={styles.inputWithIcon}>
          <Ionicons name="lock-closed" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.inputWithIconText}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData('confirmPassword', text)}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showConfirmPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
        </View>
      </View>

       <View style={styles.termsContainer}>
         <TouchableOpacity
           style={styles.checkboxContainer}
           onPress={() => updateFormData('acceptTerms', !formData.acceptTerms)}
         >
           <View style={[styles.checkbox, formData.acceptTerms && styles.checkboxChecked]}>
             {formData.acceptTerms && (
               <Ionicons name="checkmark" size={16} color="#FFFFFF" />
             )}
           </View>
           <Text style={styles.termsText}>
             I agree to the{' '}
             <Text style={styles.termsLink}>Terms and Conditions</Text>
             {' '}and{' '}
             <Text style={styles.termsLink}>Privacy Policy</Text>
           </Text>
         </TouchableOpacity>
       </View>

    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInformation();
      case 2:
        return renderContacts();
      case 3:
        return renderAccountSecurity();
      default:
        return renderBasicInformation();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={logoImage} style={styles.logo} />
        </View>

        {/* Registration Form Card */}
        <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us today and book your appointments</Text>

        {renderStepIndicator()}

        {renderCurrentStep()}

         <View style={styles.buttonContainer}>
         {currentStep > 1 && (
           <TouchableOpacity style={styles.backButton} onPress={prevStep}>
             <Ionicons name="arrow-back" size={20} color="#160B53" />
             <Text style={styles.backButtonText}>Back</Text>
           </TouchableOpacity>
         )}
         
         <TouchableOpacity
           style={[styles.nextButton, loading && styles.nextButtonDisabled]}
           onPress={nextStep}
           disabled={loading}
         >
           {loading ? (
             <ActivityIndicator color="#FFFFFF" />
           ) : (
             <>
               <Text style={styles.nextButtonText}>
                 {currentStep === 3 ? 'Create Account' : 'Next'}
               </Text>
               <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
             </>
           )}
         </TouchableOpacity>
         </View>

         {/* Sign In Link - Inside Card (only show on step 1) */}
         {currentStep === 1 && (
           <View style={styles.registerContainer}>
             <Text style={styles.registerText}>Already have an account? </Text>
             <TouchableOpacity onPress={() => navigation.navigate('Login' as never)}>
               <Text style={styles.registerLink}>Sign In</Text>
             </TouchableOpacity>
           </View>
         )}
       </View>

         {/* Terms of Service - Outside Card */}
         <Text style={styles.legalText}>
           By creating an account, you agree to our{' '}
           <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
           <Text style={styles.legalLink}>Privacy Policy</Text>
         </Text>
       </ScrollView>
     </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 80 : 60,
    paddingBottom: Platform.OS === 'ios' ? 100 : 30,
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 75,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: Platform.OS === 'android' ? 20 : Platform.OS === 'ios' ? 22 : 24,
    color: '#160B53',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: FONTS.regular,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    marginBottom: 30,
    width: '100%',
  },
  stepContainer: {
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 8,
    minWidth: 60,
  },
  stepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#160B53',
  },
  stepCircleInactive: {
    backgroundColor: '#F0F0F0',
  },
  stepTitle: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
    lineHeight: 12,
  },
  stepTitleActive: {
    color: '#160B53',
  },
  stepTitleInactive: {
    color: '#999999',
  },
  stepLine: {
    position: 'absolute',
    top: 25,
    left: 50,
    width: 24,
    height: 2,
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#160B53',
  },
  stepLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepContentContainer: {
    // Plain container with no design - just holds the form content
  },
  sectionTitle: {
    fontSize: Platform.OS === 'android' ? 18 : Platform.OS === 'ios' ? 20 : 22,
    fontFamily: FONTS.bold,
    color: '#160B53',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    fontFamily: FONTS.regular,
    color: '#666666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#160B53',
    marginBottom: 8,
    fontFamily: FONTS.semiBold,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    fontSize: Platform.OS === 'android' ? 14 : Platform.OS === 'ios' ? 15 : 16,
    fontFamily: FONTS.regular,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  inputWithIconText: {
    flex: 1,
    paddingVertical: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    fontSize: Platform.OS === 'android' ? 14 : Platform.OS === 'ios' ? 15 : 16,
    fontFamily: FONTS.regular,
  },
  eyeIcon: {
    padding: 16,
  },
  termsContainer: {
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#160B53',
    borderColor: '#160B53',
  },
  termsText: {
    flex: 1,
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    fontFamily: FONTS.regular,
    color: '#666666',
    lineHeight: 20,
  },
  termsLink: {
    color: '#160B53',
    fontFamily: FONTS.medium,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#160B53',
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    fontFamily: FONTS.medium,
    color: '#160B53',
    marginLeft: 8,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#160B53',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  nextButtonText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontFamily: FONTS.medium,
    color: '#FFFFFF',
    marginRight: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#666666',
    fontFamily: FONTS.regular,
  },
  registerLink: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#160B53',
    fontFamily: FONTS.semiBold,
  },
  legalText: {
    fontSize: Platform.OS === 'android' ? 10 : Platform.OS === 'ios' ? 11 : 12,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    fontFamily: FONTS.regular,
  },
  legalLink: {
    color: '#160B53',
    fontFamily: FONTS.semiBold,
  },
  imageUploadContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  imageUploadWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadText: {
    fontSize: Platform.OS === 'android' ? 12 : Platform.OS === 'ios' ? 13 : 14,
    color: '#160B53',
    fontFamily: FONTS.medium,
    marginTop: 8,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
