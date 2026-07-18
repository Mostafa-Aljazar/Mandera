"use client"

import * as React from "react"
import RPNInput, { type Value as RPNValue } from "react-phone-number-input"
import flags from "react-phone-number-input/flags"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export type PhoneInputValue = RPNValue | undefined

export interface PhoneInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof RPNInput>, "onChange" | "value"> {
  value?: PhoneInputValue;
  onChange: (value: PhoneInputValue) => void;
}

const PhoneNumberInput = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => (
    <Input ref={ref} className={cn("rounded-s-none", className)} {...props} />
  )
)
PhoneNumberInput.displayName = "PhoneNumberInput"

/**
 * shadcn-styled wrapper around react-phone-number-input. Renders the
 * library's own country/flag select (kept for its searchable dial-code
 * list) skinned via `.PhoneInput*` rules in globals.css so it matches the
 * app's Input/Select tokens, with the number field itself swapped for the
 * shadcn Input component.
 */
const PhoneInput = ({ className, onChange, ...props }: PhoneInputProps) => {
  return (
    <RPNInput
      className={cn("phone-input flex items-center", className)}
      flags={flags}
      international
      countryCallingCodeEditable={false}
      defaultCountry="AE"
      inputComponent={PhoneNumberInput}
      onChange={(value) => onChange(value || undefined)}
      {...props}
    />
  );
}
PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
