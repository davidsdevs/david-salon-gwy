import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AppointmentService from '../services/appointmentService';
import { useAuth } from '../hooks/redux';

export default function AppointmentRestrictionTest() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<string>('');

  const testAppointmentRestriction = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    try {
      setTestResult('Testing...');
      
      // First, get all appointments for debugging
      const allAppointments = await AppointmentService.getAllClientAppointments(user.id);
      console.log('All appointments:', allAppointments);
      
      const hasActive = await AppointmentService.hasActiveAppointments(user.id);
      
      const resultText = hasActive 
        ? `❌ BLOCKED: User has active appointments (${allAppointments.length} total)`
        : `✅ ALLOWED: User can book new appointment (${allAppointments.length} total)`;
      
      setTestResult(resultText);
      
      Alert.alert(
        'Test Result',
        `Total appointments: ${allAppointments.length}\n` +
        `Active appointments: ${hasActive ? 'Yes' : 'No'}\n\n` +
        `Appointments:\n${allAppointments.map(apt => `- ${apt.status} (${apt.date})`).join('\n')}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      setTestResult('❌ ERROR: ' + error.message);
      Alert.alert('Error', 'Test failed: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Appointment Restriction Test</Text>
      <Text style={styles.subtitle}>User ID: {user?.id || 'Not logged in'}</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={testAppointmentRestriction}>
        <Text style={styles.testButtonText}>Test Restriction</Text>
      </TouchableOpacity>
      
      {testResult ? (
        <Text style={styles.resultText}>{testResult}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#160B53',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#160B53',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
