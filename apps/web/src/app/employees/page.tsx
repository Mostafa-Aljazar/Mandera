"use client";

import React, { useState, useEffect } from "react";
import DocumentHead from "@/components/DocumentHead";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import {
  useCompanyEmployees,
  useCreateEmployee,
  useUpdateEmployee,
} from "@/hooks/queries/useEmployees";
import CompanyAdminHeader from "@/components/CompanyAdminHeader";
import EmployeeModal from "@/components/EmployeeModal";
import EmployeeDeletionDialog from "@/components/EmployeeDeletionDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Users, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CompanyEmployeeWithDetails } from "@/types/supabase-entities.types";

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  role: string;
  password?: string;
}

const EmployeesPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] =
    useState<CompanyEmployeeWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Dialog State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEmployeeForDeletion, setSelectedEmployeeForDeletion] =
    useState<CompanyEmployeeWithDetails | null>(null);

  const isSuperAdmin = currentUser?.role === "company_super_admin";

  const { data: employeesData, refetch: refetchEmployees } = useCompanyEmployees(
    isSuperAdmin ? company?.id : undefined,
  );
  const employees = employeesData ?? [];
  const createEmployeeMutation = useCreateEmployee();
  const updateEmployeeMutation = useUpdateEmployee();

  const fetchEmployees = () => refetchEmployees();

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace("/company-dashboard");
    }
  }, [isSuperAdmin, router]);

  const handleOpenModal = (employee: CompanyEmployeeWithDetails | null = null) => {
    setActiveEmployee(employee);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveEmployee(null);
  };

  const handleSaveEmployee = async (formData: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      if (activeEmployee?.id) {
        const result = await updateEmployeeMutation.mutateAsync({
          profileId: activeEmployee.id,
          employeeId: activeEmployee.employee_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          job_title: formData.job_title,
          role: formData.role,
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Employee updated successfully."));
      } else {
        const result = await createEmployeeMutation.mutateAsync({
          companyId: company!.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          job_title: formData.job_title,
          role: formData.role,
          password: formData.password || "",
        });
        if (result.error) throw new Error(result.error);
        toast.success(t("Employee created successfully."));
      }
      handleCloseModal();
    } catch (err: any) {
      toast.error(err.message || t("Error saving employee."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const initiateDelete = (employee: CompanyEmployeeWithDetails) => {
    setSelectedEmployeeForDeletion(employee);
    setIsDeleteDialogOpen(true);
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <DocumentHead title={`${t("platformName")} - ${t("Employees")}`} />
      <CompanyAdminHeader />

      <main className="bg-muted/20 py-8 min-h-[calc(100vh-80px)]">
        <div className="mx-auto px-4 max-w-7xl container">
          <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="font-outfit font-bold text-3xl tracking-tight">
                {t("Team Directory")}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {t("Manage your company employees and their access roles.")}
              </p>
            </div>

            <Button
              onClick={() => handleOpenModal(null)}
              className="gap-2 shadow-sm rounded-xl"
            >
              <Plus className="w-4 h-4" /> {t("Add New Employee")}
            </Button>
          </div>

          <Card className="bg-card shadow-sm border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>{t("Name")}</TableHead>
                  <TableHead>{t("Email address")}</TableHead>
                  <TableHead>{t("Phone Number")}</TableHead>
                  <TableHead>{t("Role")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead className="text-right">{t("Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-muted-foreground text-center"
                    >
                      <Users className="opacity-20 mx-auto mb-3 w-10 h-10" />
                      <p>{t("No employees found.")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">
                        {emp.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.employee?.email || t("N/A")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {emp.employee?.phone || t("N/A")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.role === "company_super_admin"
                              ? "default"
                              : "secondary"
                          }
                          className="font-medium"
                        >
                          {emp.role === "company_super_admin"
                            ? t("Super Admin")
                            : t("Employee")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.employee?.disabled ? "destructive" : "outline"
                          }
                          className={
                            !emp.employee?.disabled
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                              : ""
                          }
                        >
                          {emp.employee?.disabled
                            ? t("Inactive")
                            : t("Active")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(emp)}
                            className="w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {emp.id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => initiateDelete(emp)}
                              className="hover:bg-destructive/10 w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <EmployeeModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSaveEmployee}
            employee={activeEmployee}
            isSubmitting={isSubmitting}
          />

          <EmployeeDeletionDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            employeeToDelete={selectedEmployeeForDeletion}
            onSuccess={fetchEmployees}
            companyId={company?.id}
          />
        </div>
      </main>
    </>
  );
};

export default EmployeesPage;
