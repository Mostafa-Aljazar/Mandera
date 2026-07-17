'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit2, MapPin, Maximize, Phone, MessageCircle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import type { Property } from '../../types/pocketbase.types';

const STATUS_COLORS: Record<string, string> = {
  'Available': 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20',
  'Sold': 'bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20',
  'Rented': 'bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20',
  'Hold': 'bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20',
  'Deal Completed': 'bg-slate-500/10 text-slate-600 border-slate-200 hover:bg-slate-500/20'
};

interface PropertyCardData extends Property {
  expand?: {
    area_district?: { name?: string };
    employee_id?: { name?: string; email?: string; phone?: string };
  };
}

interface PropertyCardProps {
  property: PropertyCardData;
  onEdit: (property: PropertyCardData) => void;
  onView: (property: PropertyCardData) => void;
  onStatusChange?: (propertyId: string, status: string) => void;
}

const PropertyCard = ({ property, onEdit, onView, onStatusChange }: PropertyCardProps) => {
  const { t } = useTranslation();
  const imageUrl = property.images?.length
    ? pb.files.getUrl(property as unknown as { id: string; collectionId: string; collectionName: string }, property.images[0], { thumb: '400x300' })
    : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop&q=80';

  const currentStatus = property.status || 'Available';
  const statusColor = STATUS_COLORS[currentStatus] || STATUS_COLORS['Available'];
  
  const areaName = property.expand?.area_district?.name || property.area || property.emirate;
  const employeeName: string = property.expand?.employee_id?.name || property.expand?.employee_id?.email || t('Unassigned');
  const employeePhone = property.expand?.employee_id?.phone || '';

  return (
    <Card className="group overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300 border-border/50">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={property.title || 'Property image'} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
          <Badge variant={property.listing_type === 'Sale' ? 'default' : 'secondary'} className="shadow-sm">
            {t(`For ${property.listing_type}`)}
          </Badge>
          <Badge variant="outline" className={`shadow-sm backdrop-blur-md bg-background/90 ${statusColor}`}>
            {t(currentStatus)}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm shadow-sm font-mono text-xs">
            {property.code}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
        </div>
        <p className="text-2xl font-bold text-primary mb-4">
          AED {property.price?.toLocaleString()}
        </p>
        
        <div className="space-y-3 text-sm text-muted-foreground mt-auto mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-primary/80" />
              <span className="line-clamp-1">{areaName}</span>
            </div>
            {(property.building_area || property.land_area) && (
              <div className="flex items-center gap-1.5 font-medium">
                <Maximize className="h-4 w-4 shrink-0 text-primary/80" />
                <span>{property.building_area || property.land_area} {t('sqft')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                {employeeName.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-foreground line-clamp-1 max-w-[130px]">{employeeName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 hover:text-primary hover:bg-primary/10">
                <a href={`tel:+${employeePhone}`} title={t('Call Agent')}>
                  <Phone className="h-3.5 w-3.5" />
                </a>
              </Button>
              <Button asChild variant="ghost" size="icon" className="h-7 w-7 hover:text-[#25D366] hover:bg-[#25D366]/10">
                <a href={`https://wa.me/${employeePhone}?text=Property%20Code:%20${property.code}`} target="_blank" rel="noopener noreferrer" title={t('WhatsApp Agent')}>
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Status Update */}
        {onStatusChange && currentStatus !== 'Deal Completed' && (
          <div className="mt-auto pt-3 border-t border-border/50">
            <Select 
              value={currentStatus} 
              onValueChange={(val) => onStatusChange(property.id, val)}
            >
              <SelectTrigger className="h-8 text-xs bg-muted/30">
                <SelectValue placeholder={t('Update Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">{t('Available')}</SelectItem>
                <SelectItem value="Sold">{t('Sold')}</SelectItem>
                <SelectItem value="Rented">{t('Rented')}</SelectItem>
                <SelectItem value="Hold">{t('Hold')}</SelectItem>
                <SelectItem value="Deal Completed">{t('Deal Completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-3 border-t bg-muted/20 mt-0 flex items-center justify-end">
        <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => onView(property)}>
          <Eye className="h-4 w-4" /> {t('View')}
        </Button>
        <Button variant="default" size="sm" className="gap-2 w-full" onClick={() => onEdit(property)}>
          <Edit2 className="h-4 w-4" /> {t('Edit')}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;