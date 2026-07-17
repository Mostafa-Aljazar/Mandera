'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Smartphone } from 'lucide-react';

const AndroidAppSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="bg-primary text-primary-foreground rounded-3xl overflow-hidden relative shadow-xl">
          {/* Background Texture */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=800&auto=format&fit=crop&q=80')] opacity-10 mix-blend-overlay bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"></div>
          
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center p-8 md:p-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="inline-flex items-center rounded-full bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium text-primary-foreground backdrop-blur-sm border border-primary-foreground/20">
                <Smartphone className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('Mobile Experience')}
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-outfit text-balance">
                {t('Android App Available')}
              </h2>
              <p className="text-lg text-primary-foreground/80 leading-relaxed max-w-lg">
                {t('Manage your CRM system on the go. Download the dedicated Android app to access all features from your mobile device easily and efficiently.')}
              </p>
              
              {/* App Store Badges Layout */}
              <div className="pt-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                
                {/* Google Play Badge */}
                <div className="flex items-center justify-center gap-3 bg-black text-white px-5 py-2.5 rounded-xl hover:scale-105 transition-all duration-300 w-full sm:w-auto border border-white/20 shadow-lg cursor-pointer select-none group">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.5 2.5C3.2 2.7 3 3.1 3 3.6v16.8c0 .5.2.9.5 1.1l.1.1 9.4-9.4v-.2L3.6 2.4l-.1.1z" fill="#00e676"/>
                    <path d="M13 12v-.2l3.1-3.1 1 .6 2.9 1.6c.9.5.9 1.3 0 1.8l-2.9 1.6-1 .6-3.1-3.1V12z" fill="#ffea00"/>
                    <path d="M13 12.2l-9.5 9.5c.3.3.7.3 1.2 0L16.1 15 13 12.2z" fill="#ff2a2a"/>
                    <path d="M13 11.8L16.1 9l-11.4-6.6c-.5-.3-.9-.3-1.2 0L13 11.8z" fill="#29b6f6"/>
                  </svg>
                  <div className="flex flex-col rtl:items-end ltr:items-start text-left rtl:text-right">
                    <span className="text-[10px] uppercase font-medium tracking-wide opacity-90 leading-none mb-1">
                      {t('GET IT ON')}
                    </span>
                    <span className="text-xl font-semibold leading-none font-sans tracking-tight">
                      Google Play
                    </span>
                  </div>
                </div>

                {/* Apple App Store Badge (Coming Soon) */}
                <div className="relative w-full sm:w-auto">
                  {/* Coming Soon Overlay Label */}
                  <div className="absolute -top-3 right-0 sm:-right-4 bg-background text-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-border z-10 whitespace-nowrap animate-in fade-in zoom-in duration-500 delay-300">
                    {t('Coming Soon')}
                  </div>
                  
                  <div className="flex items-center justify-center gap-3 bg-black text-white px-5 py-2.5 rounded-xl border border-white/10 shadow-lg w-full sm:w-auto opacity-70 cursor-not-allowed select-none grayscale-[40%]">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                      <path d="M16.175 10.371c-.046-2.559 2.083-3.812 2.179-3.874-1.196-1.745-3.056-1.982-3.717-2.012-1.585-.16-3.096.936-3.899.936-.803 0-2.056-.913-3.371-.888-1.705.025-3.278.991-4.153 2.518-1.776 3.076-.454 7.625 1.278 10.126.845 1.222 1.841 2.593 3.149 2.543 1.258-.05 1.745-.815 3.267-.815 1.509 0 1.961.815 3.279.79 1.358-.025 2.213-1.247 3.045-2.456 1.01-1.468 1.425-2.894 1.442-2.969-.033-.016-2.775-1.066-2.822-3.924C15.82 12.067 16.175 10.371 16.175 10.371M14.975 4.908c.691-.837 1.156-2.002 1.029-3.158-1.014.041-2.227.674-2.934 1.502-.559.646-1.118 1.834-.974 2.973 1.135.088 2.188-.479 2.879-1.317"/>
                    </svg>
                    <div className="flex flex-col rtl:items-end ltr:items-start text-left rtl:text-right">
                      <span className="text-[10px] font-medium tracking-wide opacity-90 leading-none mb-1">
                        {t('Download on the')}
                      </span>
                      <span className="text-xl font-semibold leading-none font-sans tracking-tight">
                        App Store
                      </span>
                    </div>
                  </div>
                </div>
                
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden md:flex justify-center"
            >
              {/* Abstract Phone Mockup */}
              <div className="relative w-64 h-[450px] bg-background rounded-[3rem] border-[8px] border-primary-foreground/20 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute top-0 inset-x-0 h-6 bg-primary-foreground/20 rounded-b-3xl mx-16"></div>
                <img 
                  src="https://horizons-cdn.hostinger.com/6149b89f-35de-4601-ab2a-f81b6d19b0ae/5fba707efa6344304a51c6d02e75286d.png" 
                  alt="MANDERA CRM App" 
                  className="w-32 opacity-80"
                />
                <div className="mt-8 space-y-3 w-full px-8">
                  <div className="h-2 w-full bg-muted rounded-full"></div>
                  <div className="h-2 w-3/4 bg-muted rounded-full"></div>
                  <div className="h-2 w-5/6 bg-muted rounded-full"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AndroidAppSection;