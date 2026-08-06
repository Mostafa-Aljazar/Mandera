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
  reassignTo: string;
}

const HISTORY_BLOCKED_MESSAGE =
  'This employee has historical activity records and cannot be permanently deleted. Disable the employee instead to block their access while keeping that history intact.';

export const useEmployeeDeletion = () => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState('');
  const [deletionError, setDeletionError] = useState('');
  const [isHistoryBlocked, setIsHistoryBlocked] = useState(false);
  const deleteWorkflowMutation = useDeleteEmployeeWorkflow();

  const deleteEmployeeWorkflow = async (
    employeeToDelete: EmployeeToDelete,
    targets: ReassignmentTargets,
    companyId: string,
  ) => {
    setIsDeleting(true);
    setDeletionProgress(t('Deleting employee...'));
    setDeletionError('');
    setIsHistoryBlocked(false);

    try {
      const result = await deleteWorkflowMutation.mutateAsync({
        employeeToDelete: {
          profileId: employeeToDelete.id,
          employeeId: employeeToDelete.employeeId,
          isBaseOnly: employeeToDelete._isBase,
        },
        targets,
        companyId,
      });

      if (result.error) throw new Error(result.error);

      setDeletionProgress(t('Deletion successful'));
      toast.success(t('Employee deleted successfully and data transferred'));

      return { success: true };
    } catch (error) {
      const rawMessage = (error as Error).message;
      const blocked = rawMessage === HISTORY_BLOCKED_MESSAGE;
      const errorMessage = blocked
        ? t(rawMessage)
        : rawMessage || t('An error occurred during the process');
      setIsHistoryBlocked(blocked);
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
    deletionError,
    isHistoryBlocked,
  };
};
