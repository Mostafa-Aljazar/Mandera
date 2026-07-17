'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import MasterAdminHeader from '@/components/MasterAdminHeader';
import RichTextEditor from '@/components/RichTextEditor';
import PreviewModal from '@/components/PreviewModal';
import pb from '@/lib/pocketbaseClient';
import { useMasterAuth } from '@/contexts/MasterAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Eye, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { LegalPage, LegalPageType } from '../../../../types/pocketbase.types';

interface LegalPageFormState {
  id: string | null;
  title: string;
  content: string;
  updated: string | null;
}

interface PreviewModalState {
  isOpen: boolean;
  title: string;
  content: string;
}

const LegalPagesManagementPage = () => {
  const { t } = useTranslation();
  const { currentUser } = useMasterAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ privacy: false, terms: false });

  const [privacyData, setPrivacyData] = useState<LegalPageFormState>({ id: null, title: '', content: '', updated: null });
  const [termsData, setTermsData] = useState<LegalPageFormState>({ id: null, title: '', content: '', updated: null });

  const [previewModal, setPreviewModal] = useState<PreviewModalState>({ isOpen: false, title: '', content: '' });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const records = await pb.collection('legal_pages').getFullList<LegalPage>({
        $autoCancel: false
      });

      const privacy = records.find(r => r.page_type === 'privacy_policy');
      if (privacy) {
        setPrivacyData({
          id: privacy.id,
          title: privacy.title,
          content: privacy.content,
          updated: privacy.updated
        });
      }

      const terms = records.find(r => r.page_type === 'terms_of_service');
      if (terms) {
        setTermsData({
          id: terms.id,
          title: terms.title,
          content: terms.content,
          updated: terms.updated
        });
      }
    } catch (err) {
      console.error("Error fetching legal pages:", err);
      toast.error(t('Failed to load legal pages.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: LegalPageType, data: LegalPageFormState) => {
    const isPrivacy = type === 'privacy_policy';
    const stateKey: 'privacy' | 'terms' = isPrivacy ? 'privacy' : 'terms';

    if (!data.title || !data.content) {
      toast.error(t('Title and content are required.'));
      return;
    }

    setSaving(prev => ({ ...prev, [stateKey]: true }));

    try {
      const payload = {
        title: data.title,
        content: data.content
      };

      // Note: We omit updated_by here if currentUser.id is from master_admins
      // and the collection expects a user from _pb_users_auth_ to prevent FK errors.
      // If we *must* send it, we try, but catch the error if relation fails.
      try {
        await pb.collection('legal_pages').update(data.id as string, {
          ...payload,
          updated_by: currentUser?.id
        }, { $autoCancel: false });
      } catch (updateErr: any) {
        if (updateErr.status === 400) {
          // Fallback without updated_by if relation fails
          await pb.collection('legal_pages').update(data.id as string, payload, { $autoCancel: false });
        } else {
          throw updateErr;
        }
      }

      toast.success(t('Content saved successfully.'));

      // Refresh to get updated timestamp
      fetchPages();
    } catch (err) {
      console.error("Error saving legal page:", err);
      toast.error(t('Failed to save content.'));
    } finally {
      setSaving(prev => ({ ...prev, [stateKey]: false }));
    }
  };

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
              <Card className="shadow-sm border-border/60">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>{t('Privacy Policy Editor')}</CardTitle>
                      <CardDescription>
                        {privacyData.updated && (
                          <span className="flex items-center gap-1.5 mt-1 text-xs">
                            {t('Last updated:')} {format(new Date(privacyData.updated), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openPreview(privacyData.title, privacyData.content)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" /> {t('Preview')}
                      </Button>
                      <Button
                        onClick={() => handleSave('privacy_policy', privacyData)}
                        disabled={saving.privacy || !privacyData.id}
                        className="gap-2"
                      >
                        {saving.privacy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t('Save Changes')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!privacyData.id && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{t('Missing Database Record')}</h4>
                        <p className="text-sm mt-1">{t('The privacy_policy record was not found in the database. Please ensure migrations ran successfully.')}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="privacy-title">{t('Page Title')}</Label>
                    <Input
                      id="privacy-title"
                      value={privacyData.title}
                      onChange={(e) => setPrivacyData({ ...privacyData, title: e.target.value })}
                      placeholder={t('e.g., Privacy Policy')}
                      className="max-w-md bg-background"
                      disabled={!privacyData.id}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Page Content')}</Label>
                    <div className={!privacyData.id ? 'opacity-50 pointer-events-none' : ''}>
                      <RichTextEditor
                        content={privacyData.content}
                        onChange={(val) => setPrivacyData({ ...privacyData, content: val })}
                        placeholder=""
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Terms of Service Tab */}
            <TabsContent value="terms">
              <Card className="shadow-sm border-border/60">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle>{t('Terms of Service Editor')}</CardTitle>
                      <CardDescription>
                        {termsData.updated && (
                          <span className="flex items-center gap-1.5 mt-1 text-xs">
                            {t('Last updated:')} {format(new Date(termsData.updated), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openPreview(termsData.title, termsData.content)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" /> {t('Preview')}
                      </Button>
                      <Button
                        onClick={() => handleSave('terms_of_service', termsData)}
                        disabled={saving.terms || !termsData.id}
                        className="gap-2"
                      >
                        {saving.terms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {t('Save Changes')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!termsData.id && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 mt-0.5" />
                      <div>
                        <h4 className="font-semibold">{t('Missing Database Record')}</h4>
                        <p className="text-sm mt-1">{t('The terms_of_service record was not found in the database. Please ensure migrations ran successfully.')}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="terms-title">{t('Page Title')}</Label>
                    <Input
                      id="terms-title"
                      value={termsData.title}
                      onChange={(e) => setTermsData({ ...termsData, title: e.target.value })}
                      placeholder={t('e.g., Terms of Service')}
                      className="max-w-md bg-background"
                      disabled={!termsData.id}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Page Content')}</Label>
                    <div className={!termsData.id ? 'opacity-50 pointer-events-none' : ''}>
                      <RichTextEditor
                        content={termsData.content}
                        onChange={(val) => setTermsData({ ...termsData, content: val })}
                        placeholder=""
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
