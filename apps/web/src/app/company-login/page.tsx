'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import PublicHeader from '@/components/PublicHeader';
import { toast } from 'sonner';
import { LoginSchema, type TLoginSchema } from '@/validations/login.schema';

const CompanyLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [freezeError, setFreezeError] = useState('');
  const { login } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(LoginSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);
    setFreezeError('');

    try {
      await login(formData.email, formData.password);
      router.push('/company-dashboard');
    } catch (error: any) {
      console.error('Login error:', error);

      const isFrozenError = error.message.includes('frozen') || error.message.includes('تجميد');

      if (isFrozenError) {
        setFreezeError(error.message);
      } else {
        toast.error(error.message || t('Invalid credentials. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <Helmet>
        <title>{t('Company Login')} | MANDERA CRM</title>
        <meta name="description" content="Login to your company dashboard" />
      </Helmet>
      <PublicHeader />
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md shadow-lg rounded-2xl border-border/50">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">{t('Welcome back')}</CardTitle>
            <CardDescription className="text-base">
              {t('Enter your email and password to access your company dashboard.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {freezeError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('Account Access Restricted')}</AlertTitle>
                <AlertDescription className="mt-1">
                  {freezeError}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Email address')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('name@company.com')}
                          className="text-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Password')}</FormLabel>
                      <FormControl>
                        <Input type="password" className="text-foreground" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full transition-all duration-200 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? t('Authenticating...') : t('Sign in')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CompanyLoginPage;
