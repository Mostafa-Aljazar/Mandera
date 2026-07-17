'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const EmployeeEditPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const employee = await pb.collection('employees').getOne(id, { $autoCancel: false });
        setFormData({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email
        });
      } catch (error) {
        console.error('Error fetching employee:', error);
        toast(t('Failed to load employee details'));
        router.push('/company-dashboard/employees');
      } finally {
        setFetchLoading(false);
      }
    };

    fetchEmployee();
  }, [id, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await pb.collection('employees').update(id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      }, { $autoCancel: false });

      toast(t('Employee updated successfully'));
      router.push('/company-dashboard/employees');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast(t('Failed to update employee'));
    } finally {
      setLoading(false);
    }
  };

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
      <Helmet>
        <title>{t('Edit employee')}</title>
        <meta name="description" content="Edit employee details" />
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

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">{t('Edit employee')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('First Name')}</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('Last Name')}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      className="text-foreground"
                    />
                  </div>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default EmployeeEditPage;
