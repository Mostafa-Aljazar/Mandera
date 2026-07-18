'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useEmployeeCount } from '@/hooks/useEmployeeCount';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { NewEmployeeSchema, type TNewEmployeeSchema } from '@/validations/new-employee.schema';

const EmployeeFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { company } = useCompanyAuth();
  const { count: currentCount } = useEmployeeCount(company?.id);
  const [loading, setLoading] = useState(false);

  const form = useForm<TNewEmployeeSchema>({
    resolver: zodResolver(NewEmployeeSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      job_title: undefined,
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    if (currentCount >= (company?.maxEmployeeCount ?? Infinity)) {
      toast.error(t('Employee limit reached. Please upgrade your subscription.'));
      return;
    }

    setLoading(true);

    try {
      const employeeRecord = await pb.collection('employees').create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        job_title: formData.job_title,
        companyId: company!.id,
        disabled: false
      }, { $autoCancel: false });

      await pb.collection('company_employees').create({
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
        companyId: company!.id,
        employeeId: employeeRecord.id,
        role: 'company_employee'
      }, { $autoCancel: false });

      toast.success(t('Employee added successfully'));
      form.reset();
      router.push('/company-dashboard/employees');
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(t('Failed to add employee'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <Helmet>
        <title>{t('Add New Employee')}</title>
        <meta name="description" content="Create a new employee account" />
      </Helmet>
      <CompanyAdminHeader />
      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <Button
            variant="outline"
            onClick={() => router.push('/company-dashboard/employees')}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Back to employees')}
          </Button>

          <Card className="max-w-3xl mx-auto shadow-sm border-muted">
            <CardHeader className="border-b bg-card/50 pb-6 mb-6">
              <CardTitle className="text-2xl font-outfit">{t('Add New Employee')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('First Name')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('e.g. John')}
                              className="bg-background text-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Last Name')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t('e.g. Doe')}
                              className="bg-background text-foreground"
                            />
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
                            <Input
                              {...field}
                              type="email"
                              placeholder={t('jane@example.com')}
                              className="bg-background text-foreground"
                            />
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
                              <SelectItem value="وكيل مبيعات">{t('Sales Agent')}</SelectItem>
                              <SelectItem value="مسؤول">{t('Administrator')}</SelectItem>
                              <SelectItem value="مدير">{t('Manager')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Temporary Password')} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              minLength={8}
                              placeholder={t('Minimum 8 characters')}
                              className="bg-background text-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/company-dashboard/employees')}
                      className="w-full md:w-auto"
                    >
                      {t('Cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || currentCount >= (company?.maxEmployeeCount ?? Infinity)}
                      className="w-full md:w-auto min-w-[140px]"
                    >
                      {loading ? t('Adding...') : t('Add Employee')}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default EmployeeFormPage;
