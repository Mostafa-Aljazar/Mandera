import { useState } from 'react';
import pb from '@/lib/pocketbaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface EmployeeToDelete {
  id: string;
  employeeId?: string;
  _isBase?: boolean;
}

interface ReassignmentTargets {
  reassignOwnersTo: string;
  reassignClientsTo: string;
  reassignPropertiesTo: string;
}

export const useEmployeeDeletion = () => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState('');
  const [deletionError, setDeletionError] = useState('');

  const deleteEmployeeWorkflow = async (employeeToDelete: EmployeeToDelete, { reassignOwnersTo, reassignClientsTo, reassignPropertiesTo }: ReassignmentTargets) => {
    setIsDeleting(true);
    setDeletionProgress('');
    setDeletionError('');

    try {
      const targetId = employeeToDelete.id;
      const baseEmployeeId = employeeToDelete.employeeId;

      // Handle base-only employees (edge case where company_employee record doesn't exist)
      if (employeeToDelete._isBase) {
        setDeletionProgress(t('Deleting employee...'));
        await pb.collection('employees').delete(targetId, { $autoCancel: false });
        
        setDeletionProgress(t('Deletion successful'));
        toast.success(t('Employee deleted successfully and data transferred'));
        return { success: true };
      }

      // 1. Reassign Owners
      setDeletionProgress(t('Reassigning owners...'));
      const owners = await pb.collection('owners').getFullList({ filter: `assigned_employee_id="${targetId}"`, $autoCancel: false });
      for (const owner of owners) {
        await pb.collection('owners').update(owner.id, { assigned_employee_id: reassignOwnersTo }, { $autoCancel: false });
      }

      // 2. Reassign Clients
      setDeletionProgress(t('Reassigning clients...'));
      const clients = await pb.collection('clients').getFullList({ filter: `employee_id="${targetId}"`, $autoCancel: false });
      for (const client of clients) {
        await pb.collection('clients').update(client.id, { employee_id: reassignClientsTo }, { $autoCancel: false });
      }

      // 3. Reassign Properties
      setDeletionProgress(t('Reassigning properties...'));
      const properties = await pb.collection('properties').getFullList({ filter: `employee_id="${targetId}"`, $autoCancel: false });
      for (const property of properties) {
        await pb.collection('properties').update(property.id, { employee_id: reassignPropertiesTo }, { $autoCancel: false });
      }

      // Note: Historical records (revenues, client_status_history, owner_status_history) 
      // are intentionally NOT deleted to preserve historical data integrity.

      // 4. Delete company_employees record
      setDeletionProgress(t('Deleting company employee record...'));
      await pb.collection('company_employees').delete(targetId, { $autoCancel: false });

      // 5. Delete base employees record (fail silently if linked elsewhere, typically 1:1 though)
      if (baseEmployeeId) {
        setDeletionProgress(t('Deleting base employee record...'));
        try {
          await pb.collection('employees').delete(baseEmployeeId, { $autoCancel: false });
        } catch (e) {
          console.warn('Could not delete base employee record (might be referenced elsewhere)', e);
        }
      }

      setDeletionProgress(t('Deletion successful'));
      toast.success(t('Employee deleted successfully and data transferred'));
      
      return { success: true };

    } catch (error) {
      console.error('[Employee Deletion Error]', error);
      const errorMessage = (error as Error).message || t('An error occurred during the process');
      setDeletionError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  };

  return { 
    deleteEmployeeWorkflow, 
    isDeleting,
    deletionProgress,
    deletionError
  };
};