"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, GitMerge, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDuplicates,
  useMergeClients,
  useMergeOwners,
  useMergeProperties,
} from "@/hooks/queries/useDuplicates";
import type { DuplicateGroup } from "@/actions/duplicates";
import type { Client, Owner, Property } from "@/types/supabase-entities.types";

interface DuplicatesReviewPanelProps {
  companyId: string;
  initialTab?: "clients" | "owners" | "properties";
}

type DuplicateRecord = Client | Owner | Property;

function recordLabel(record: DuplicateRecord) {
  if ("code" in record) return `${record.code} · ${record.title}`;
  return record.name_en || record.name || record.id;
}

function recordDetail(record: DuplicateRecord) {
  if ("code" in record) {
    return (
      record.advertising_permit_number ||
      [record.area_district, record.area].find(Boolean) ||
      record.id
    );
  }
  return record.phone || record.id;
}

export default function DuplicatesReviewPanel({
  companyId,
  initialTab = "clients",
}: DuplicatesReviewPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({});
  const clientsQuery = useDuplicates("clients", companyId);
  const ownersQuery = useDuplicates("owners", companyId);
  const propertiesQuery = useDuplicates("properties", companyId);
  const mergeClientsMutation = useMergeClients();
  const mergeOwnersMutation = useMergeOwners();
  const mergePropertiesMutation = useMergeProperties();

  const renderGroups = (
    type: "clients" | "owners" | "properties",
    groups: DuplicateGroup<DuplicateRecord>[] | undefined,
    loading: boolean,
  ) => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      );
    }
    if (!groups?.length) {
      return (
        <p className="py-8 text-muted-foreground text-sm text-center">
          {t("No duplicate records found.")}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {groups.map((group, index) => {
          const groupId = `${type}:${group.key}:${index}`;
          const keepId = keepByGroup[groupId] || group.records[0].id;
          const isMerging =
            mergeClientsMutation.isPending ||
            mergeOwnersMutation.isPending ||
            mergePropertiesMutation.isPending;
          return (
            <div
              key={groupId}
              className="bg-muted/20 p-3.5 border border-border/60 rounded-xl"
            >
              <div className="flex justify-between items-center gap-2 mb-2.5">
                <Badge variant="outline" className="text-[10px]">
                  {group.reason === "phone"
                    ? t("Same phone")
                    : group.reason === "permit"
                      ? t("Same permit number")
                      : t("Same title and area")}
                </Badge>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {group.records.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.records.map((record) => (
                  <label
                    key={record.id}
                    className="flex items-center gap-2.5 bg-background px-3 py-2 border border-border/50 rounded-lg"
                  >
                    <input
                      type="radio"
                      name={groupId}
                      checked={keepId === record.id}
                      onChange={() =>
                        setKeepByGroup((current) => ({
                          ...current,
                          [groupId]: record.id,
                        }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-sm truncate">
                        {recordLabel(record)}
                      </span>
                      <span
                        className="block text-muted-foreground text-xs truncate"
                        dir="auto"
                      >
                        {recordDetail(record)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8"
                  disabled={isMerging}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        t("Merge these records into the selected record?"),
                      )
                    ) {
                      return;
                    }
                    const input = {
                      companyId,
                      keepId,
                      mergeIds: group.records
                        .map((record) => record.id)
                        .filter((id) => id !== keepId),
                    };
                    const result =
                      type === "clients"
                        ? await mergeClientsMutation.mutateAsync(input)
                        : type === "owners"
                          ? await mergeOwnersMutation.mutateAsync(input)
                          : await mergePropertiesMutation.mutateAsync(input);
                    if (result.error) {
                      toast.error(result.error);
                    } else {
                      toast.success(t("Duplicate records merged."));
                    }
                  }}
                >
                  {isMerging ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <GitMerge className="w-3.5 h-3.5" />
                  )}
                  {t("Merge duplicates")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="bg-card shadow-[var(--shadow-subtle)] p-4 sm:p-5 border border-border/60 rounded-2xl">
      <div className="flex items-start gap-2.5 mb-4">
        <AlertTriangle className="mt-0.5 w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <h2 className="font-outfit font-semibold">{t("Duplicate review")}</h2>
          <p className="text-muted-foreground text-xs">
            {t("Review possible duplicates before merging records.")}
          </p>
        </div>
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "clients" | "owners" | "properties")
        }
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="clients">{t("Clients")}</TabsTrigger>
          <TabsTrigger value="owners">{t("Owners")}</TabsTrigger>
          <TabsTrigger value="properties">{t("Properties")}</TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="mt-4">
          {renderGroups(
            "clients",
            clientsQuery.data as DuplicateGroup<DuplicateRecord>[] | undefined,
            clientsQuery.isLoading,
          )}
        </TabsContent>
        <TabsContent value="owners" className="mt-4">
          {renderGroups(
            "owners",
            ownersQuery.data as DuplicateGroup<DuplicateRecord>[] | undefined,
            ownersQuery.isLoading,
          )}
        </TabsContent>
        <TabsContent value="properties" className="mt-4">
          {renderGroups(
            "properties",
            propertiesQuery.data as
              | DuplicateGroup<DuplicateRecord>[]
              | undefined,
            propertiesQuery.isLoading,
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
