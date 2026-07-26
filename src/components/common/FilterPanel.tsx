'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { CalendarPlus as CalendarIcon, Filter, X, Check, SlidersHorizontal, Tag, MapPin, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

interface DatePickerPopoverProps {
  date: Date | null;
  setDate: (date: Date | undefined) => void;
  label: string;
}

const DatePickerPopover = ({ date, setDate, label }: DatePickerPopoverProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col space-y-1.5">
      <Label className="font-medium text-muted-foreground text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start bg-background w-full h-10 font-normal text-start",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="me-2 w-4 h-4 shrink-0 text-primary/70" />
            {date ? format(date, "PPP") : <span>{t("Pick a date")}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start">
          <Calendar
            mode="single"
            selected={date ?? undefined}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface FilterPanelProps {
  statuses?: Array<{ id: string; name: string }>;
  marketingChannels?: Array<{ id: string; name: string }>;
  areas?: Array<{ id: string; name: string }>;
  showPriceFilters?: boolean;
  onApplyFilters: (filters: Record<string, unknown>) => void;
  onClearFilters: () => void;
  onPriceChange?: (prices: { minPrice: string; maxPrice: string }) => void;
}

export default function FilterPanel({
  statuses = [],
  marketingChannels = [],
  areas = [],
  showPriceFilters = false,
  onApplyFilters,
  onClearFilters,
  onPriceChange
}: FilterPanelProps) {
  const { t } = useTranslation();
  const [statusId, setStatusId] = useState('');
  const [marketingChannel, setMarketingChannel] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [createdFromDate, setCreatedFromDate] = useState<Date | null>(null);
  const [createdToDate, setCreatedToDate] = useState<Date | null>(null);
  const [updatedFromDate, setUpdatedFromDate] = useState<Date | null>(null);
  const [updatedToDate, setUpdatedToDate] = useState<Date | null>(null);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (onPriceChange) {
      onPriceChange({ minPrice, maxPrice });
    }
  }, [minPrice, maxPrice, onPriceChange]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (statusId && statusId !== 'all') count += 1;
    if (marketingChannel && marketingChannel !== 'all') count += 1;
    if (selectedAreas.length > 0) count += selectedAreas.length;
    if (createdFromDate) count += 1;
    if (createdToDate) count += 1;
    if (updatedFromDate) count += 1;
    if (updatedToDate) count += 1;
    if (minPrice) count += 1;
    if (maxPrice) count += 1;
    return count;
  }, [statusId, marketingChannel, selectedAreas, createdFromDate, createdToDate, updatedFromDate, updatedToDate, minPrice, maxPrice]);

  const handleMinBlur = () => {
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setMinPrice(maxPrice);
    }
  };

  const handleMaxBlur = () => {
    if (minPrice && maxPrice && Number(maxPrice) < Number(minPrice)) {
      setMaxPrice(minPrice);
    }
  };

  const handleApply = () => {
    onApplyFilters({
      statusId: statusId === 'all' || statusId === '' ? null : statusId,
      marketingChannel: marketingChannel === 'all' || marketingChannel === '' ? null : marketingChannel,
      areas: selectedAreas,
      createdFromDate,
      createdToDate,
      updatedFromDate,
      updatedToDate,
      minPrice,
      maxPrice
    });
  };

  const handleClear = () => {
    setStatusId('');
    setMarketingChannel('');
    setSelectedAreas([]);
    setCreatedFromDate(null);
    setCreatedToDate(null);
    setUpdatedFromDate(null);
    setUpdatedToDate(null);
    setMinPrice('');
    setMaxPrice('');
    onClearFilters();
  };

  const toggleArea = (id: string) => {
    setSelectedAreas(prev => 
      prev.includes(id) ? prev.filter(areaId => areaId !== id) : [...prev, id]
    );
  };

  const hasStatusFilters = statuses.length > 0 || marketingChannels.length > 0 || areas.length > 0;
  const hasDateFilters = true;

  return (
    <div className="relative bg-gradient-to-br from-muted/40 via-card to-card shadow-[var(--shadow-subtle)] border border-border/60 rounded-2xl overflow-hidden">
      <div
        className="top-0 absolute inset-x-0 bg-gradient-to-b from-primary/[0.06] to-transparent h-20 pointer-events-none"
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-3 px-5 py-4 border-border/50 border-b">
        <div className="flex items-center gap-3">
          <span className="flex justify-center items-center bg-primary/10 rounded-xl w-9 h-9 text-primary">
            <SlidersHorizontal className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-outfit font-semibold text-foreground text-sm">
              {t('Advanced Filters')}
            </h3>
            <p className="text-muted-foreground text-xs">
              {t('Refine your search with multiple criteria')}
            </p>
          </div>
        </div>
        {activeCount > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary tabular-nums">
            {activeCount} {t('active')}
          </Badge>
        )}
      </div>

      <div className="relative p-5 space-y-5">
        {/* Status & Source section */}
        {hasStatusFilters && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary/70" />
              <h4 className="font-medium text-foreground text-xs uppercase tracking-wide">
                {t('Status & Source')}
              </h4>
            </div>
            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {statuses.length > 0 && (
                <div className="flex flex-col space-y-1.5">
                  <Label className="font-medium text-muted-foreground text-xs">{t('Current Status')}</Label>
                  <Select value={statusId} onValueChange={setStatusId}>
                    <SelectTrigger className="bg-background w-full h-10">
                      <SelectValue placeholder={t('All Current Statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Current Statuses')}</SelectItem>
                      {statuses.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {marketingChannels.length > 0 && (
                <div className="flex flex-col space-y-1.5">
                  <Label className="font-medium text-muted-foreground text-xs">{t('Marketing Channel')}</Label>
                  <Select value={marketingChannel} onValueChange={setMarketingChannel}>
                    <SelectTrigger className="bg-background w-full h-10">
                      <SelectValue placeholder={t('All Channels')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Channels')}</SelectItem>
                      {marketingChannels.map(mc => (
                        <SelectItem key={mc.id} value={mc.name}>{mc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {areas.length > 0 && (
                <div className="flex flex-col space-y-1.5">
                  <Label className="font-medium text-muted-foreground text-xs">{t('areas')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="justify-between bg-background w-full h-10 px-3 font-normal"
                      >
                        {selectedAreas.length === 0 ? (
                          <span className="text-muted-foreground">{t('selectAreas')}</span>
                        ) : (
                          <span className="truncate">{selectedAreas.length} {t('selected')}</span>
                        )}
                        <MapPin className="ms-2 w-4 h-4 shrink-0 text-primary/70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                      <Command>
                        <CommandInput placeholder={t('searchAreas')} />
                        <CommandList>
                          <CommandEmpty>{t('noAreasFound')}</CommandEmpty>
                          <CommandGroup>
                            {areas.map((area) => (
                              <CommandItem
                                key={area.id}
                                onSelect={() => toggleArea(area.id)}
                              >
                                <Check
                                  className={cn(
                                    "me-2 w-4 h-4",
                                    selectedAreas.includes(area.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {area.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Price section */}
        {showPriceFilters && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-primary/70" />
              <h4 className="font-medium text-foreground text-xs uppercase tracking-wide">
                {t('Price Range')}
              </h4>
            </div>
            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2">
              <div className="flex flex-col space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">{t('Min Price')}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  onBlur={handleMinBlur}
                  className="bg-background h-10"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label className="font-medium text-muted-foreground text-xs">{t('Max Price')}</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={t('Any')}
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  onBlur={handleMaxBlur}
                  className="bg-background h-10"
                />
              </div>
            </div>
          </section>
        )}

        {/* Date section */}
        {hasDateFilters && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-primary/70" />
              <h4 className="font-medium text-foreground text-xs uppercase tracking-wide">
                {t('Date Range')}
              </h4>
            </div>
            <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <DatePickerPopover 
                date={createdFromDate} 
                setDate={setCreatedFromDate} 
                label={t('Created From')} 
              />
              <DatePickerPopover 
                date={createdToDate} 
                setDate={setCreatedToDate} 
                label={t('Created To')} 
              />
              <DatePickerPopover 
                date={updatedFromDate} 
                setDate={setUpdatedFromDate} 
                label={t('Updated From')} 
              />
              <DatePickerPopover 
                date={updatedToDate} 
                setDate={setUpdatedToDate} 
                label={t('Updated To')} 
              />
            </div>
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/20 px-5 py-4 border-border/50 border-t">
        <p className="text-muted-foreground text-xs">
          {activeCount > 0
            ? t('{{count}} filter(s) ready to apply', { count: activeCount })
            : t('No filters selected')}
        </p>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1 sm:flex-none gap-2 h-10"
          >
            <X className="w-4 h-4" />
            {t('Clear Filters')}
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 sm:flex-none gap-2 h-10"
          >
            <Filter className="w-4 h-4" />
            {t('Apply Filters')}
          </Button>
        </div>
      </div>
    </div>
  );
};
