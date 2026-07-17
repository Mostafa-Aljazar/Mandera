import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useTranslation } from 'react-i18next';

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

      // 1. PRIMARY OPERATION: Update parent entity with relevant quick-access data
      if (entityType === 'client' && payload.follow_up_date) {
         const updatePayload = {
             follow_up_date: payload.follow_up_date,
             follow_up_time: payload.follow_up_time || ''
         };
         
         console.log('--- DEBUG: useStatusUpdate EXACT REQUEST START ---');
         console.log('Collection: clients | Operation: update');
         console.log('Auth token present:', !!pb.authStore.token);
         console.log('Payload:', JSON.stringify(updatePayload, null, 2));
         try {
           const result = await pb.collection('clients').update(entity.id, updatePayload, { $autoCancel: false });
           console.log('Success:', result.id);
         } catch (error) {
           console.error('PocketBase Error:', error.status, error.message, error.response);
           throw error;
         }
      } else if (entityType === 'property' && payload.status_name) {
         const updatePayload = { status: payload.status_name };
         
         console.log('--- DEBUG: useStatusUpdate EXACT REQUEST START ---');
         console.log('Collection: properties | Operation: update');
         console.log('Auth token present:', !!pb.authStore.token);
         console.log('Payload:', JSON.stringify(updatePayload, null, 2));
         try {
           const result = await pb.collection('properties').update(entity.id, updatePayload, { $autoCancel: false });
           console.log('Success:', result.id);
         } catch (error) {
           const e = error as { status?: number; message?: string; response?: unknown };
           console.error('PocketBase Error:', e.status, e.message, e.response);
           throw error;
         }
      }

      // 2. SECONDARY OPERATION: Create history record
      const collectionName = `${entityType}_status_history`;

      const basePayload: Record<string, unknown> = {
        note: payload.note || '',
        created_by: currentUser.id,
        created_by_name: (currentUser as Record<string, unknown>).name
          || (currentUser as Record<string, unknown>).firstName
          || currentUser.email
          || 'Unknown User',
        company_id: company.id,
      };

      if (payload.follow_up_date) {
        basePayload.follow_up_date = payload.follow_up_date;
      }

      const finalPayload: Record<string, unknown> = { ...basePayload };

      if (entityType === 'client') {
        finalPayload.client_id = entity.id;
        finalPayload.status_id = payload.status_id;
        finalPayload.status = payload.status_name;
        finalPayload.employee_id = entity.employee_id;
      } else if (entityType === 'owner') {
        finalPayload.owner_id = entity.id;
        finalPayload.status_id = payload.status_id;
      } else if (entityType === 'property') {
        finalPayload.property_id = entity.id;
        finalPayload.status = payload.status_name;
      }

      console.log('--- DEBUG: useStatusUpdate EXACT REQUEST START ---');
      console.log(`Collection: ${collectionName} | Operation: create`);
      console.log('Auth token present:', !!pb.authStore.token);
      console.log('Payload:', JSON.stringify(finalPayload, null, 2));

      try {
        const record = await pb.collection(collectionName).create(finalPayload, { $autoCancel: false });
        console.log('Success:', record.id, record);
        return record;
      } catch (historyErr) {
        const e = historyErr as { status?: number; message?: string; response?: { data?: Record<string, { message: string }> } };
        console.error('PocketBase Error:', e.status, e.message, e.response);

        let exactError = e.message;
        if (e.response?.data) {
           exactError = Object.entries(e.response.data)
             .map(([k, v]) => `${k}: ${v.message}`)
             .join(', ');
        }
        throw new Error(t('Failed to save status history: ') + exactError);
      }
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