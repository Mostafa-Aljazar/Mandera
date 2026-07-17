'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import { useEmployeeCount } from '@/hooks/useEmployeeCount';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

interface NewEmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  job_title: string;
  password: string;
}

const EmployeeFormPage = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { company } = useCompanyAuth();
  const { count: currentCount } = useEmployeeCount(company?.id);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<NewEmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    job_title: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentCount >= (company?.maxEmployeeCount ?? Infinity)) {
      toast.error(t('Employee limit reached. Please upgrade your subscription.'));
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
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        job_title: '',
        password: ''
      });
      router.push('/company-dashboard/employees');
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error(t('Failed to add employee'));
    } finally {
      setLoading(false);
    }
  };

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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('First Name')} *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder={t('e.g. John')}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('Last Name')} *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder={t('e.g. Doe')}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('Email Address')} *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder={t('jane@example.com')}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('Phone Number')} *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      placeholder={t('+974 XXXX XXXX')}
                      className="bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_title">{t('Job Title')} *</Label>
                    <Select value={formData.job_title || undefined} onValueChange={(v) => setFormData(prev => ({ ...prev, job_title: v }))} required>
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
                    <Label htmlFor="password">{t('Temporary Password')} *</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      placeholder={t('Minimum 8 characters')}
                      className="bg-background text-foreground"
                    />
                  </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default EmployeeFormPage;
