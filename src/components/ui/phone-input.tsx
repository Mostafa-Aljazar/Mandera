"use client"

import * as React from "react"
import RPNInput, {
  getCountryCallingCode,
  type Country,
  type Labels,
  type Value as RPNValue,
} from "react-phone-number-input"
import flags from "react-phone-number-input/flags"
import enLabels from "react-phone-number-input/locale/en.json"
import arLabels from "react-phone-number-input/locale/ar.json"
import "react-phone-number-input/style.css"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage } from "@/contexts/LanguageContext"

export type PhoneInputValue = RPNValue | "" | undefined

export interface PhoneInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RPNInput>, "onChange" | "value"> {
  value?: PhoneInputValue
  onChange: (value: string) => void
}

type CountryOption = {
  value?: Country
  label: string
  divider?: boolean
}

type PhoneCountrySelectProps = {
  value?: Country
  options: CountryOption[]
  onChange: (value: Country | undefined) => void
  onFocus?: React.FocusEventHandler
  onBlur?: React.FocusEventHandler
  disabled?: boolean
  readOnly?: boolean
  iconComponent: React.ElementType
  name?: string
  "aria-label"?: string
}

function dialCodeFor(country?: Country): string | null {
  if (!country) return null
  try {
    return `+${getCountryCallingCode(country)}`
  } catch {
    return null
  }
}

function PhoneCountrySelect({
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  iconComponent: Icon,
  name,
  "aria-label": ariaLabel,
}: PhoneCountrySelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const isDisabled = disabled || readOnly

  const selected = options.find(
    (option) => !option.divider && option.value === value,
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          name={name}
          aria-label={ariaLabel}
          disabled={isDisabled}
          onFocus={onFocus}
          onBlur={onBlur}
          className="PhoneInputCountry"
        >
          {selected ? (
            <Icon
              aria-hidden
              country={value}
              label={selected.label}
            />
          ) : null}
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground opacity-70 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[min(92vw,22rem)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command
          filter={(itemValue, search) => {
            const q = search.trim().toLowerCase()
            if (!q) return 1
            return itemValue.toLowerCase().includes(q) ? 1 : 0
          }}
        >
          <CommandInput placeholder={t("Search country...")} />
          <CommandList className="max-h-64">
            <CommandEmpty>{t("No country found.")}</CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => {
                if (option.divider) {
                  return (
                    <div
                      key={`divider-${index}`}
                      className="bg-border my-1 h-px"
                      aria-hidden
                    />
                  )
                }

                const country = option.value
                const dial = dialCodeFor(country)
                const isSelected = country === value
                const searchValue = [option.label, dial, country]
                  .filter(Boolean)
                  .join(" ")

                return (
                  <CommandItem
                    key={country || `intl-${index}`}
                    value={searchValue}
                    onSelect={() => {
                      onChange(country)
                      setOpen(false)
                    }}
                    className="justify-between gap-3"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate text-start">{option.label}</span>
                    </span>
                    {dial ? (
                      <span
                        className="font-medium text-muted-foreground text-xs tabular-nums shrink-0"
                        dir="ltr"
                      >
                        {dial}
                      </span>
                    ) : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const PhoneNumberInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input">
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "border-0 rounded-none shadow-none bg-transparent focus-visible:ring-0",
      className,
    )}
    {...props}
  />
))
PhoneNumberInput.displayName = "PhoneNumberInput"

/**
 * shadcn-styled wrapper around react-phone-number-input. Uses a custom
 * country popover so each option can show name (start) and dial code (end).
 */
const PhoneInput = ({ className, onChange, labels, ...props }: PhoneInputProps) => {
  const { language } = useLanguage()
  const localeLabels =
    labels ?? ((language === "ar" ? arLabels : enLabels) as Labels)

  return (
    <RPNInput
      className={cn("phone-input flex items-center", className)}
      flags={flags}
      labels={localeLabels}
      international
      countryCallingCodeEditable={false}
      defaultCountry="AE"
      inputComponent={PhoneNumberInput}
      countrySelectComponent={PhoneCountrySelect}
      onChange={(value) => onChange(value || "")}
      {...props}
    />
  )
}
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
