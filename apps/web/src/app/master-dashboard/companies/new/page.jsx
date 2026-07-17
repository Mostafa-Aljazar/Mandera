'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MasterAdminHeader from '@/components/MasterAdminHeader.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const CompanyFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    maxEmployeeCount: 10
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxEmployeeCount' ? parseInt(value) || 0 : value
    }));
  };

  const generateCompanyCode = async () => {
    try {
      const companies = await pb.collection('companies').getFullList({
        sort: '-companyCode',
        $autoCancel: false
      });

      if (companies.length === 0) {
        return 'COMP001';
      }

      const lastCode = companies[0].companyCode;
      const numPart = parseInt(lastCode.replace('COMP', ''));
      const nextNum = numPart + 1;
      return `COMP${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating company code:', error);
      return `COMP${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const companyCode = await generateCompanyCode();

      const companyRecord = await pb.collection('companies').create({
        companyCode,
        companyName: formData.companyName,
        email: formData.email,
        subscriptionStartDate: formData.subscriptionStartDate,
        subscriptionEndDate: formData.subscriptionEndDate,
        maxEmployeeCount: formData.maxEmployeeCount,
        isActive: true
      }, { $autoCancel: false });

      await pb.collection('company_super_admins').create({
        email: formData.email,
        password: formData.password,
        passwordConfirm: formData.password,
        name: formData.companyName,
        companyId: companyRecord.id,
        companyCode: companyCode,
        role: 'company_super_admin'
      }, { $autoCancel: false });

      toast(`${t('Company created successfully. Company Code:')} ${companyCode}`);
      router.push('/master-dashboard/companies');
    } catch (error) {
      console.error('Error creating company:', error);
      toast(t('Failed to create company'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('Add new company')}</title>
        <meta name="description" content="Create a new company account" />
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
              <CardTitle className="text-2xl">{t('Add new company')}</CardTitle>
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

                <div className="space-y-2">
                  <Label htmlFor="password">{t('Password')}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
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
                    {loading ? t('Creating...') : t('Create company')}
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

export default CompanyFormPage;
