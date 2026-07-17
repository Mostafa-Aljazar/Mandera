import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import { useTranslation } from 'react-i18next';

export const useStatusUpdate = () => {
  const { currentUser, company } = useCompanyAuth();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkPermission = useCallback((entityType, entity) => {
    if (!currentUser) return false;
    if (currentUser.role === 'company_super_admin') return true;

    // Determine which field holds the assigned employee ID
    const assignedId = entityType === 'owner' ? entity.assigned_employee_id : entity.employee_id;
    return assignedId === currentUser.id;
  }, [currentUser]);

  const updateStatus = async (entityType, entity, payload) => {
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
           console.error('PocketBase Error:', error.status, error.message, error.response);
           throw error;
         }
      }

      // 2. SECONDARY OPERATION: Create history record
      const collectionName = `${entityType}_status_history`;
      
      const basePayload = {
        note: payload.note || '',
        created_by: currentUser.id,
        created_by_name: currentUser.name || currentUser.firstName || currentUser.email || 'Unknown User',
        company_id: company.id,
      };

      if (payload.follow_up_date) {
        basePayload.follow_up_date = payload.follow_up_date;
      }

      let finalPayload = { ...basePayload };

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
        console.error('PocketBase Error:', historyErr.status, historyErr.message, historyErr.response);
        
        let exactError = historyErr.message;
        if (historyErr.response?.data) {
           exactError = Object.entries(historyErr.response.data)
             .map(([k, v]) => `${k}: ${v.message}`)
             .join(', ');
        }
        throw new Error(t('Failed to save status history: ') + exactError);
      }
    } catch (err) {
      const errorMessage = err.message || t('An error occurred');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return { canUpdate: checkPermission, updateStatus, isLoading, error };
};