import { useEmployeeCount as useEmployeeCountQuery } from '@/hooks/queries/useEmployees';

export const useEmployeeCount = (companyId?: string) => {
  const { data, isLoading, error, refetch } = useEmployeeCountQuery(companyId);
  return {
    count: data ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
