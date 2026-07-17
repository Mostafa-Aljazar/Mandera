'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import EmployeeDeletionDialog from '@/components/EmployeeDeletionDialog.jsx';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX, Users } from 'lucide-react';

const EmployeeListPage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deletion Dialog State
  const [deleteDialog, setDeleteDialog] = useState({ open: false, employee: null });

  const isSuperAdmin = currentUser?.role === 'company_super_admin';

  const fetchEmployees = async () => {
    if (!company || !isSuperAdmin) return;

    try {
      setLoading(true);
      const records = await pb.collection('employees').getFullList({
        filter: `companyId = "${company.id}"`,
        sort: '-created',
        $autoCancel: false
      });
      setEmployees(records);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(t('Failed to load employees'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [company, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/company-dashboard');
    }
  }, [isSuperAdmin, router]);

  const handleToggleDisable = async (employee) => {
    try {
      await pb.collection('employees').update(employee.id, {
        disabled: !employee.disabled
      }, { $autoCancel: false });
      toast.success(employee.disabled ? t('Employee enabled') : t('Employee disabled'));
      fetchEmployees();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error(t('Failed to update employee status'));
    }
  };

  const initiateDelete = async (emp) => {
    try {
      // Find the corresponding company_employee record for complete reassignment
      const ceList = await pb.collection('company_employees').getFullList({
        filter: `employeeId="${emp.id}"`,
        $autoCancel: false
      });

      if (ceList.length > 0) {
        setDeleteDialog({ open: true, employee: ceList[0] });
      } else {
        // Fallback for base-only employee records
        setDeleteDialog({
          open: true,
          employee: {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            employeeId: emp.id,
            _isBase: true
          }
        });
      }
    } catch (error) {
      console.error('Error locating company employee data:', error);
      toast.error(t('Could not prepare employee for deletion.'));
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const currentCount = employees.length + 1;

  return (
    <>
      <Helmet>
        <title>{t('platformName')} - {t('Manage employees')}</title>
        <meta name="description" content="View and manage company employees" />
      </Helmet>
      <CompanyAdminHeader />
      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2 font-outfit">{t('Employees')}</h1>
              <p className="text-muted-foreground text-lg">
                {currentCount} / {company?.maxEmployeeCount} {t('employees')}
              </p>
            </div>
            <Link href="/company-dashboard/employees/new">
              <Button className="flex items-center gap-2 rounded-xl shadow-sm" disabled={currentCount >= company?.maxEmployeeCount}>
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
                          {employee.firstName} {employee.lastName}
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
