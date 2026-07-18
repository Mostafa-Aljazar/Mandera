"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  Edit2,
  MapPin,
  Maximize,
  Phone,
  MessageCircle,
} from "lucide-react";
import pb from "@/lib/pocketbaseClient";
import type { Property } from "../types/pocketbase.types";

const STATUS_COLORS: Record<string, string> = {
  Available:
    "bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20",
  Sold: "bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20",
  Rented:
    "bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20",
  Hold: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20",
  "Deal Completed":
    "bg-slate-500/10 text-slate-600 border-slate-200 hover:bg-slate-500/20",
};

interface PropertyCardData extends Property {
  expand?: {
    area_district?: { name?: string };
    employee_id?: { name?: string; email?: string; phone?: string };
  };
}

interface PropertyCardProps {
  property: PropertyCardData;
  onEdit: (property: PropertyCardData) => void;
  onView: (property: PropertyCardData) => void;
  onStatusChange?: (propertyId: string, status: string) => void;
}

const PropertyCard = ({
  property,
  onEdit,
  onView,
  onStatusChange,
}: PropertyCardProps) => {
  const { t } = useTranslation();
  const imageUrl = property.images?.length
    ? pb.files.getUrl(
        property as unknown as {
          id: string;
          collectionId: string;
          collectionName: string;
        },
        property.images[0],
        { thumb: "400x300" },
      )
    : "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&auto=format&fit=crop&q=80";

  const currentStatus = property.status || "Available";
  const statusColor =
    STATUS_COLORS[currentStatus] || STATUS_COLORS["Available"];

  const areaName =
    property.expand?.area_district?.name || property.area || property.emirate;
  const employeeName: string =
    property.expand?.employee_id?.name ||
    property.expand?.employee_id?.email ||
    t("Unassigned");
  const employeePhone = property.expand?.employee_id?.phone || "";

  return (
    <Card className="group flex flex-col hover:shadow-lg border-border/50 h-full overflow-hidden transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={property.title || "Property image"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="top-3 left-3 absolute flex flex-col items-start gap-2">
          <Badge
            variant={property.listing_type === "Sale" ? "default" : "secondary"}
            className="shadow-sm"
          >
            {t(`For ${property.listing_type}`)}
          </Badge>
          <Badge
            variant="outline"
            className={`shadow-sm backdrop-blur-md bg-background/90 ${statusColor}`}
          >
            {t(currentStatus)}
          </Badge>
        </div>
        <div className="top-3 right-3 absolute">
          <Badge
            variant="outline"
            className="bg-background/90 shadow-sm backdrop-blur-sm font-mono text-xs"
          >
            {property.code}
          </Badge>
        </div>
      </div>

      <CardContent className="flex flex-col flex-1 p-5">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-semibold group-hover:text-primary text-lg line-clamp-1 transition-colors">
            {property.title}
          </h3>
        </div>
        <p className="mb-4 font-bold text-primary text-2xl">
          AED {property.price?.toLocaleString()}
        </p>

        <div className="space-y-3 mt-auto mb-4 text-muted-foreground text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary/80 shrink-0" />
              <span className="line-clamp-1">{areaName}</span>
            </div>
            {(property.building_area || property.land_area) && (
              <div className="flex items-center gap-1.5 font-medium">
                <Maximize className="w-4 h-4 text-primary/80 shrink-0" />
                <span>
                  {property.building_area || property.land_area} {t("sqft")}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-3 border-border/50 border-t">
            <div className="flex items-center gap-2">
              <div className="flex justify-center items-center bg-primary/10 rounded-full w-7 h-7 font-semibold text-primary text-xs">
                {employeeName.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[130px] font-medium text-foreground line-clamp-1">
                {employeeName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 w-7 h-7 hover:text-primary"
              >
                <a href={`tel:+${employeePhone}`} title={t("Call Agent")}>
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="hover:bg-[#25D366]/10 w-7 h-7 hover:text-[#25D366]"
              >
                <a
                  href={`https://wa.me/${employeePhone}?text=Property%20Code:%20${property.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t("WhatsApp Agent")}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Status Update */}
        {onStatusChange && currentStatus !== "Deal Completed" && (
          <div className="mt-auto pt-3 border-border/50 border-t">
            <Select
              value={currentStatus}
              onValueChange={(val) => onStatusChange(property.id, val)}
            >
              <SelectTrigger className="bg-muted/30 h-8 text-xs">
                <SelectValue placeholder={t("Update Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">{t("Available")}</SelectItem>
                <SelectItem value="Sold">{t("Sold")}</SelectItem>
                <SelectItem value="Rented">{t("Rented")}</SelectItem>
                <SelectItem value="Hold">{t("Hold")}</SelectItem>
                <SelectItem value="Deal Completed">
                  {t("Deal Completed")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end items-center gap-3 bg-muted/20 mt-0 p-4 pt-0 border-t">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-full"
          onClick={() => onView(property)}
        >
          <Eye className="w-4 h-4" /> {t("View")}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="gap-2 w-full"
          onClick={() => onEdit(property)}
        >
          <Edit2 className="w-4 h-4" /> {t("Edit")}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PropertyCard;
