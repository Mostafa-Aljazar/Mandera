import { useState, useEffect, useCallback } from 'react';
import { ClientResponseError } from 'pocketbase';
import pb from '@/lib/pocketbaseClient';

export const useEmployeeCount = (companyId?: string) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const e = err as ClientResponseError;
      console.error('Error fetching real-time employee count:', e.response || e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return { count, loading, error, refetch: fetchCount };
};