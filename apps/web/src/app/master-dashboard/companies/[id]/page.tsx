'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet';
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
import MasterAdminHeader from '@/components/MasterAdminHeader';
import { useCompany, useUpdateCompany } from '@/hooks/queries/useCompanies';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { CompanySchema, type TCompanySchema } from '@/validations/company.schema';

const CompanyEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { data: company, isLoading: fetchLoading, isError } = useCompany(id as string);
  const updateCompanyMutation = useUpdateCompany();

  const form = useForm<TCompanySchema>({
    resolver: zodResolver(CompanySchema(t)),
    defaultValues: {
      companyName: '',
      email: '',
      subscriptionStartDate: '',
      subscriptionEndDate: '',
      maxEmployeeCount: 10,
    },
  });

  const subscriptionStartDate = form.watch('subscriptionStartDate');

  useEffect(() => {
    if (company) {
      form.reset({
        companyName: company.company_name,
        email: company.email,
        subscriptionStartDate: company.subscription_start_date,
        subscriptionEndDate: company.subscription_end_date,
        maxEmployeeCount: company.max_employee_count,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => {
    if (isError) {
      toast(t('Failed to load company details'));
      router.push('/master-dashboard/companies');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError]);

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      const result = await updateCompanyMutation.mutateAsync({
        id: id as string,
        companyName: formData.companyName,
        email: formData.email,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        maxEmployeeCount: Number(formData.maxEmployeeCount),
      });
      if (result.error) throw new Error(result.error);

      toast(t('Company updated successfully'));
      router.push('/master-dashboard/companies');
    } catch (error) {
      console.error('Error updating company:', error);
      toast(t('Failed to update company'));
    } finally {
      setLoading(false);
    }
  });

  if (fetchLoading) {
    return (
      <>
        <MasterAdminHeader />
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
      <Helmet>
        <title>{t('Edit company')}</title>
        <meta name="description" content="Edit company details" />
      </Helmet>
      <MasterAdminHeader />
      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <Button
            variant="outline"
            onClick={() => router.push('/master-dashboard/companies')}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('Back to companies')}
          </Button>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{t('Edit company')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Company name')}</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-foreground" />
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
                        <FormLabel>{t('Email')}</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="text-foreground" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subscriptionStartDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Subscription start date')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="text-foreground" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subscriptionEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Subscription end date')}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="date"
                              min={subscriptionStartDate}
                              className="text-foreground"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="maxEmployeeCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Maximum employee count')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={1}
                            className="text-foreground"
                          />
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
                      onClick={() => router.push('/master-dashboard/companies')}
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

export default CompanyEditPage;
