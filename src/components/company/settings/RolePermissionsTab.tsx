"use client";

import { useMemo } from "react";
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
import { Check, X } from "lucide-react";

type Cell = boolean | "master";

const MATRIX: {
  capability: string;
  sales_agent: Cell;
  administrator: Cell;
  manager: Cell;
}[] = [
  { capability: "View all clients / owners / properties", sales_agent: false, administrator: true, manager: true },
  { capability: "Assign / transfer records", sales_agent: false, administrator: true, manager: true },
  { capability: "Approve properties & edits", sales_agent: false, administrator: true, manager: true },
  { capability: "Clients by Source / Leaderboard", sales_agent: false, administrator: true, manager: true },
  { capability: "Revenue", sales_agent: false, administrator: false, manager: true },
  { capability: "Employees", sales_agent: false, administrator: false, manager: true },
  { capability: "Company Settings", sales_agent: false, administrator: false, manager: true },
  { capability: "Export clients / owners", sales_agent: false, administrator: false, manager: true },
  { capability: "Lock records", sales_agent: false, administrator: false, manager: true },
  { capability: "Delete client / owner", sales_agent: false, administrator: false, manager: false },
  { capability: "Edit client / owner name or phone", sales_agent: false, administrator: false, manager: false },
  { capability: "Identity correction (audit)", sales_agent: "master", administrator: "master", manager: "master" },
];

function CellIcon({ value }: { value: Cell }) {
  if (value === "master") {
    return <span className="text-xs text-muted-foreground">Master Admin</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-emerald-600 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-rose-500/70 mx-auto" />
  );
}

export default function RolePermissionsTab() {
  const { t } = useTranslation();
  const rows = useMemo(() => MATRIX, []);

  return (
    <SettingsSection
      title={t("User permissions")}
      description={t(
        "Role capability matrix for Sales Agent, Administrator, and Manager. Identity corrections remain Master Admin only.",
      )}
      icon={Shield}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Capability")}</TableHead>
              <TableHead className="text-center">{t("Sales Agent")}</TableHead>
              <TableHead className="text-center">{t("Administrator")}</TableHead>
              <TableHead className="text-center">{t("Manager")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.capability}>
                <TableCell className="font-medium text-sm">
                  {t(row.capability)}
                </TableCell>
                <TableCell className="text-center">
                  <CellIcon value={row.sales_agent} />
                </TableCell>
                <TableCell className="text-center">
                  <CellIcon value={row.administrator} />
                </TableCell>
                <TableCell className="text-center">
                  <CellIcon value={row.manager} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SettingsSection>
  );
}
