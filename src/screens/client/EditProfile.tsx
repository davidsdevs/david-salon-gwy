import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../hooks/redux';
import { APP_CONFIG, FONTS } from '../../constants';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { uploadImageToCloudinary } from '../../utils/configCloudinary';

const { width } = Dimensions.get('window');

export default function EditProfile() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    address: '',
    imageURL: '',
  });

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.id));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          middleName: userData.middleName || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          imageURL: userData.imageURL || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        try {
          const url = await uploadImageToCloudinary(result.assets[0].uri);
          setFormData(prev => ({ ...prev, imageURL: url }));
          Alert.alert('Success', 'Profile picture uploaded');
        } catch (e) {
          console.error('Upload error:', e);
          Alert.alert('Upload Failed', 'Could not upload image.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        try {
          const url = await uploadImageToCloudinary(result.assets[0].uri);
          setFormData(prev => ({ ...prev, imageURL: url }));
          Alert.alert('Success', 'Profile picture uploaded');
        } catch (e) {
          console.error('Upload error:', e);
          Alert.alert('Upload Failed', 'Could not upload image.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setUploadingImage(false);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Profile Picture',
      'Choose how you want to add a profile picture',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No user ID available');
      return;
    }

    // Validation
    if (!formData.firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      Alert.alert('Validation Error', 'Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSaving(true);
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        imageURL: formData.imageURL,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Profile updated successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        {/* Content */}
        <KeyboardAvoidingView 
          style={styles.content}
          behavior="padding"
          keyboardVerticalOffset={20}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Profile Picture Section */}
              <View style={styles.profilePictureSection}>
                <View style={styles.profilePictureContainer}>
                  {formData.imageURL ? (
                    <Image source={{ uri: formData.imageURL }} style={styles.profilePicture} />
                  ) : (
                    <View style={styles.profilePicturePlaceholder}>
                      <Ionicons name="person" size={40} color="#9CA3AF" />
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.editPictureButton}
                    onPress={showImagePicker}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.profilePictureText}>Tap to change profile picture</Text>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.firstName}
                    onChangeText={(text) => updateFormData('firstName', text)}
                    placeholder="Enter first name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.lastName}
                    onChangeText={(text) => updateFormData('lastName', text)}
                    placeholder="Enter last name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Middle Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.middleName}
                    onChangeText={(text) => updateFormData('middleName', text)}
                    placeholder="Enter middle name (optional)"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.email}
                    onChangeText={(text) => updateFormData('email', text)}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.phone}
                    onChangeText={(text) => updateFormData('phone', text)}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Address</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.address}
                    onChangeText={(text) => updateFormData('address', text)}
                    placeholder="Enter complete address"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    );
  }

  // For mobile, use ScreenWrapper with header
  return (
    <ScreenWrapper title="Edit Profile" showBackButton={true}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONFIG.primaryColor} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={styles.profilePictureSection}>
              <View style={styles.profilePictureContainer}>
                {formData.imageURL ? (
                  <Image source={{ uri: formData.imageURL }} style={styles.profilePicture} />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Ionicons name="person" size={40} color="#9CA3AF" />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.editPictureButton}
                  onPress={showImagePicker}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.profilePictureText}>Tap to change profile picture</Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.firstName}
                  onChangeText={(text) => updateFormData('firstName', text)}
                  placeholder="Enter first name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.lastName}
                  onChangeText={(text) => updateFormData('lastName', text)}
                  placeholder="Enter last name"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Middle Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.middleName}
                  onChangeText={(text) => updateFormData('middleName', text)}
                  placeholder="Enter middle name (optional)"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(text) => updateFormData('email', text)}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(text) => updateFormData('phone', text)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => updateFormData('address', text)}
                  placeholder="Enter complete address"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  webContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: '100%',
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
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_CONFIG.primaryColor,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: '#374151',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: APP_CONFIG.primaryColor,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  profilePictureSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: APP_CONFIG.primaryColor,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: APP_CONFIG.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profilePictureText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    textAlign: 'center',
  },
});

