'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  bilingualLabel,
  employeeDisplayName,
  type BilingualName,
  type EmployeeNameParts,
} from '@/lib/bilingualLabel';

interface ActiveFilters {
  statusId?: string | null;
  marketingChannel?: string | null;
  areas?: string[];
  createdFromDate?: string | Date | null;
  createdToDate?: string | Date | null;
  updatedFromDate?: string | Date | null;
  updatedToDate?: string | Date | null;
  employeeId?: string | null;
  propertyTypeId?: string | null;
  classification?: string | null;
  ownerId?: string | null;
  createdBy?: string | null;
}

interface FilterChipsProps {
  activeFilters: ActiveFilters | null;
  statuses?: Array<{ id: string } & BilingualName>;
  marketingChannels?: Array<{ id: string; name: string }>;
  areas?: Array<{ id: string; name: string }>;
  employees?: Array<
    { id: string; name?: string; email?: string } & EmployeeNameParts
  >;
  propertyTypes?: Array<{ id: string } & BilingualName>;
  owners?: Array<{ id: string } & BilingualName>;
  onRemoveFilter: (key: string, value?: string) => void;
}

export default function FilterChips({ activeFilters, statuses = [], marketingChannels = [], areas = [], employees = [], propertyTypes = [], owners = [], onRemoveFilter }: FilterChipsProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  if (!activeFilters) return null;

  const getStatusName = (id: string) => {
    const status = statuses.find(s => s.id === id) as
      | ({ id: string } & BilingualName & { name?: string })
      | undefined;
    if (!status) return t('Unknown Status');
    return (
      bilingualLabel(status, language) ||
      status.name ||
      t('Unknown Status')
    );
  };

  const getAreaName = (id: string) => {
    const area = areas.find(a => a.id === id);
    return area ? area.name : id;
  };

  const getEmployeeName = (id: string) => {
    if (id === 'unassigned') return t('Unassigned');
    const employee = employees.find(e => e.id === id);
    if (!employee) return id;
    return (
      employeeDisplayName(employee, language, employee.name) ||
      employee.email ||
      id
    );
  };

  const getPropertyTypeName = (id: string) => {
    const propertyType = propertyTypes.find(pt => pt.id === id);
    return propertyType ? bilingualLabel(propertyType, language) || id : id;
  };

  const getOwnerName = (id: string) => {
    const owner = owners.find(o => o.id === id);
    return owner ? bilingualLabel(owner, language) || id : id;
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const activeKeys = (Object.keys(activeFilters) as Array<keyof ActiveFilters>).filter(key => {
    const value = activeFilters[key];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== '' && value !== undefined;
  });

  if (activeKeys.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in duration-200">
      {activeFilters.statusId && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Current Status:')}</span> 
          {getStatusName(activeFilters.statusId)}
          <button 
            onClick={() => onRemoveFilter('statusId')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.marketingChannel && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Channel:')}</span> 
          {activeFilters.marketingChannel}
          <button 
            onClick={() => onRemoveFilter('marketingChannel')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      
      {activeFilters.areas && activeFilters.areas.length > 0 && activeFilters.areas.map(areaId => (
        <Badge key={areaId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('area')}:</span> 
          {getAreaName(areaId)}
          <button 
            onClick={() => onRemoveFilter('areas', areaId)}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {activeFilters.createdFromDate && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Created From:')}</span> 
          {formatDate(activeFilters.createdFromDate)}
          <button 
            onClick={() => onRemoveFilter('createdFromDate')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.createdToDate && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Created To:')}</span> 
          {formatDate(activeFilters.createdToDate)}
          <button 
            onClick={() => onRemoveFilter('createdToDate')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.updatedFromDate && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Updated From:')}</span> 
          {formatDate(activeFilters.updatedFromDate)}
          <button 
            onClick={() => onRemoveFilter('updatedFromDate')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.updatedToDate && (
        <Badge variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal mr-1">{t('Updated To:')}</span>
          {formatDate(activeFilters.updatedToDate)}
          <button
            onClick={() => onRemoveFilter('updatedToDate')}
            className="ml-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.employeeId && (
        <Badge variant="secondary" className="ps-2 pe-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal me-1">{t('Employee:')}</span>
          <span dir="auto">{getEmployeeName(activeFilters.employeeId)}</span>
          <button
            onClick={() => onRemoveFilter('employeeId')}
            className="ms-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.propertyTypeId && (
        <Badge variant="secondary" className="ps-2 pe-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal me-1">{t('Property Type:')}</span>
          <span dir="auto">{getPropertyTypeName(activeFilters.propertyTypeId)}</span>
          <button
            onClick={() => onRemoveFilter('propertyTypeId')}
            className="ms-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.classification && (
        <Badge variant="secondary" className="ps-2 pe-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal me-1">{t('Classification:')}</span>
          {activeFilters.classification}
          <button
            onClick={() => onRemoveFilter('classification')}
            className="ms-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.ownerId && (
        <Badge variant="secondary" className="ps-2 pe-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal me-1">{t('Owner:')}</span>
          <span dir="auto">{getOwnerName(activeFilters.ownerId)}</span>
          <button
            onClick={() => onRemoveFilter('ownerId')}
            className="ms-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {activeFilters.createdBy && (
        <Badge variant="secondary" className="ps-2 pe-1 py-1 flex items-center gap-1 bg-muted/80 text-foreground border border-border/50">
          <span className="text-muted-foreground font-normal me-1">{t('Created By:')}</span>
          <span dir="auto">{getEmployeeName(activeFilters.createdBy)}</span>
          <button
            onClick={() => onRemoveFilter('createdBy')}
            className="ms-1 p-0.5 rounded-full hover:bg-background/80 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
};
