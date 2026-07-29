"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { searchPfLocations } from "@/actions/portalPublishing";
import { usePortalPublicConfig } from "@/hooks/queries/usePortalPublishing";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Loader2,
  MapPin,
  X,
  AlertCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PfLocation } from "@/lib/portals/propertyfinder/client";

interface Props {
  companyId?: string;
  /** Currently selected PF location id (numeric string or number). */
  value: string | number;
  onChange: (id: number | "") => void;
}

// PropertyFinder's location index only understands English/Latin names
// (their docs example is `search=Marina`). Arabic input reliably 404s, so we
// catch it client-side instead of round-tripping to the API.
const ARABIC_CHARS = /[؀-ۿ]/;

/**
 * Searchable combobox for picking a PropertyFinder location (PF requires a
 * hand-picked location id — there is no bulk "list all" endpoint, only a
 * server-side, min-2-char search). Debounced search via a server action.
 * Needs api_key + api_secret configured in company Settings → Portals.
 */
export default function PfLocationPicker({ companyId, value, onChange }: Props) {
  const { t } = useTranslation();
  const { data: configs, isLoading: credsLoading } = usePortalPublicConfig(companyId);
  const pfConfig = configs?.find((c) => c.platform === "propertyfinder") ?? null;
  const isConfigured = Boolean(pfConfig?.has_api_credentials);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PfLocation[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfiguredFromSearch, setNotConfiguredFromSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotConfigured =
    (!credsLoading && companyId && !isConfigured) || notConfiguredFromSearch;
  const isArabicQuery = ARABIC_CHARS.test(query);

  useEffect(() => {
    if (!companyId || !isConfigured || query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    // PropertyFinder's location index is English-only — searching in Arabic
    // reliably fails on their side (404, not an empty result), so don't even
    // call the API; guide the user instead.
    if (isArabicQuery) {
      setResults([]);
      setError(
        t(
          'PropertyFinder locations are indexed in English only. Please type the area name in English, e.g. "Dubai Marina".',
        ),
      );
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setNotConfiguredFromSearch(false);
      const res = await searchPfLocations(companyId!, query);
      setLoading(false);
      if (res.error) {
        const isConfig =
          res.error.toLowerCase().includes("not configured") ||
          res.error.toLowerCase().includes("credentials");
        setNotConfiguredFromSearch(isConfig);
        setError(res.error);
        setResults([]);
      } else {
        setResults(res.data ?? []);
        if ((res.data ?? []).length === 0) {
          setError(t("No locations found. Try another spelling in English."));
        }
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, companyId, isConfigured, isArabicQuery, t]);

  const select = (loc: PfLocation) => {
    onChange(loc.id);
    setSelectedLabel(loc.name);
    setOpen(false);
  };

  const clearSelection = () => {
    onChange("");
    setSelectedLabel(null);
    setQuery("");
    setResults([]);
  };

  const disabled = !companyId || (!credsLoading && !isConfigured);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="flex-1 justify-between bg-background h-10 font-normal text-start"
            >
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className={cn("truncate", !selectedLabel && !value && "text-muted-foreground")}>
                  {selectedLabel ||
                    (value ? `#${value}` : t("Search PropertyFinder location…"))}
                </span>
              </span>
              <ChevronsUpDown className="opacity-50 ms-2 w-4 h-4 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={t("Type area name e.g. Dubai Marina then pick from the list")}
              />
              <CommandList>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("Searching…")}
                  </div>
                ) : showNotConfigured ? (
                  <div className="flex flex-col gap-2 px-3 py-4 text-xs text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>
                        {t(
                          "PropertyFinder API keys are missing. Open Settings → Portals, paste your API Key & Secret, enable PropertyFinder, then come back here to search.",
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <CommandEmpty>
                      {error ? (
                        <span className="text-amber-700">{error}</span>
                      ) : query.trim().length < 2 ? (
                        t("Type at least 2 characters to search.")
                      ) : (
                        t("No locations found.")
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {results.map((loc) => (
                        <CommandItem
                          key={loc.id}
                          value={String(loc.id)}
                          onSelect={() => select(loc)}
                        >
                          <Check
                            className={cn(
                              "me-2 w-4 h-4 shrink-0",
                              Number(value) === loc.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex-1 truncate">{loc.name}</span>
                          <span className="text-muted-foreground shrink-0" dir="ltr">
                            #{loc.id}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={clearSelection}
            aria-label={t("Clear")}
          >
            <X className="w-4 h-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
