'use client';

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { CalendarPlus as CalendarIcon, Filter, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

const DatePickerPopover = ({ date, setDate, label }) => {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-background h-9",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const FilterPanel = ({ 
  statuses = [], 
  marketingChannels = [], 
  areas = [],
  showPriceFilters = false, 
  onApplyFilters, 
  onClearFilters,
  onPriceChange
}) => {
  const { t } = useTranslation();
  const [statusId, setStatusId] = useState('');
  const [marketingChannel, setMarketingChannel] = useState('');
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [createdFromDate, setCreatedFromDate] = useState(null);
  const [createdToDate, setCreatedToDate] = useState(null);
  const [updatedFromDate, setUpdatedFromDate] = useState(null);
  const [updatedToDate, setUpdatedToDate] = useState(null);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Notify parent in real-time when price filters change
  useEffect(() => {
    if (onPriceChange) {
      onPriceChange({ minPrice, maxPrice });
    }
  }, [minPrice, maxPrice, onPriceChange]);

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

  const toggleArea = (id) => {
    setSelectedAreas(prev => 
      prev.includes(id) ? prev.filter(areaId => areaId !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 md:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">{t('Advanced Filters')}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statuses && statuses.length > 0 && (
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('Current Status')}</Label>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger className="w-full bg-background h-9">
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

        {areas && areas.length > 0 && (
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('areas')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between bg-background h-9 px-3 font-normal"
                >
                  {selectedAreas.length === 0 ? (
                    <span className="text-muted-foreground">{t('selectAreas')}</span>
                  ) : (
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{selectedAreas.length} {t('selected')}</span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
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
                              "mr-2 h-4 w-4",
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

        {marketingChannels && marketingChannels.length > 0 && (
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">{t('Marketing Channel')}</Label>
            <Select value={marketingChannel} onValueChange={setMarketingChannel}>
              <SelectTrigger className="w-full bg-background h-9">
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

        {showPriceFilters && (
          <>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('Min Price')}</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                onBlur={handleMinBlur}
                className="h-9 bg-background"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('Max Price')}</Label>
              <Input
                type="number"
                min="0"
                placeholder={t('Any')}
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                onBlur={handleMaxBlur}
                className="h-9 bg-background"
              />
            </div>
          </>
        )}

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

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t mt-4">
        <Button variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4 mr-2" /> {t('Clear Filters')}
        </Button>
        <Button onClick={handleApply} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {t('Apply Filters')}
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;