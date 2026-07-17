'use client';

import React from 'react';
import { Helmet } from 'react-helmet';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, Users, Briefcase, ArrowRight, ShieldCheck, Check, Info, MessageCircle, Mail } from 'lucide-react';
import PublicHeader from '@/components/PublicHeader';
import AndroidAppSection from '@/components/AndroidAppSection';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const HomePage = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <>
      <Helmet>
        <title>{t('platformName')}</title>
        <meta name="description" content={t('hero_subtitle')} />
      </Helmet>

      <PublicHeader />

      <main className="min-h-[calc(100vh-73px)]">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden bg-gradient-to-b from-background to-muted/50 min-h-[80vh] flex items-center">
          <div className="absolute inset-0 bg-primary/5 pattern-grid-lg mix-blend-multiply opacity-30"></div>
          <div className="container relative z-10 mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-2 shadow-sm">
                <ShieldCheck className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('hero_badge')}
              </div>

              <div className="flex justify-center mb-6">
                <img
                  src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png"
                  alt={t('platformName')}
                  className="h-16 md:h-20"
                />
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-balance text-foreground font-outfit">
                {t('hero_title')}
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto">
                {t('hero_subtitle')}
              </p>
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/company-login">
                  <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
                    {t('hero_cta')} <ArrowRight className="ml-2 h-5 w-5 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section - Zig Zag */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4 space-y-24">

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Building2 className="h-7 w-7" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-balance font-outfit">{t('feat1_title')}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('feat1_desc')}
                </p>
              </motion.div>
              <div className="bg-muted rounded-3xl aspect-[4/3] flex items-center justify-center shadow-xl border border-border/50 overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay z-10 pointer-events-none"></div>
                <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80" alt="Modern home exterior" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="bg-muted rounded-3xl aspect-[4/3] flex items-center justify-center shadow-xl border border-border/50 overflow-hidden order-last md:order-first relative">
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay z-10 pointer-events-none"></div>
                <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80" alt="Client meeting in a modern office" className="w-full h-full object-cover" />
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Users className="h-7 w-7" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-balance font-outfit">{t('feat2_title')}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('feat2_desc')}
                </p>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Briefcase className="h-7 w-7" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-balance font-outfit">{t('feat3_title')}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t('feat3_desc')}
                </p>
              </motion.div>
              <div className="bg-muted rounded-3xl aspect-[4/3] flex items-center justify-center shadow-xl border border-border/50 overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/5 mix-blend-overlay z-10 pointer-events-none"></div>
                <img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?w=800&auto=format&fit=crop&q=80" alt="Modern office environment" className="w-full h-full object-cover" />
              </div>
            </div>

          </div>
        </section>

        {/* Trial Banner Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 md:p-12 text-center max-w-4xl mx-auto shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground font-outfit mb-6">
                {t('trial_banner_title')}
              </h2>
              <div className="text-lg text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                <span>{t('trial_banner_register')}</span>
                <a
                  href="https://wa.me/971502048865"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#25D366] hover:underline font-medium bg-[#25D366]/10 px-4 py-1.5 rounded-full transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t('trial_banner_whatsapp')} 971502048865
                </a>
                <span>{t('trial_banner_or')}</span>
                <a
                  href="mailto:info@mandera.site"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium bg-primary/10 px-4 py-1.5 rounded-full transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  info@mandera.site
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-24 bg-primary/5 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-bold tracking-tight font-outfit mb-4">{t('pricing_title')}</h2>
              <p className="text-lg text-muted-foreground">{t('pricing_subtitle')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">

              {/* Free Trial Card */}
              <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-sm flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t('plan_trial_title')}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-bold text-primary">{t('plan_trial_price')}</span>
                  </div>
                  <p className="text-muted-foreground">{t('plan_trial_desc')}</p>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{t('feat1_title')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{t('feat2_title')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground/80">{t('feat3_title')}</span>
                  </li>
                </ul>
                <Link href="/company-login" className="mt-auto">
                  <Button variant="outline" className="w-full h-12 text-base">{t('hero_cta')}</Button>
                </Link>
              </div>

              {/* Paid Plan Card (Highlighted) */}
              <div className="bg-primary text-primary-foreground border border-primary rounded-3xl p-8 shadow-xl scale-105 relative z-10 flex flex-col h-full">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="mb-6 relative z-10">
                  <h3 className="text-xl font-semibold mb-2">{t('plan_paid_title')}</h3>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-5xl font-bold">{t('plan_paid_price')}</span>
                    <span className="text-primary-foreground/80">{t('plan_paid_unit')}</span>
                  </div>
                  <p className="text-primary-foreground/90">{t('plan_paid_desc')}</p>
                </div>

                <div className="bg-primary-foreground/10 rounded-xl p-4 mb-8 border border-primary-foreground/20 backdrop-blur-sm relative z-10">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 shrink-0 mt-0.5 opacity-80" />
                    <p className="text-sm font-medium">{t('calc_example_1')}</p>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1 relative z-10">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{t('Unlimited property listings')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{t('Advanced client tracking')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{t('Full team management')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="text-sm">{t('Revenue & commission analytics')}</span>
                  </li>
                </ul>
                <Link href="/company-login" className="mt-auto relative z-10">
                  <Button variant="secondary" className="w-full h-12 text-base font-semibold text-primary shadow-md hover:shadow-lg transition-all">
                    {t('hero_cta')}
                  </Button>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Android App Section */}
        <AndroidAppSection />
      </main>

      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-primary">
            <img
              src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/61673acd93c0f988a7668a1bcdc561f5.png"
              alt={t('platformName')}
              className="h-6 grayscale opacity-80"
            />
            <span className="font-bold font-outfit text-foreground/80">{t('platformName')}</span>
          </div>
          <p className="text-sm text-muted-foreground">{t('footer_rights', { year: currentYear })}</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('footer_privacy')}
            </Link>
            <Link href="/terms-of-service" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('footer_terms')}
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
};

export default HomePage;
