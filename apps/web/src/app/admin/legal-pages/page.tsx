'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import MasterAdminHeader from '@/components/MasterAdminHeader';
import RichTextEditor from '@/components/RichTextEditor';
import PreviewModal from '@/components/PreviewModal';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import { useLegalPages, useUpdateLegalPage } from '@/hooks/queries/useLegalPages';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Eye, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { LegalPageType } from '@/types/supabase-entities.types';
import { LegalPageSchema, type TLegalPageSchema } from '@/validations/legal-page.schema';

interface PreviewModalState {
  isOpen: boolean;
  title: string;
  content: string;
}

const LegalPagesManagementPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useMasterAuth();

  const { data: pagesData, isLoading: loading } = useLegalPages();
  const updateMutation = useUpdateLegalPage();

  const privacy = pagesData?.find((r) => r.page_type === 'privacy_policy');
  const terms = pagesData?.find((r) => r.page_type === 'terms_of_service');

  const [saving, setSaving] = useState({ privacy: false, terms: false });

  const privacyForm = useForm<TLegalPageSchema>({
    resolver: zodResolver(LegalPageSchema(t)),
    defaultValues: { title: '', content: '' },
  });
  const termsForm = useForm<TLegalPageSchema>({
    resolver: zodResolver(LegalPageSchema(t)),
    defaultValues: { title: '', content: '' },
  });

  const [previewModal, setPreviewModal] = useState<PreviewModalState>({ isOpen: false, title: '', content: '' });

  useEffect(() => {
    if (privacy) {
      privacyForm.reset({ title: privacy.title, content: privacy.content });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacy?.id, privacy?.updated_at]);

  useEffect(() => {
    if (terms) {
      termsForm.reset({ title: terms.title, content: terms.content });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms?.id, terms?.updated_at]);

  const saveLegalPage = async (
    type: LegalPageType,
    id: string | undefined,
    data: TLegalPageSchema,
  ) => {
    if (!id) return;
    const isPrivacy = type === 'privacy_policy';
    const stateKey: 'privacy' | 'terms' = isPrivacy ? 'privacy' : 'terms';

    setSaving((prev) => ({ ...prev, [stateKey]: true }));

    try {
      const result = await updateMutation.mutateAsync({
        id,
        title: data.title,
        content: data.content,
        updatedBy: currentUser?.id ?? null,
      });
      if (result.error) throw new Error(result.error);

      toast.success(t('Content saved successfully.'));
    } catch (err) {
      console.error('Error saving legal page:', err);
      toast.error(t('Failed to save content.'));
    } finally {
      setSaving((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const handleSavePrivacy = privacyForm.handleSubmit((data) =>
    saveLegalPage('privacy_policy', privacy?.id, data),
  );
  const handleSaveTerms = termsForm.handleSubmit((data) =>
    saveLegalPage('terms_of_service', terms?.id, data),
  );

  const openPreview = (title: string, content: string) => {
    setPreviewModal({ isOpen: true, title, content });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        <MasterAdminHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('Legal Pages Management')} | MANDERA CRM</title>
      </Helmet>

      <MasterAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight font-outfit mb-2">{t('Legal Pages Management')}</h1>
            <p className="text-muted-foreground">{t('Manage public legal documents shown on the website.')}</p>
          </div>

          <Tabs defaultValue="privacy" className="space-y-6">
            <TabsList className="bg-background border grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="privacy">{t('Privacy Policy')}</TabsTrigger>
              <TabsTrigger value="terms">{t('Terms of Service')}</TabsTrigger>
            </TabsList>

            {/* Privacy Policy Tab */}
            <TabsContent value="privacy">
              <Form {...privacyForm}>
                <Card className="shadow-sm border-border/60">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>{t('Privacy Policy Editor')}</CardTitle>
                        <CardDescription>
                          {privacy?.updated_at && (
                            <span className="flex items-center gap-1.5 mt-1 text-xs">
                              {t('Last updated:')} {format(new Date(privacy.updated_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openPreview(privacyForm.getValues('title'), privacyForm.getValues('content'))}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" /> {t('Preview')}
                        </Button>
                        <Button
                          onClick={handleSavePrivacy}
                          disabled={saving.privacy || !privacy}
                          className="gap-2"
                        >
                          {saving.privacy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {t('Save Changes')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!privacy && (
                      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">{t('Missing Database Record')}</h4>
                          <p className="text-sm mt-1">{t('The privacy_policy record was not found in the database. Please ensure migrations ran successfully.')}</p>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={privacyForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <Label htmlFor="privacy-title">{t('Page Title')}</Label>
                          <FormControl>
                            <Input
                              id="privacy-title"
                              placeholder={t('e.g., Privacy Policy')}
                              className="max-w-md bg-background"
                              disabled={!privacy}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={privacyForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <Label>{t('Page Content')}</Label>
                          <div className={!privacy ? 'opacity-50 pointer-events-none' : ''}>
                            <FormControl>
                              <RichTextEditor
                                content={field.value}
                                onChange={field.onChange}
                                placeholder=""
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </Form>
            </TabsContent>

            {/* Terms of Service Tab */}
            <TabsContent value="terms">
              <Form {...termsForm}>
                <Card className="shadow-sm border-border/60">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>{t('Terms of Service Editor')}</CardTitle>
                        <CardDescription>
                          {terms?.updated_at && (
                            <span className="flex items-center gap-1.5 mt-1 text-xs">
                              {t('Last updated:')} {format(new Date(terms.updated_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openPreview(termsForm.getValues('title'), termsForm.getValues('content'))}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" /> {t('Preview')}
                        </Button>
                        <Button
                          onClick={handleSaveTerms}
                          disabled={saving.terms || !terms}
                          className="gap-2"
                        >
                          {saving.terms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {t('Save Changes')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!terms && (
                      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">{t('Missing Database Record')}</h4>
                          <p className="text-sm mt-1">{t('The terms_of_service record was not found in the database. Please ensure migrations ran successfully.')}</p>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={termsForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <Label htmlFor="terms-title">{t('Page Title')}</Label>
                          <FormControl>
                            <Input
                              id="terms-title"
                              placeholder={t('e.g., Terms of Service')}
                              className="max-w-md bg-background"
                              disabled={!terms}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={termsForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <Label>{t('Page Content')}</Label>
                          <div className={!terms ? 'opacity-50 pointer-events-none' : ''}>
                            <FormControl>
                              <RichTextEditor
                                content={field.value}
                                onChange={field.onChange}
                                placeholder=""
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <PreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        title={previewModal.title}
        content={previewModal.content}
      />
    </>
  );
};

export default LegalPagesManagementPage;
