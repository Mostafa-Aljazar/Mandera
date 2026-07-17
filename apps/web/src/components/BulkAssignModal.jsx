'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BulkAssignModal = ({ isOpen, onClose, onConfirm, employees = [], statuses = [], selectedCount = 0 }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [statusId, setStatusId] = useState('keep_current');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const handleConfirm = async () => {
    if (!employeeId) return;
    setIsSubmitting(true);
    try {
      await onConfirm({ employeeId, statusId: statusId === 'keep_current' ? null : statusId });
      setEmployeeId('');
      setStatusId('keep_current');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('Bulk Assign Clients')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg border border-border/50 text-sm text-muted-foreground">
            {t('You are about to reassign')} <strong className="text-foreground">{selectedCount}</strong> {t('selected client(s).')}
          </div>

          <div className="space-y-2">
            <Label>{t('Assign To Employee *')}</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('Select Employee')} />
              </SelectTrigger>
              <SelectContent>
                {employees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name || e.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('Update Status (Optional)')}</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={t('Keep Current Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_current">{t('Keep Current Status')}</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{t('Cancel')}</Button>
          <Button onClick={handleConfirm} disabled={!employeeId || isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('Assigning...')}</> : t('Confirm Assignment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAssignModal;