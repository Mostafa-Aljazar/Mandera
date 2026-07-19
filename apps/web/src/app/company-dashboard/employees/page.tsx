'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DocumentHead from "@/components/DocumentHead";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CompanyAdminHeader from '@/components/CompanyAdminHeader';
import EmployeeDeletionDialog from '@/components/EmployeeDeletionDialog';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext';
import {
  useBaseEmployees,
  useUpdateEmployeeDisabled,
} from '@/hooks/queries/useEmployees';
import { useCompanyEmployees } from '@/hooks/queries/useEmployees';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import type { EmployeeRecord as Employee } from '@/types/supabase-entities.types';

interface DeletionTarget {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  _isBase?: boolean;
}

const EmployeeListPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();

  // Deletion Dialog State
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; employee: DeletionTarget | null }>({ open: false, employee: null });

  const isSuperAdmin = currentUser?.role === 'company_super_admin';

  const { data: employeesData, isLoading: loading, refetch: refetchEmployees } =
    useBaseEmployees(isSuperAdmin ? company?.id : undefined);
  const employees = employeesData ?? [];
  const { data: companyEmployeesData } = useCompanyEmployees(
    isSuperAdmin ? company?.id : undefined,
  );
  const updateDisabledMutation = useUpdateEmployeeDisabled();

  const fetchEmployees = () => refetchEmployees();

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/company-dashboard');
    }
  }, [isSuperAdmin, router]);

  const handleToggleDisable = async (employee: Employee) => {
    try {
      const result = await updateDisabledMutation.mutateAsync({
        employeeId: employee.id,
        disabled: !employee.disabled,
      });
      if (result.error) throw new Error(result.error);
      toast.success(employee.disabled ? t('Employee enabled') : t('Employee disabled'));
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error(t('Failed to update employee status'));
    }
  };

  const initiateDelete = (emp: Employee) => {
    // Find the corresponding profiles/company_employee record for complete reassignment
    const matchingProfile = (companyEmployeesData ?? []).find(
      (ce) => ce.employee_id === emp.id,
    );

    if (matchingProfile) {
      setDeleteDialog({
        open: true,
        employee: {
          id: matchingProfile.id,
          name: matchingProfile.name || '',
          email: emp.email,
          employeeId: emp.id,
        },
      });
    } else {
      // Fallback for base-only employee records
      setDeleteDialog({
        open: true,
        employee: {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          employeeId: emp.id,
          _isBase: true
        }
      });
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const currentCount = employees.length + 1;

  return (
    <>
      <DocumentHead title={`${t('platformName')} - ${t('Manage employees')}`} description="View and manage company employees" />
      <CompanyAdminHeader />
      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 font-outfit">{t('Employees')}</h1>
              <p className="text-muted-foreground text-lg">
                {currentCount} / {company?.max_employee_count} {t('employees')}
              </p>
            </div>
            <Link href="/company-dashboard/employees/new">
              <Button className="flex items-center gap-2 rounded-xl shadow-sm" disabled={currentCount >= company?.max_employee_count}>
                <Plus className="h-4 w-4" />
                {t('Add employee')}
              </Button>
            </Link>
          </div>

          <Card className="border-border/60 shadow-sm bg-card">
            <CardHeader>
              <CardTitle>{t('All employees')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">{t('No employees found')}</p>
                  <Link href="/company-dashboard/employees/new">
                    <Button>{t('Add your first employee')}</Button>
                  </Link>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>{t('Name')}</TableHead>
                      <TableHead>{t('Email')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant={employee.disabled ? 'destructive' : 'outline'} className={!employee.disabled ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''}>
                            {employee.disabled ? t('Disabled') : t('Active')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Link href={`/company-dashboard/employees/${employee.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleToggleDisable(employee)}
                            >
                              {employee.disabled ? (
                                <UserCheck className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => initiateDelete(employee)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EmployeeDeletionDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, employee: null })}
        employeeToDelete={deleteDialog.employee}
        onSuccess={fetchEmployees}
        companyId={company?.id}
      />
    </>
  );
};

export default EmployeeListPage;
