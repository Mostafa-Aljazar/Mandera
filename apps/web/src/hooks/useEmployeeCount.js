import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

export const useEmployeeCount = (companyId) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      let filter = '';
      if (companyId) {
        filter = `companyId = "${companyId}"`;
      }
      
      const res = await pb.collection('employees').getList(1, 1, {
        filter: filter,
        $autoCancel: false
      });
      
      setCount(res.totalItems);
      setError(null);
    } catch (err) {
      console.error('Error fetching real-time employee count:', err.response || err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, loading, error, refetch: fetchCount };
};