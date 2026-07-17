'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, UserPlus, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface EmployeeData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  role?: string;
}

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
  password: string;
}

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void;
  employee?: EmployeeData | null;
  isSubmitting?: boolean;
}

const EmployeeModal = ({ isOpen, onClose, onSave, employee, isSubmitting }: EmployeeModalProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    phone: '',
    job_title: '',
    role: 'company_employee',
    password: ''
  });

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '', 
        job_title: employee.job_title || '',
        role: employee.role || 'company_employee',
        password: ''
      });
    } else if (!isOpen) {
      setFormData({ name: '', email: '', phone: '', job_title: '', role: 'company_employee', password: '' });
    }
  }, [employee, isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      toast.error(t('Name, email, and role are required.'));
      return;
    }
    
    if (!formData.phone || !/^\+?[0-9\s-]{8,20}$/.test(formData.phone)) {
      toast.error(t('Invalid phone number format. Please use format like +974 1234 5678'));
      return;
    }
    
    if (!formData.job_title || !['وكيل مبيعات', 'مسؤول', 'مدير'].includes(formData.job_title)) {
      toast.error(t('Please select a valid job title.'));
      return;
    }

    if (!employee && !formData.password) {
      toast.error(t('Password is required for new employees.'));
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="text-xl flex items-center gap-2 font-outfit">
            {employee ? <UserCog className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
            {employee ? t('Edit Employee') : t('Add New Employee')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label htmlFor="name">{t('Full Name')} *</Label>
              <Input 
                id="name"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder={t('e.g. Jane Doe')} 
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email Address')} *</Label>
              <Input 
                id="email"
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder={t('jane@example.com')} 
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('Phone Number')} *</Label>
              <Input 
                id="phone"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                placeholder={t('+974 XXXX XXXX')} 
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">{t('Job Title')} *</Label>
              <Select value={formData.job_title || undefined} onValueChange={v => setFormData({...formData, job_title: v})} required>
                <SelectTrigger id="job_title" className="bg-background">
                  <SelectValue placeholder={t('Select Job Title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="وكيل مبيعات">{t('Sales Agent')}</SelectItem>
                  <SelectItem value="مسؤول">{t('Administrator')}</SelectItem>
                  <SelectItem value="مدير">{t('Manager')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">{t('System Role')} *</Label>
              <Select value={formData.role || undefined} onValueChange={v => setFormData({...formData, role: v})} required>
                <SelectTrigger id="role" className="bg-background">
                  <SelectValue placeholder={t('Select Role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_employee">{t('Company Employee')}</SelectItem>
                  <SelectItem value="company_super_admin">{t('Company Super Admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!employee && (
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="password">{t('Temporary Password')} *</Label>
                <Input 
                  id="password"
                  type="password"
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  placeholder={t('Minimum 8 characters')} 
                  minLength={8}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t mt-6">
            <Button type="submit" disabled={isSubmitting} className="gap-2 px-8">
              <Save className="h-4 w-4" /> {isSubmitting ? t('Saving...') : t('Save Employee')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeModal;