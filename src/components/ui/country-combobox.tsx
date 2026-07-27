"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  COUNTRIES,
  countryLabel,
  findCountry,
  normalizeCountryValue,
} from "@/lib/countries";
import { cn } from "@/lib/utils";

type CountryComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function CountryCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: CountryComboboxProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [open, setOpen] = React.useState(false);

  const selected = findCountry(value);
  const displayValue = selected
    ? countryLabel(selected, language)
    : value?.trim() || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between bg-background w-full h-10 px-3 font-normal",
            !displayValue && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {displayValue || placeholder || t("Select Country")}
          </span>
          <ChevronsUpDown className="ms-2 w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[260px]"
        align="start"
      >
        <Command
          filter={(itemValue, search) => {
            const q = search.trim().toLowerCase();
            if (!q) return 1;
            return itemValue.toLowerCase().includes(q) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t("Search country...")} />
          <CommandList>
            <CommandEmpty>{t("No country found.")}</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => {
                const label = countryLabel(country, language);
                const searchValue = [
                  country.code,
                  country.name_en,
                  country.name_ar,
                ].join(" ");
                const isSelected =
                  normalizeCountryValue(value) === country.name_en;

                return (
                  <CommandItem
                    key={country.name_en}
                    value={searchValue}
                    onSelect={() => {
                      onChange(country.name_en);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "me-2 w-4 h-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
