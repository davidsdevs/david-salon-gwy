import { useState, useEffect } from 'react';
import { DashboardService, DashboardData } from '../services/dashboardService';
import useAuth from './useAuth';

export interface UseDashboardReturn {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching dashboard data for user:', user.id);
      
      const data = await DashboardService.getDashboardData(user.id);
      setDashboardData(data);
      
      console.log('✅ Dashboard data fetched successfully:', data);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id]);

  return {
    dashboardData,
    loading,
    error,
    refresh
  };
}

