"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Maximize,
  Home,
  Briefcase,
  FileText,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import StatusUpdateModal from "@/components/common/StatusUpdateModal";
import StatusHistoryDisplay from "@/components/common/StatusHistoryDisplay";
import type { PropertyWithRelations } from "@/types/supabase-entities.types";

type PropertyDetailData = PropertyWithRelations;

interface PropertyDetailModalProps {
  property: PropertyDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export default function PropertyDetailModal({
  property,
  isOpen,
  onClose,
  onStatusUpdated,
}: PropertyDetailModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("details");
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  useEffect(() => {
    if (property && isOpen) {
      setActiveTab("details");
    }
  }, [property, isOpen]);

  const handleStatusSuccess = () => {
    toast.success(t("Property status updated successfully"));
    setHistoryRefreshTrigger((prev) => prev + 1);
    if (onStatusUpdated) onStatusUpdated();
  };

  if (!property) return null;

  const agent = property.employee
    ? {
        name: property.employee.name,
        email: property.employee.employee_record?.email,
      }
    : undefined;
  const propertyType = property.property_type?.name || t("Unknown");

  const areaDisplayName = property.area_district_ref?.name
    ? `${property.area_district_ref.name}${property.area ? ` (${property.area})` : ""}`
    : property.area || "Unknown Area";

  const hasImages = property.images && property.images.length > 0;
  const images = hasImages
    ? property.images!
    : [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80",
      ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background p-0 max-w-6xl overflow-hidden">
        <div className="flex flex-col max-h-[90vh] overflow-y-auto">
          <div className="relative bg-muted">
            <div className="flex h-[250px] md:h-[350px] overflow-x-auto snap-mandatory snap-x hide-scrollbar">
              {images.map((url, i) => (
                <div
                  key={i}
                  className="relative flex justify-center items-center bg-muted min-w-full h-full snap-center shrink-0"
                >
                  <img
                    src={url}
                    alt={`${property.title} - ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                </div>
              ))}
            </div>

            <div className="right-6 bottom-6 left-6 absolute flex flex-wrap justify-between items-end gap-4 text-white">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="default"
                    className="bg-primary hover:bg-primary/90 shadow-sm border-transparent"
                  >
                    {t("For")} {t(property.listing_type)}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 shadow-sm backdrop-blur-md border-white/10 text-white"
                  >
                    {t(propertyType)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-black/40 shadow-sm backdrop-blur-md border-white/20 text-white"
                  >
                    {t(property.status || "Available")}
                  </Badge>
                </div>
                <h1 className="font-bold text-2xl md:text-3xl line-clamp-2 tracking-tight">
                  {property.title}
                </h1>
                <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-md w-fit text-white/90 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {areaDisplayName}, {t(property.emirate)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-outfit font-bold text-3xl">
                  AED {property.price?.toLocaleString()}
                </p>
                <p className="inline-block bg-black/30 backdrop-blur-sm mt-2 px-2 py-1 rounded font-mono text-white/80 text-sm">
                  {t("Ref:")} {property.code}
                </p>
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col w-full"
          >
            <div className="bg-muted/10 px-6 pt-4 border-b">
              <TabsList className="grid grid-cols-2 bg-muted/50 w-full max-w-sm">
                <TabsTrigger value="details">
                  {t("Property Details")}
                </TabsTrigger>
                <TabsTrigger value="status">{t("Status History")}</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6 md:p-8">
              <TabsContent
                value="details"
                className="gap-8 grid grid-cols-1 lg:grid-cols-3 mt-0"
              >
                <div className="space-y-8 lg:col-span-2">
                  <section>
                    <h3 className="flex items-center gap-2 mb-4 font-semibold text-lg">
                      <FileText className="w-5 h-5 text-primary" />{" "}
                      {t("Key Information")}
                    </h3>
                    <div className="gap-4 grid grid-cols-2 sm:grid-cols-3">
                      <div className="bg-muted/50 p-4 border border-border/50 hover:border-border rounded-xl transition-colors">
                        <p className="mb-1 text-muted-foreground text-sm">
                          {t("Land Area")}
                        </p>
                        <p className="flex items-center gap-2 font-semibold">
                          <Maximize className="w-4 h-4 text-muted-foreground" />
                          {property.land_area
                            ? `${property.land_area} sqft`
                            : t("N/A")}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 border border-border/50 hover:border-border rounded-xl transition-colors">
                        <p className="mb-1 text-muted-foreground text-sm">
                          {t("Bua")}
                        </p>
                        <p className="flex items-center gap-2 font-semibold">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          {property.building_area
                            ? `${property.building_area} sqft`
                            : t("N/A")}
                        </p>
                      </div>
                      <div className="bg-muted/50 p-4 border border-border/50 hover:border-border rounded-xl transition-colors">
                        <p className="mb-1 text-muted-foreground text-sm">
                          {t("Commission")}
                        </p>
                        <p className="flex items-center gap-2 font-semibold">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          {property.commission_percentage
                            ? `${property.commission_percentage}%`
                            : t("N/A")}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-4 font-semibold text-lg">
                      {t("Description")}
                    </h3>
                    <div className="max-w-none text-muted-foreground prose prose-sm">
                      {property.description ? (
                        <p className="leading-relaxed whitespace-pre-wrap">
                          {property.description}
                        </p>
                      ) : (
                        <p className="bg-muted/30 p-6 rounded-xl text-center italic">
                          {t("No description provided for this property.")}
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="bg-card shadow-sm p-6 border rounded-2xl">
                    <h3 className="mb-6 font-semibold text-muted-foreground text-sm text-center uppercase tracking-wider">
                      {t("Responsible Agent")}
                    </h3>
                    {agent ? (
                      <div className="space-y-6 text-center">
                        <div className="flex justify-center items-center bg-primary/10 mx-auto rounded-full ring-4 ring-primary/5 w-20 h-20 font-bold text-primary text-3xl">
                          {(agent.name || agent.email || "A")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-lg">
                            {agent.name || "Agent"}
                          </p>
                          <p className="mt-0.5 text-muted-foreground text-sm">
                            {agent.email}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          <Button
                            asChild
                            className="gap-2 bg-[#25D366] hover:bg-[#25D366]/90 shadow-sm w-full text-white"
                            size="lg"
                          >
                            <a
                              href={`https://wa.me/`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="w-4 h-4" />{" "}
                              {t("WhatsApp")}
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="gap-2 hover:bg-primary/5 border-border/60 w-full hover:text-primary transition-colors"
                            size="lg"
                          >
                            <a href={`tel:`}>
                              <Phone className="w-4 h-4" /> {t("Call Agent")}
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="secondary"
                            className="gap-2 w-full"
                            size="lg"
                          >
                            <a href={`mailto:${agent.email}`}>
                              <Mail className="w-4 h-4" /> {t("Email")}
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/30 py-6 border border-dashed rounded-xl text-muted-foreground text-center">
                        <User className="opacity-20 mx-auto mb-2 w-8 h-8" />
                        <p className="text-sm">{t("No agent assigned.")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="status" className="mt-0">
                <div className="gap-6 grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <StatusUpdateModal
                      entityType="property"
                      entityData={property}
                      onSuccess={handleStatusSuccess}
                    />
                  </div>

                  <div className="lg:col-span-8 h-[500px]">
                    <StatusHistoryDisplay
                      entityType="property"
                      entityId={property?.id}
                      refreshTrigger={historyRefreshTrigger}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
