'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import PublicHeader from '@/components/PublicHeader';
import { toast } from 'sonner';
import { LoginSchema, type TLoginSchema } from '@/validations/login.schema';

const MasterLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useMasterAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const form = useForm<TLoginSchema>({
    resolver: zodResolver(LoginSchema(t)),
    defaultValues: { email: '', password: '' },
  });

  const handleSubmit = form.handleSubmit(async (formData) => {
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      router.push('/master-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('Invalid email or password'));
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <Helmet>
        <title>{t('Master admin login')} | MANDERA CRM</title>
        <meta name="description" content="Login to the master admin dashboard" />
      </Helmet>
      <PublicHeader />
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-muted/30 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{t('Master admin login')}</CardTitle>
            <CardDescription>{t('Enter your credentials to access the platform')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Email address')}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('admin@example.com')}
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
                <Button type="submit" className="w-full" disabled={loading}>
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

export default MasterLoginPage;
