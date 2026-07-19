'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import MasterAdminHeader from '@/components/MasterAdminHeader';
import {
  useCompanies,
  useToggleCompanyFreeze,
  useDeleteCompanyCascade,
} from '@/hooks/queries/useCompanies';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, Lock, Unlock, Loader2 } from 'lucide-react';
import { useEmployeeCount } from '@/hooks/useEmployeeCount';
import { useTranslation } from 'react-i18next';
import type { Company } from '@/types/supabase-entities.types';

interface CompanyRowProps {
  company: Company;
  onDelete: (company: Company) => void;
  onToggleFreeze: (company: Company) => void;
}

const CompanyRow = ({ company, onDelete, onToggleFreeze }: CompanyRowProps) => {
  const { t } = useTranslation();
  const { count: employeeCount } = useEmployeeCount(company.id);

  return (
    <TableRow>
      <TableCell className="font-medium">{company.company_name || company.company_code}</TableCell>
      <TableCell className="text-muted-foreground">{company.email}</TableCell>
      <TableCell>
        <span className="font-semibold">{employeeCount}</span>
      </TableCell>
      <TableCell>
        {company.is_frozen ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
            {t('Frozen')}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            {t('Active')}
          </span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {new Date(company.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/master-dashboard/companies/${company.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${company.is_frozen ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10' : 'text-amber-600 hover:text-amber-700 hover:bg-amber-500/10'}`}
            onClick={() => onToggleFreeze(company)}
            title={company.is_frozen ? t('Unfreeze') : t('Freeze')}
          >
            {company.is_frozen ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(company)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const CompanyListPage = () => {
  const { t } = useTranslation();

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null });
  const [freezeDialog, setFreezeDialog] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null });

  const [isDeleting, setIsDeleting] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);

  const { data: companiesData, isLoading: loading } = useCompanies();
  const companies = companiesData ?? [];
  const toggleFreezeMutation = useToggleCompanyFreeze();
  const deleteCascadeMutation = useDeleteCompanyCascade();

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.company) return;
    setIsDeleting(true);

    try {
      const result = await deleteCascadeMutation.mutateAsync(deleteDialog.company.id);
      if (result.error) throw new Error(result.error);
      toast.success(t('Company deleted successfully'));
      setDeleteDialog({ open: false, company: null });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(t('Failed to delete company. Try again.'), {
        action: {
          label: t('Retry'),
          onClick: handleDeleteConfirm
        }
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFreezeConfirm = async () => {
    if (!freezeDialog.company) return;
    setIsFreezing(true);

    const isCurrentlyFrozen = freezeDialog.company.is_frozen;

    try {
      const result = await toggleFreezeMutation.mutateAsync({
        id: freezeDialog.company.id,
        isFrozen: !isCurrentlyFrozen,
      });
      if (result.error) throw new Error(result.error);

      toast.success(
        isCurrentlyFrozen
          ? t('Company unfreezed successfully')
          : t('Company freezed successfully')
      );

      setFreezeDialog({ open: false, company: null });
    } catch (error) {
      console.error('Error toggling freeze state:', error);
      toast.error(t('Operation failed'));
    } finally {
      setIsFreezing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('Manage Companies')} | MANDERA CRM</title>
      </Helmet>

      <MasterAdminHeader />

      <div className="min-h-[calc(100vh-80px)] bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 font-outfit">{t('Companies')}</h1>
              <p className="text-muted-foreground">{t('Manage all registered companies')}</p>
            </div>
            <Link href="/master-dashboard/companies/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('Add company')}
              </Button>
            </Link>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>{t('All Companies')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse border border-border/50"></div>
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4 font-medium">{t('No companies found')}</p>
                  <Link href="/master-dashboard/companies/new">
                    <Button variant="outline">{t('Add your first company')}</Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>{t('Company Name')}</TableHead>
                        <TableHead>{t('Email')}</TableHead>
                        <TableHead>{t('Employee Count')}</TableHead>
                        <TableHead>{t('Status')}</TableHead>
                        <TableHead>{t('Created Date')}</TableHead>
                        <TableHead className="text-right w-[140px]">{t('Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <CompanyRow
                          key={company.id}
                          company={company}
                          onDelete={(c) => setDeleteDialog({ open: true, company: c })}
                          onToggleFreeze={(c) => setFreezeDialog({ open: true, company: c })}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !isDeleting && setDeleteDialog({ open, company: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('Confirm Deletion')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80 pt-2 text-base">
              {t('Are you sure you want to delete this company? All related data will be permanently deleted.')}
              <div className="mt-4 font-medium p-3 bg-muted rounded-md border border-border">
                {deleteDialog.company?.company_name}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between items-center mt-4 border-t border-border pt-4">
            <AlertDialogCancel disabled={isDeleting}>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Freeze/Unfreeze Confirmation Dialog */}
      <AlertDialog open={freezeDialog.open} onOpenChange={(open) => !isFreezing && setFreezeDialog({ open, company: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {freezeDialog.company?.is_frozen ? <Unlock className="h-5 w-5 text-emerald-600" /> : <Lock className="h-5 w-5 text-amber-600" />}
              {freezeDialog.company?.is_frozen ? t('Confirm Unfreeze') : t('Confirm Freeze')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/80 pt-2 text-base">
              {freezeDialog.company?.is_frozen
                ? t('Do you want to unfreeze this company?')
                : t('Do you want to freeze this company?')}
              <div className="mt-4 font-medium p-3 bg-muted rounded-md border border-border">
                {freezeDialog.company?.company_name}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between items-center mt-4 border-t border-border pt-4">
            <AlertDialogCancel disabled={isFreezing}>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleFreezeConfirm();
              }}
              className={freezeDialog.company?.is_frozen ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
              disabled={isFreezing}
            >
              {isFreezing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : (freezeDialog.company?.is_frozen ? t('Unfreeze') : t('Freeze'))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
};

export default CompanyListPage;
