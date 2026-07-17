'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';

const EmployeeReassignmentModal = ({
  isOpen,
  onClose,
  selectedOwnerIds = [],
  onConfirm,
  isProcessing = false
}) => {
  const { t } = useTranslation();
  const { company } = useCompanyAuth();
  
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && company?.id) {
      const fetchEmployees = async () => {
        setIsLoading(true);
        try {
          const res = await pb.collection('company_employees').getFullList({
            filter: `companyId="${company.id}"`,
            $autoCancel: false
          });
          setEmployees(res);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEmployees();
    }
  }, [isOpen, company?.id]);

  const handleConfirm = () => {
    setError(null);
    
    if (!targetEmployeeId) {
      setError(t('You must select an employee to transfer owners to.'));
      return;
    }

    onConfirm(targetEmployeeId);
  };

  const resetStateAndClose = () => {
    setTargetEmployeeId('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && resetStateAndClose()}>
      <DialogContent className="max-w-md bg-background">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl font-outfit">
            {t('Reassign Owners')}
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            {t('Will be transferred')} <span className="font-semibold text-foreground">{selectedOwnerIds.length}</span> {t('owner(s) to another employee.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="flex justify-between items-center text-sm">
                <span>{t('Select Target Employee')} *</span>
              </Label>
              <Select 
                value={targetEmployeeId} 
                onValueChange={setTargetEmployeeId}
                disabled={isProcessing || isLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={isLoading ? t('Loading...') : t('Select employee...')} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name || emp.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 sm:justify-between items-center w-full">
          <Button variant="ghost" onClick={resetStateAndClose} disabled={isProcessing}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || !targetEmployeeId} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('Processing...')}</>
            ) : (
              t('Confirm Transfer')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeReassignmentModal;