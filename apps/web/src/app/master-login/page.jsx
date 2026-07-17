'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMasterAuth } from '@/contexts/MasterAuthContext.jsx';
import PublicHeader from '@/components/PublicHeader.jsx';
import { toast } from 'sonner';

const MasterLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useMasterAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      router.push('/master-dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('Email address')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('admin@example.com')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-foreground"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('Authenticating...') : t('Sign in')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MasterLoginPage;
