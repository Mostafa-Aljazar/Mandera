'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageCircle, MapPin, Maximize, Home, Briefcase, FileText, User } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import StatusUpdateModal from '@/components/StatusUpdateModal';
import StatusHistoryDisplay from '@/components/StatusHistoryDisplay';
import type { Property } from '../../types/pocketbase.types';

interface PropertyDetailData extends Property {
  expand?: {
    employee_id?: { name?: string; firstName?: string; lastName?: string; email?: string };
    type?: { name?: string };
    area_district?: { name?: string };
  };
}

interface PropertyDetailModalProps {
  property: PropertyDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const PropertyDetailModal = ({ property, isOpen, onClose, onStatusUpdated }: PropertyDetailModalProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('details');
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  useEffect(() => {
    if (property && isOpen) {
      setActiveTab('details');
    }
  }, [property, isOpen]);

  const handleStatusSuccess = () => {
    toast.success(t('Property status updated successfully'));
    setHistoryRefreshTrigger(prev => prev + 1);
    if (onStatusUpdated) onStatusUpdated();
  };

  if (!property) return null;

  const agent = property.expand?.employee_id;
  const propertyType = property.expand?.type?.name || t('Unknown');
  
  const areaDisplayName = property.expand?.area_district?.name 
    ? `${property.expand.area_district.name}${property.area ? ` (${property.area})` : ''}` 
    : (property.area || 'Unknown Area');

  const hasImages = property.images && property.images.length > 0;
  const images = hasImages
    ? property.images!.map(img => pb.files.getUrl(property as unknown as { id: string; collectionId: string; collectionName: string }, img))
    : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-background">
        <div className="flex flex-col max-h-[90vh] overflow-y-auto">
          
          <div className="relative bg-muted">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar h-[250px] md:h-[350px]">
              {images.map((url, i) => (
                <div key={i} className="min-w-full h-full shrink-0 snap-center relative bg-muted flex items-center justify-center">
                  <img src={url} alt={`${property.title} - ${i+1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap justify-between items-end gap-4 text-white">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default" className="bg-primary hover:bg-primary/90 shadow-sm border-transparent">{t('For')} {t(property.listing_type)}</Badge>
                  <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-white/10 shadow-sm">{t(propertyType)}</Badge>
                  <Badge variant="outline" className="bg-black/40 text-white backdrop-blur-md border-white/20 shadow-sm">{t(property.status || 'Available')}</Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">{property.title}</h1>
                <div className="flex items-center gap-2 text-white/90 bg-black/20 w-fit px-2 py-1 rounded-md backdrop-blur-sm text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{areaDisplayName}, {t(property.emirate)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold font-outfit">AED {property.price?.toLocaleString()}</p>
                <p className="font-mono text-sm text-white/80 bg-black/30 px-2 py-1 rounded mt-2 inline-block backdrop-blur-sm">
                  {t('Ref:')} {property.code}
                </p>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
            <div className="px-6 pt-4 border-b bg-muted/10">
              <TabsList className="grid w-full grid-cols-2 max-w-sm bg-muted/50">
                <TabsTrigger value="details">{t('Property Details')}</TabsTrigger>
                <TabsTrigger value="status">{t('Status History')}</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 md:p-8">
              <TabsContent value="details" className="mt-0 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" /> {t('Key Information')}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="bg-muted/50 p-4 rounded-xl border border-border/50 transition-colors hover:border-border">
                        <p className="text-sm text-muted-foreground mb-1">{t('Land Area')}</p>
                        <p className="font-semibold flex items-center gap-2">
                          <Maximize className="h-4 w-4 text-muted-foreground" />
                          {property.land_area ? `${property.land_area} sqft` : t('N/A')}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border border-border/50 transition-colors hover:border-border">
                        <p className="text-sm text-muted-foreground mb-1">{t('Bua')}</p>
                        <p className="font-semibold flex items-center gap-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          {property.building_area ? `${property.building_area} sqft` : t('N/A')}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 rounded-xl border border-border/50 transition-colors hover:border-border">
                        <p className="text-sm text-muted-foreground mb-1">{t('Commission')}</p>
                        <p className="font-semibold flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {property.commission_percentage ? `${property.commission_percentage}%` : t('N/A')}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-semibold mb-4">{t('Description')}</h3>
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      {property.description ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{property.description}</p>
                      ) : (
                        <p className="italic bg-muted/30 p-6 rounded-xl text-center">{t('No description provided for this property.')}</p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="bg-card border rounded-2xl p-6 shadow-sm">
                    <h3 className="font-semibold mb-6 text-center text-sm uppercase tracking-wider text-muted-foreground">{t('Responsible Agent')}</h3>
                    {agent ? (
                      <div className="space-y-6 text-center">
                        <div className="h-20 w-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold mx-auto ring-4 ring-primary/5">
                          {(agent.name || agent.firstName || agent.email || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-lg text-foreground">{agent.name || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'Agent'}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{agent.email}</p>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          <Button asChild className="w-full gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white shadow-sm" size="lg">
                            <a href={`https://wa.me/`} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-4 w-4" /> {t('WhatsApp')}
                            </a>
                          </Button>
                          <Button asChild variant="outline" className="w-full gap-2 border-border/60 hover:bg-primary/5 hover:text-primary transition-colors" size="lg">
                            <a href={`tel:`}>
                              <Phone className="h-4 w-4" /> {t('Call Agent')}
                            </a>
                          </Button>
                          <Button asChild variant="secondary" className="w-full gap-2" size="lg">
                            <a href={`mailto:${agent.email}`}>
                              <Mail className="h-4 w-4" /> {t('Email')}
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-6 bg-muted/30 rounded-xl border border-dashed">
                        <User className="h-8 w-8 mx-auto opacity-20 mb-2" />
                        <p className="text-sm">{t('No agent assigned.')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="status" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  <div className="lg:col-span-4">
                     <StatusUpdateModal
                        entityType="property"
                        entityData={property}
                        onSuccess={handleStatusSuccess}
                     />
                  </div>

                  <div className="lg:col-span-8 h-[500px]">
                     <StatusHistoryDisplay 
                        entityType="property"
                        entityId={property?.id}
                        refreshTrigger={historyRefreshTrigger}
                     />
                  </div>
                  
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailModal;