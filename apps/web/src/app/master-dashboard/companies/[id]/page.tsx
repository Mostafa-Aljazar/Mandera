'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MasterAdminHeader from '@/components/MasterAdminHeader';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface CompanyFormData {
  companyName: string;
  email: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  maxEmployeeCount: number;
}

const CompanyEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: '',
    email: '',
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    maxEmployeeCount: 10
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const company = await pb.collection('companies').getOne(id as string, { $autoCancel: false });
        setFormData({
          companyName: company.companyName,
          email: company.email,
          subscriptionStartDate: company.subscriptionStartDate,
          subscriptionEndDate: company.subscriptionEndDate,
          maxEmployeeCount: company.maxEmployeeCount
        });
      } catch (error) {
        console.error('Error fetching company:', error);
        toast(t('Failed to load company details'));
        router.push('/master-dashboard/companies');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchCompany();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxEmployeeCount' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await pb.collection('companies').update(id as string, {
        companyName: formData.companyName,
        email: formData.email,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        maxEmployeeCount: formData.maxEmployeeCount
      }, { $autoCancel: false });

      toast(t('Company updated successfully'));
      router.push('/master-dashboard/companies');
    } catch (error) {
      console.error('Error updating company:', error);
      toast(t('Failed to update company'));
    } finally {
      setLoading(false);
    }
  };

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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('Company name')}</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                    className="text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('Email')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="text-foreground"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subscriptionStartDate">{t('Subscription start date')}</Label>
                    <Input
                      id="subscriptionStartDate"
                      name="subscriptionStartDate"
                      type="date"
                      value={formData.subscriptionStartDate}
                      onChange={handleChange}
                      required
                      className="text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subscriptionEndDate">{t('Subscription end date')}</Label>
                    <Input
                      id="subscriptionEndDate"
                      name="subscriptionEndDate"
                      type="date"
                      value={formData.subscriptionEndDate}
                      onChange={handleChange}
                      required
                      min={formData.subscriptionStartDate}
                      className="text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxEmployeeCount">{t('Maximum employee count')}</Label>
                  <Input
                    id="maxEmployeeCount"
                    name="maxEmployeeCount"
                    type="number"
                    min={1}
                    value={formData.maxEmployeeCount}
                    onChange={handleChange}
                    required
                    className="text-foreground"
                  />
                </div>

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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CompanyEditPage;
