'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserMinus, AlertTriangle } from 'lucide-react';
import { useEmployeeDeletion } from '@/hooks/useEmployeeDeletion';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useCompanyEmployeesLookup } from '@/hooks/queries/useProperties';

interface EmployeeToDelete {
  id: string;
  employeeId?: string;
  name?: string;
  firstName?: string;
  _isBase?: boolean;
}

interface ReassignableEmployee {
  id: string;
  name?: string;
  email?: string;
  employeeId?: string;
}

interface EmployeeDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToDelete: EmployeeToDelete | null;
  onSuccess?: () => void;
  companyId?: string;
}

const EmployeeDeletionDialog = ({ isOpen, onClose, employeeToDelete, onSuccess, companyId: propCompanyId }: EmployeeDeletionDialogProps) => {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  const activeCompanyId = propCompanyId || company?.id;
  const { deleteEmployeeWorkflow, isDeleting, deletionProgress, deletionError } = useEmployeeDeletion();

  const [reassignOwnersTo, setReassignOwnersTo] = useState('');
  const [reassignClientsTo, setReassignClientsTo] = useState('');
  const [reassignPropertiesTo, setReassignPropertiesTo] = useState('');

  const { data: employeesData } = useCompanyEmployeesLookup(
    isOpen ? activeCompanyId : undefined,
  );
  const employees: ReassignableEmployee[] = (employeesData ?? []).filter(
    (e) => e.id !== employeeToDelete?.id && e.id !== employeeToDelete?.employeeId,
  );

  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      setReassignOwnersTo('');
      setReassignClientsTo('');
      setReassignPropertiesTo('');
    }
  }, [isOpen]);

  // If it's a base-only employee missing company_employees, we technically bypass reassignment selection validation
  // but to maintain UI consistency, we still demand form completion or hide it.
  const isBaseOnly = employeeToDelete?._isBase;
  const isFormValid = isBaseOnly || (reassignOwnersTo && reassignClientsTo && reassignPropertiesTo);

  const handleConfirm = async () => {
    if (!employeeToDelete || !isFormValid) return;
    
    const result = await deleteEmployeeWorkflow(employeeToDelete, {
      reassignOwnersTo,
      reassignClientsTo,
      reassignPropertiesTo
    });
    
    if (result.success) {
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive font-outfit">
            <UserMinus className="h-5 w-5" />
            {t('Delete Employee')} - {employeeToDelete?.name || employeeToDelete?.firstName}
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-foreground/80">
            {t('You must reassign the deleted employee\'s data to other employees to continue.')}
          </DialogDescription>
        </DialogHeader>

        {!isBaseOnly && (
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-foreground">{t('Transfer Owners to:')}</Label>
              <Select value={reassignOwnersTo} onValueChange={setReassignOwnersTo} disabled={isDeleting}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={`owner-${emp.id}`} value={emp.id}>
                      {emp.name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t('Transfer Clients to:')}</Label>
              <Select value={reassignClientsTo} onValueChange={setReassignClientsTo} disabled={isDeleting}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={`client-${emp.id}`} value={emp.id}>
                      {emp.name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">{t('Transfer Properties to:')}</Label>
              <Select value={reassignPropertiesTo} onValueChange={setReassignPropertiesTo} disabled={isDeleting}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select employee')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={`prop-${emp.id}`} value={emp.id}>
                      {emp.name || emp.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isDeleting && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 bg-muted/30 rounded-lg mt-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-primary animate-pulse">{deletionProgress}</p>
          </div>
        )}

        {deletionError && !isDeleting && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('Error')}</AlertTitle>
            <AlertDescription className="mt-1 font-mono text-xs opacity-90 break-words">
              {deletionError}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="sm:justify-between items-center mt-4 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            {t('Cancel')}
          </Button>

          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!isFormValid || isDeleting || (deletionProgress === t('Deletion successful'))}
            className="transition-all active:scale-[0.98]"
          >
            {deletionError ? t('Retry') : t('Confirm Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDeletionDialog;