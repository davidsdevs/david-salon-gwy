// Test script to verify notification creation
// Run this with: node test-notification.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testNotificationCreation() {
  try {
    console.log('🧪 Testing notification creation...');
    
    const notificationData = {
      title: "Appointment Confirmed",
      message: "Appointment with Gwyneth Cruz has been confirmed",
      type: "appointment_confirmed",
      appointmentId: "swrWpdq60MudH4SXvqYr",
      appointmentDate: "2025-10-28",
      appointmentTime: "12:30",
      clientName: "Gwyneth Cruz",
      stylistName: "Claire Cruz",
      branchName: "David's Salon",
      recipientRole: "stylist",
      recipientId: "4gf5AOdy4HffVillOmLu68ABgrb2",
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('📋 Notification data:', notificationData);
    
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, notificationData);
    
    console.log('✅ Notification created successfully with ID:', docRef.id);
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNotificationCreation();
