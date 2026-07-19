"use client";

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
};

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled,
  placeholder,
  className,
  id,
  name,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const locale = i18n.language?.startsWith("ar") ? ar : enUS;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          name={name}
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start bg-background px-3 border-border/60 rounded-xl w-full h-11 font-normal text-start",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="me-2 w-4 h-4 text-muted-foreground shrink-0" />
          {selected ? (
            <span dir="ltr">{format(selected, "PPP", { locale })}</span>
          ) : (
            <span>{placeholder || t("Pick a date")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto border-border/60 rounded-xl" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIsoDate(date) : "");
            setOpen(false);
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
            return false;
          }}
          initialFocus
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}
