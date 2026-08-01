"use client";

import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import SettingsSection from "./SettingsSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Final permissions matrix — matches the product «جدول الصلاحيات النهائي». */
const MATRIX: {
  capability: string;
  sales_agent: string;
  administrator: string;
  manager: string;
}[] = [
  {
    capability: "View own clients",
    sales_agent: "Yes",
    administrator: "Yes, all clients",
    manager: "Yes, all clients",
  },
  {
    capability: "View others' clients",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "View own owners",
    sales_agent: "Yes",
    administrator: "Yes, all owners",
    manager: "Yes, all owners",
  },
  {
    capability: "Edit client or owner name",
    sales_agent: "No",
    administrator: "No",
    manager: "No",
  },
  {
    capability: "Edit client or owner phone",
    sales_agent: "No",
    administrator: "No",
    manager: "No",
  },
  {
    capability: "Delete client or owner",
    sales_agent: "No",
    administrator: "No",
    manager: "No",
  },
  {
    capability: "Add property",
    sales_agent: "Draft only",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Approve new property",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Edit approved property directly",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Submit property edit for review",
    sales_agent: "Yes",
    administrator: "Not required",
    manager: "Not required",
  },
  {
    capability: "Approve agent edit",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Change property status",
    sales_agent: "Yes with notification",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "View full property owner data",
    sales_agent: "Assigned properties only",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Clients by Source",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Team Leaderboard",
    sales_agent: "No",
    administrator: "Yes",
    manager: "Yes",
  },
  {
    capability: "Revenue",
    sales_agent: "No",
    administrator: "No",
    manager: "Yes",
  },
  {
    capability: "Employees",
    sales_agent: "No",
    administrator: "No",
    manager: "Yes",
  },
  {
    capability: "Company Settings",
    sales_agent: "No",
    administrator: "No",
    manager: "Yes",
  },
];

function cellTone(value: string): string {
  if (value === "No") return "text-rose-600/80";
  if (value === "Yes" || value === "Yes, all clients" || value === "Yes, all owners") {
    return "text-emerald-700";
  }
  if (value === "Draft only" || value === "Yes with notification") {
    return "text-amber-700";
  }
  if (value === "Not required" || value === "Assigned properties only") {
    return "text-muted-foreground";
  }
  return "text-foreground";
}

export default function RolePermissionsTab() {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t("Final permissions table")}
      description={t(
        "Role capability matrix for Sales Agent, Administrator, and Manager. Identity corrections remain Master Admin only.",
      )}
      icon={Shield}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="min-w-[12rem] text-start">
                {t("Capability")}
              </TableHead>
              <TableHead className="min-w-[7rem] text-center">
                {t("Sales Agent")}
              </TableHead>
              <TableHead className="min-w-[8rem] text-center">
                {t("Administrator")}
              </TableHead>
              <TableHead className="min-w-[7rem] text-center">
                {t("Manager")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRIX.map((row) => (
              <TableRow key={row.capability} className="hover:bg-muted/30">
                <TableCell className="font-medium text-sm text-start">
                  {t(row.capability)}
                </TableCell>
                {(
                  [
                    row.sales_agent,
                    row.administrator,
                    row.manager,
                  ] as const
                ).map((value, index) => (
                  <TableCell
                    key={`${row.capability}-${index}`}
                    className={cn(
                      "text-center text-sm font-medium",
                      cellTone(value),
                    )}
                  >
                    {t(value)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
