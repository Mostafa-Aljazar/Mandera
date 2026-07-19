'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DocumentHead from "@/components/DocumentHead";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import { useBaseEmployee, useUpdateBaseEmployee } from '@/hooks/queries/useEmployees';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { EmployeeEditSchema, type TEmployeeEditSchema } from '@/validations/employee-edit.schema';

const EmployeeEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: employee, isLoading: fetchLoading, isError } = useBaseEmployee(id as string);
  const updateEmployeeMutation = useUpdateBaseEmployee();

  const form = useForm<TEmployeeEditSchema>({
    resolver: zodResolver(EmployeeEditSchema(t)),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee]);

  useEffect(() => {
    if (isError) {
      toast(t('Failed to load employee details'));
      router.push('/company-dashboard/employees');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const result = await updateEmployeeMutation.mutateAsync({
        id: id as string,
        input: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
        },
      });
      if (result.error) throw new Error(result.error);

      toast(t('Employee updated successfully'));
      router.push('/company-dashboard/employees');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast(t('Failed to update employee'));
    } finally {
      setLoading(false);
    }
  });

  if (fetchLoading) {
    return (
      <>
        <CompanyAdminHeader />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('Loading...')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DocumentHead title={t('Edit employee')} description="Edit employee details" />
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

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{t('Edit employee')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('First Name')}</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-foreground" />
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
                          <FormLabel>{t('Last Name')}</FormLabel>
                          <FormControl>
                            <Input {...field} className="text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Email')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="text-foreground" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? t('Saving...') : t('Save changes')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/company-dashboard/employees')}
                    >
                      {t('Cancel')}
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

export default EmployeeEditPage;
