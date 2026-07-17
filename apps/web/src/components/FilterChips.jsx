'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const FilterChips = ({ activeFilters, statuses = [], marketingChannels = [], areas = [], onRemoveFilter }) => {
  const { t } = useTranslation();
  
  if (!activeFilters) return null;

  const getStatusName = (id) => {
    const status = statuses.find(s => s.id === id);
    return status ? status.name : t('Unknown Status');
  };

  const getAreaName = (id) => {
    const area = areas.find(a => a.id === id);
    return area ? area.name : id;
  };

  const formatDate = (date) => {
    if (!date) return '';
    return format(new Date(date), 'MMM d, yyyy');
  };

  const activeKeys = Object.keys(activeFilters).filter(key => {
    if (Array.isArray(activeFilters[key])) {
      return activeFilters[key].length > 0;
    }
    return activeFilters[key] !== null && activeFilters[key] !== '';
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
    </div>
  );
};

export default FilterChips;