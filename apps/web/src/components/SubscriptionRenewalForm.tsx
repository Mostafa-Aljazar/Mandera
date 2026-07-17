'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import type { Company } from '../../types/pocketbase.types';

interface SubscriptionRenewalFormProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SubscriptionRenewalForm = ({ company, open, onOpenChange, onSuccess }: SubscriptionRenewalFormProps) => {
  const [newEndDate, setNewEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await pb.collection('companies').update(company!.id, {
        subscriptionEndDate: newEndDate
      }, { $autoCancel: false });

      toast('Subscription renewed successfully');
      onSuccess();
      onOpenChange(false);
      setNewEndDate('');
    } catch (error) {
      console.error('Error renewing subscription:', error);
      toast('Failed to renew subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew subscription for {company?.companyName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentEndDate">Current end date</Label>
              <Input
                id="currentEndDate"
                type="date"
                value={company?.subscriptionEndDate || ''}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndDate">New end date</Label>
              <Input
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                required
                min={company?.subscriptionEndDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Renewing...' : 'Renew subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionRenewalForm;