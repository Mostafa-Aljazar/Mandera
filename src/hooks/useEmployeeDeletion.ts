import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useDeleteEmployeeWorkflow } from '@/hooks/queries/useEmployees';

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
  const deleteWorkflowMutation = useDeleteEmployeeWorkflow();

  const deleteEmployeeWorkflow = async (employeeToDelete: EmployeeToDelete, targets: ReassignmentTargets) => {
    setIsDeleting(true);
    setDeletionProgress(t('Deleting employee...'));
    setDeletionError('');

    try {
      const result = await deleteWorkflowMutation.mutateAsync({
        employeeToDelete: {
          profileId: employeeToDelete.id,
          employeeId: employeeToDelete.employeeId,
          isBaseOnly: employeeToDelete._isBase,
        },
        targets,
      });

      if (result.error) throw new Error(result.error);

      setDeletionProgress(t('Deletion successful'));
      toast.success(t('Employee deleted successfully and data transferred'));

      return { success: true };
    } catch (error) {
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
