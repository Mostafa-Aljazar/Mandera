"use client";

import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import pb from "@/lib/pocketbaseClient";
import CompanyAdminHeader from "@/components/CompanyAdminHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarPlus as CalendarIcon,
  Download,
  Banknote,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { Revenue, CompanyEmployee } from "../../types/pocketbase.types";

const RevenuePage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const fetchData = async () => {
    if (!company?.id || currentUser?.role !== "company_super_admin") {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let filterStr = `company_id = "${company.id}"`;
      if (selectedEmployee !== "all") {
        filterStr += ` && employee_id = "${selectedEmployee}"`;
      }
      if (dateFrom) {
        filterStr += ` && deal_completion_date >= "${dateFrom.toISOString().split("T")[0]} 00:00:00"`;
      }
      if (dateTo) {
        filterStr += ` && deal_completion_date <= "${dateTo.toISOString().split("T")[0]} 23:59:59"`;
      }

      const [revRes, empRes] = await Promise.all([
        pb.collection("revenues").getFullList<Revenue>({
          filter: filterStr,
          sort: "-deal_completion_date",
          $autoCancel: false,
        }),
        pb.collection("company_employees").getFullList<CompanyEmployee>({
          filter: `companyId = "${company.id}"`,
          $autoCancel: false,
        }),
      ]);

      setRevenues(revRes);
      setEmployees(empRes);
    } catch (err) {
      console.error(err);
      toast.error(t("Failed to load revenue data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, currentUser?.role, selectedEmployee, dateFrom, dateTo, t]);

  const clearFilters = () => {
    setSelectedEmployee("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const exportCSV = () => {
    if (revenues.length === 0) {
      toast.warning(t("No data to export."));
      return;
    }
    const headers = [
      t("Property Code"),
      t("Location"),
      t("Commission"),
      t("Agent"),
      t("Client & Owner"),
      t("Completion Date"),
    ];
    const rows = revenues.map((r) => [
      r.property_code,
      r.emirate + (r.area_district ? ` - ${r.area_district}` : ""),
      r.commission_value,
      r.employee_name,
      `${r.client_name} / ${r.owner_name}`,
      format(new Date(r.deal_completion_date), "yyyy-MM-dd"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `revenues_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("Export downloaded successfully."));
  };

  const totalRevenue = revenues.reduce(
    (sum, r) => sum + (r.commission_value || 0),
    0,
  );

  if (currentUser?.role !== "company_super_admin") {
    return (
      <>
        <Helmet>
          <title>{t("Access Denied")} | MANDERA CRM</title>
        </Helmet>
        <CompanyAdminHeader />
        <main className="flex justify-center items-center bg-muted/20 px-4 py-16 min-h-[calc(100vh-80px)]">
          <div className="bg-card shadow-sm mx-auto p-8 border rounded-2xl max-w-md text-center">
            <ShieldAlert className="mx-auto mb-4 w-12 h-12 text-destructive" />
            <h2 className="mb-2 font-outfit font-bold text-foreground text-2xl">
              {t("Access Denied")}
            </h2>
            <p className="text-muted-foreground">
              {t(
                "You do not have permission to view the revenue page. This area is restricted to company administrators.",
              )}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t("Revenue")} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="bg-muted/20 py-8 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 container">
          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="flex items-center gap-3 font-outfit font-bold text-3xl tracking-tight">
                <Banknote className="w-8 h-8 text-emerald-600" />
                {t("Revenue & Deals")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t("Track closed deals and analyze commission revenues.")}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-card shadow-sm p-4 border rounded-xl w-full md:w-auto">
              <div className="flex flex-col">
                <span className="font-medium text-muted-foreground text-sm">
                  {t("Total Period Revenue")}
                </span>
                <span className="font-outfit font-bold text-emerald-600 text-2xl">
                  AED {totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-card shadow-sm p-4 sm:p-6 border rounded-2xl">
            <div className="flex xl:flex-row flex-col justify-between items-end gap-4 pb-6 border-b">
              <div className="flex sm:flex-row flex-col flex-wrap items-end gap-3 w-full xl:w-auto">
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-muted-foreground text-xs">
                    {t("Filter by Agent")}
                  </Label>
                  <Select
                    value={selectedEmployee}
                    onValueChange={setSelectedEmployee}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] h-9">
                      <SelectValue placeholder={t("All Agents")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("All Agents")}</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name || e.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-muted-foreground text-xs">
                    {t("From Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start w-full sm:w-[150px] h-9 font-normal text-left",
                          !dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="me-2 w-4 h-4" />
                        {dateFrom ? (
                          format(dateFrom, "MMM d, yyyy")
                        ) : (
                          <span>{t("Select")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-muted-foreground text-xs">
                    {t("To Date")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start w-full sm:w-[150px] h-9 font-normal text-left",
                          !dateTo && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="me-2 w-4 h-4" />
                        {dateTo ? (
                          format(dateTo, "MMM d, yyyy")
                        ) : (
                          <span>{t("Select")}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {(selectedEmployee !== "all" || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-muted-foreground hover:text-foreground"
                  >
                    {t("Clear Filters")}
                  </Button>
                )}
              </div>

              <Button
                onClick={exportCSV}
                variant="secondary"
                className="gap-2 shrink-0"
              >
                <Download className="w-4 h-4" /> {t("Export CSV")}
              </Button>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t("Property Code")}</TableHead>
                    <TableHead>{t("Location")}</TableHead>
                    <TableHead>{t("Client & Owner")}</TableHead>
                    <TableHead>{t("Agent")}</TableHead>
                    <TableHead>{t("Completion Date")}</TableHead>
                    <TableHead className="text-right">
                      {t("Commission")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="mx-auto w-6 h-6 text-muted-foreground animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : revenues.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-muted-foreground text-center"
                      >
                        <Banknote className="opacity-20 mx-auto mb-2 w-8 h-8" />
                        <p>
                          {t(
                            "No revenue records found for the selected period.",
                          )}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    revenues.map((r) => (
                      <TableRow
                        key={r.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-mono font-semibold text-xs">
                          {r.property_code}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground/80">
                              {r.emirate}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {r.area_district}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1.5">
                              <span className="bg-muted px-1 rounded font-bold text-[10px] text-muted-foreground uppercase">
                                C
                              </span>
                              {r.client_name}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="bg-muted px-1 rounded font-bold text-[10px] text-muted-foreground uppercase">
                                O
                              </span>
                              {r.owner_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <div className="flex justify-center items-center bg-primary/10 rounded-full w-6 h-6 font-semibold text-primary text-xs">
                              {r.employee_name.charAt(0).toUpperCase()}
                            </div>
                            {r.employee_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(
                            new Date(r.deal_completion_date),
                            "MMM d, yyyy",
                          )}
                        </TableCell>
                        <TableCell className="font-outfit font-bold text-emerald-600 text-right">
                          AED {r.commission_value?.toLocaleString() || 0}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default RevenuePage;
