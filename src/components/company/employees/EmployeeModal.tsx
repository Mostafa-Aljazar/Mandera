'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, UserPlus, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmployeeSchema, type TEmployeeSchema } from '@/validations/employee.schema';

interface EmployeeData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  role?: string;
}

export type EmployeeFormData = TEmployeeSchema;

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void;
  employee?: EmployeeData | null;
  isSubmitting?: boolean;
}

export default function EmployeeModal({ isOpen, onClose, onSave, employee, isSubmitting }: EmployeeModalProps) {
  const { t } = useTranslation();
  const isEditing = !!employee;

  const form = useForm<TEmployeeSchema>({
    resolver: zodResolver(EmployeeSchema(t, isEditing)),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      job_title: undefined,
      role: 'company_employee',
      password: '',
    },
  });

  useEffect(() => {
    if (employee && isOpen) {
      form.reset({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        job_title: (employee.job_title as TEmployeeSchema['job_title']) || undefined,
        role: employee.role || 'company_employee',
        password: '',
      });
    } else if (!isOpen) {
      form.reset({
        name: '',
        email: '',
        phone: '',
        job_title: undefined,
        role: 'company_employee',
        password: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee, isOpen]);

  const handleSubmit = form.handleSubmit((formData) => {
    onSave(formData);
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="text-xl flex items-center gap-2 font-outfit">
            {employee ? <UserCog className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
            {employee ? t('Edit Employee') : t('Add New Employee')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-1 md:col-span-2">
                    <FormLabel>{t('Full Name')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('e.g. Jane Doe')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Email Address')} *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder={t('jane@example.com')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Phone Number')} *</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Job Title')} *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t('Select Job Title')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sales_agent">{t('Sales Agent')}</SelectItem>
                        <SelectItem value="admin">{t('Administrator')}</SelectItem>
                        <SelectItem value="manager">{t('Manager')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('System Role')} *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t('Select Role')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company_employee">{t('Company Employee')}</SelectItem>
                        <SelectItem value="company_super_admin">{t('Company Super Admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!employee && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel>{t('Temporary Password')} *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={t('Minimum 8 characters')}
                          minLength={8}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end pt-4 border-t mt-6">
              <Button type="submit" disabled={isSubmitting} className="gap-2 px-8">
                <Save className="h-4 w-4" /> {isSubmitting ? t('Saving...') : t('Save Employee')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
