'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, MapPin, User, Home, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import pb from '@/lib/pocketbaseClient';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import { useTranslation } from 'react-i18next';
import StatusUpdateModal from '@/components/StatusUpdateModal.jsx';
import StatusHistoryDisplay from '@/components/StatusHistoryDisplay.jsx';

const OwnerDetailModal = ({ owner, isOpen, onClose }) => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('info');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  
  const [properties, setProperties] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (owner && isOpen && company?.id) {
      fetchOwnerData();
      setActiveTab('info');
    }
  }, [owner, isOpen, company?.id]);

  const fetchOwnerData = async () => {
    if (!owner?.id) return;
    setIsLoading(true);
    try {
      const statusesRes = await pb.collection('owner_statuses').getList(1, 50, {
        filter: `company_id = "${company.id}"`,
        $autoCancel: false,
        sort: 'name'
      });

      const props = await pb.collection('properties').getFullList({
        filter: `owner_id = "${owner.id}"`,
        $autoCancel: false
      });
      
      setProperties(props);
      setStatuses(statusesRes.items);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger(prev => prev + 1);
  };

  if (!isOpen || !owner) return null;

  const cleanPhone = owner.phone?.replace(/\D/g, '') || '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl flex items-center gap-2 font-outfit">
            <User className="h-5 w-5 text-primary" />
            {t('Owner:')} {owner.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col max-h-[85vh]">
          <div className="px-6 pt-4 border-b">
            <TabsList className="grid w-full grid-cols-2 max-w-sm bg-muted/50">
              <TabsTrigger value="info">{t('Info & Properties')}</TabsTrigger>
              <TabsTrigger value="status">{t('Status History')}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="info" className="mt-0 space-y-8">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> {t('Contact Information')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('Full Name')}</p>
                    <p className="font-medium text-lg">{owner.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('Country')}</p>
                    <p className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> {t(owner.country) || t('N/A')}
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-sm text-muted-foreground">{t('Phone Number')}</p>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-lg">{owner.phone}</p>
                      {cleanPhone && (
                        <div className="flex gap-2">
                          <Button asChild variant="outline" size="sm" className="hover:text-primary hover:bg-primary/10 transition-colors">
                            <a href={`tel:${cleanPhone}`} title="Call Owner">
                              <Phone className="h-4 w-4 mr-2" /> {t('Call')}
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="sm" className="hover:text-[#25D366] hover:bg-[#25D366]/10 transition-colors border-border">
                            <a href={`https://wa.me/${cleanPhone}`} target="_blank" rel="noopener noreferrer" title="WhatsApp Owner">
                              <MessageCircle className="h-4 w-4 mr-2" /> {t('WhatsApp')}
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" /> {t('Linked Properties')} ({properties.length})
                </h3>
                {isLoading ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : properties.length === 0 ? (
                  <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center text-muted-foreground">
                    {t('No properties linked to this owner yet.')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {properties.map(prop => (
                      <div key={prop.id} className="bg-card border rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition-colors shadow-sm">
                        <div>
                          <p className="font-bold text-primary">{prop.code}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{prop.title}</p>
                        </div>
                        <Button asChild variant="ghost" size="icon" className="shrink-0">
                          <Link href={`/properties/${prop.id}`} target="_blank">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-0 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                
                <div className="lg:col-span-5">
                   <StatusUpdateModal 
                      entityType="owner"
                      entityData={owner}
                      statuses={statuses}
                      onSuccess={handleStatusSuccess}
                   />
                </div>

                <div className="lg:col-span-7 h-[500px]">
                   <StatusHistoryDisplay 
                      entityType="owner"
                      entityId={owner?.id}
                      refreshTrigger={historyRefreshTrigger}
                   />
                </div>
                
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerDetailModal;