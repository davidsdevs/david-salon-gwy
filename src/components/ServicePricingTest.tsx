import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ServicePricingService from '../services/servicePricingService';

interface ServicePricingTestProps {
  branchId: string;
}

export default function ServicePricingTest({ branchId }: ServicePricingTestProps) {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runPricingTest = async () => {
    setLoading(true);
    const results: any[] = [];

    // Test the service data you provided
    const testServices = [
      {
        id: 'service_haircolor',
        name: 'Hair Coloring',
        expectedPrice: 20, // Based on your data: prices[0] = 20 for branch "KYiL9JprSX3LBOYzrF6e"
        branchId: 'KYiL9JprSX3LBOYzrF6e'
      }
    ];

    for (const service of testServices) {
      try {
        const price = await ServicePricingService.getBranchSpecificPrice(service.id, service.branchId);
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          branchId: service.branchId,
          expectedPrice: service.expectedPrice,
          actualPrice: price,
          isCorrect: price === service.expectedPrice
        });
      } catch (error) {
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          branchId: service.branchId,
          expectedPrice: service.expectedPrice,
          actualPrice: 0,
          isCorrect: false,
          error: error.message
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Service Pricing Test</Text>
      <Text style={styles.subtitle}>Branch: {branchId}</Text>
      
      <TouchableOpacity style={styles.testButton} onPress={runPricingTest} disabled={loading}>
        <Text style={styles.testButtonText}>
          {loading ? 'Testing...' : 'Run Pricing Test'}
        </Text>
      </TouchableOpacity>

      {testResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.map((result, index) => (
            <View key={index} style={[styles.resultItem, result.isCorrect ? styles.success : styles.error]}>
              <Text style={styles.resultText}>
                {result.serviceName} ({result.serviceId})
              </Text>
              <Text style={styles.resultText}>
                Expected: ₱{result.expectedPrice} | Actual: ₱{result.actualPrice}
              </Text>
              <Text style={styles.resultText}>
                Status: {result.isCorrect ? '✅ PASS' : '❌ FAIL'}
              </Text>
              {result.error && (
                <Text style={styles.errorText}>Error: {result.error}</Text>
              )}
            </View>
          ))}
        </View>
      )}
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
  resultsContainer: {
    marginTop: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#160B53',
  },
  resultItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  success: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  error: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    fontStyle: 'italic',
  },
});
