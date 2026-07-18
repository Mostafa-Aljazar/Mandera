"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Phone,
  MessageCircle,
  MapPin,
  User,
  Home,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import pb from "@/lib/pocketbaseClient";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useTranslation } from "react-i18next";
import StatusUpdateModal from "@/components/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/StatusHistoryDisplay";
import type { Owner, Property, OwnerStatus } from "../types/pocketbase.types";

interface OwnerDetailModalProps {
  owner: Owner | null;
  isOpen: boolean;
  onClose: () => void;
}

const OwnerDetailModal = ({
  owner,
  isOpen,
  onClose,
}: OwnerDetailModalProps) => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("info");
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const [properties, setProperties] = useState<Property[]>([]);
  const [statuses, setStatuses] = useState<OwnerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (owner && isOpen && company?.id) {
      fetchOwnerData();
      setActiveTab("info");
    }
  }, [owner, isOpen, company?.id]);

  const fetchOwnerData = async () => {
    if (!owner?.id) return;
    setIsLoading(true);
    try {
      const statusesRes = await pb.collection("owner_statuses").getList(1, 50, {
        filter: `company_id = "${company!.id}"`,
        $autoCancel: false,
        sort: "name",
      });

      const props = await pb.collection("properties").getFullList({
        filter: `owner_id = "${owner.id}"`,
        $autoCancel: false,
      });

      setProperties(props as unknown as Property[]);
      setStatuses(statusesRes.items as unknown as OwnerStatus[]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusSuccess = () => {
    setHistoryRefreshTrigger((prev) => prev + 1);
  };

  if (!isOpen || !owner) return null;

  const cleanPhone = owner.phone?.replace(/\D/g, "") || "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background p-0 max-w-5xl overflow-hidden">
        <DialogHeader className="flex flex-row justify-between items-center bg-muted/30 p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 font-outfit text-xl">
            <User className="w-5 h-5 text-primary" />
            {t("Owner:")} {owner.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col w-full max-h-[85vh]"
        >
          <div className="px-6 pt-4 border-b">
            <TabsList className="grid grid-cols-2 bg-muted/50 w-full max-w-sm">
              <TabsTrigger value="info">{t("Info & Properties")}</TabsTrigger>
              <TabsTrigger value="status">{t("Status History")}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <TabsContent value="info" className="space-y-8 mt-0">
              <div className="bg-card shadow-sm p-6 border rounded-2xl">
                <h3 className="flex items-center gap-2 mb-4 font-semibold text-lg">
                  <User className="w-5 h-5 text-primary" />{" "}
                  {t("Contact Information")}
                </h3>
                <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm">
                      {t("Full Name")}
                    </p>
                    <p className="font-medium text-lg">{owner.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm">
                      {t("Country")}
                    </p>
                    <p className="flex items-center gap-2 font-medium">
                      <MapPin className="w-4 h-4 text-muted-foreground" />{" "}
                      {t(owner.country) || t("N/A")}
                    </p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-muted-foreground text-sm">
                      {t("Phone Number")}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-lg">{owner.phone}</p>
                      {cleanPhone && (
                        <div className="flex gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <a href={`tel:${cleanPhone}`} title="Call Owner">
                              <Phone className="mr-2 w-4 h-4" /> {t("Call")}
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="hover:bg-[#25D366]/10 border-border hover:text-[#25D366] transition-colors"
                          >
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp Owner"
                            >
                              <MessageCircle className="mr-2 w-4 h-4" />{" "}
                              {t("WhatsApp")}
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-semibold text-lg">
                  <Home className="w-5 h-5 text-primary" />{" "}
                  {t("Linked Properties")} ({properties.length})
                </h3>
                {isLoading ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : properties.length === 0 ? (
                  <div className="bg-muted/30 p-8 border border-dashed rounded-xl text-muted-foreground text-center">
                    {t("No properties linked to this owner yet.")}
                  </div>
                ) : (
                  <div className="gap-4 grid grid-cols-1 sm:grid-cols-2">
                    {properties.map((prop) => (
                      <div
                        key={prop.id}
                        className="flex justify-between items-center bg-card shadow-sm p-4 border hover:border-primary/40 rounded-xl transition-colors"
                      >
                        <div>
                          <p className="font-bold text-primary">{prop.code}</p>
                          <p className="text-muted-foreground text-sm line-clamp-1">
                            {prop.title}
                          </p>
                        </div>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                        >
                          <Link href={`/properties/${prop.id}`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="status" className="mt-0 h-full">
              <div className="gap-6 grid grid-cols-1 lg:grid-cols-12 h-full">
                <div className="lg:col-span-5">
                  <StatusUpdateModal
                    entityType="owner"
                    entityData={owner}
                    statuses={statuses}
                    onSuccess={handleStatusSuccess}
                  />
                </div>

                <div className="lg:col-span-7 h-[500px]">
                  <StatusHistoryDisplay
                    entityType="owner"
                    entityId={owner?.id}
                    refreshTrigger={historyRefreshTrigger}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OwnerDetailModal;
