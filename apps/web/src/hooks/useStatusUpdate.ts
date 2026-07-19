import { useState, useCallback } from 'react';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useTranslation } from 'react-i18next';
import { updateEntityStatus } from '@/actions/statusUpdate';

type EntityType = 'client' | 'owner' | 'property';

interface StatusUpdateEntity {
  id: string;
  employee_id?: string;
  assigned_employee_id?: string;
}

interface StatusUpdatePayload {
  note?: string;
  status_id?: string;
  status_name?: string;
  follow_up_date?: string;
  follow_up_time?: string;
}

export const useStatusUpdate = () => {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPermission = useCallback((entityType: EntityType, entity: StatusUpdateEntity) => {
    if (!currentUser) return false;
    if (currentUser.role === 'company_super_admin') return true;

    // Determine which field holds the assigned employee ID
    const assignedId = entityType === 'owner' ? entity.assigned_employee_id : entity.employee_id;
    return assignedId === currentUser.id;
  }, [currentUser]);

  const updateStatus = async (entityType: EntityType, entity: StatusUpdateEntity, payload: StatusUpdatePayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const canUpdate = checkPermission(entityType, entity);
      if (!canUpdate) {
        throw new Error(t('You cannot update the status of this item - it is not assigned to you.'));
      }

      const result = await updateEntityStatus({
        entityType,
        entityId: entity.id,
        companyId: company!.id,
        createdByUserId: currentUser!.id,
        createdByName: currentUser?.name || currentUser?.email || 'Unknown User',
        payload: {
          note: payload.note,
          status_id: payload.status_id,
          status_name: payload.status_name,
          follow_up_date: payload.follow_up_date,
          follow_up_time: payload.follow_up_time,
          employee_id: entity.employee_id,
        },
      });
      if (result.error) throw new Error(result.error);
      return result.data;
    } catch (err) {
      const errorMessage = (err as Error).message || t('An error occurred');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return { canUpdate: checkPermission, updateStatus, isLoading, error };
};
