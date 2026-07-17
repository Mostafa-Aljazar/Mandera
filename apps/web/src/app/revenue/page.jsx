'use client';

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useCompanyAuth } from '@/contexts/CompanyAuthContext.jsx';
import pb from '@/lib/pocketbaseClient';
import CompanyAdminHeader from '@/components/CompanyAdminHeader.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarPlus as CalendarIcon, Download, Banknote, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const RevenuePage = () => {
  const { company, currentUser } = useCompanyAuth();
  const { t } = useTranslation();

  const [revenues, setRevenues] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);

  const fetchData = async () => {
    if (!company?.id || currentUser?.role !== 'company_super_admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let filterStr = `company_id = "${company.id}"`;
      if (selectedEmployee !== 'all') {
        filterStr += ` && employee_id = "${selectedEmployee}"`;
      }
      if (dateFrom) {
        filterStr += ` && deal_completion_date >= "${dateFrom.toISOString().split('T')[0]} 00:00:00"`;
      }
      if (dateTo) {
        filterStr += ` && deal_completion_date <= "${dateTo.toISOString().split('T')[0]} 23:59:59"`;
      }

      const [revRes, empRes] = await Promise.all([
        pb.collection('revenues').getFullList({
          filter: filterStr,
          sort: '-deal_completion_date',
          $autoCancel: false
        }),
        pb.collection('company_employees').getFullList({
          filter: `companyId = "${company.id}"`,
          $autoCancel: false
        })
      ]);

      setRevenues(revRes);
      setEmployees(empRes);
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to load revenue data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [company?.id, currentUser?.role, selectedEmployee, dateFrom, dateTo, t]);

  const clearFilters = () => {
    setSelectedEmployee('all');
    setDateFrom(null);
    setDateTo(null);
  };

  const exportCSV = () => {
    if (revenues.length === 0) {
      toast.warning(t('No data to export.'));
      return;
    }
    const headers = [t('Property Code'), t('Location'), t('Commission'), t('Agent'), t('Client & Owner'), t('Completion Date')];
    const rows = revenues.map(r => [
      r.property_code,
      r.emirate + (r.area_district ? ` - ${r.area_district}` : ''),
      r.commission_value,
      r.employee_name,
      `${r.client_name} / ${r.owner_name}`,
      format(new Date(r.deal_completion_date), 'yyyy-MM-dd')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `revenues_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('Export downloaded successfully.'));
  };

  const totalRevenue = revenues.reduce((sum, r) => sum + (r.commission_value || 0), 0);

  if (currentUser?.role !== 'company_super_admin') {
    return (
      <>
        <Helmet>
          <title>{t('Access Denied')} | MANDERA CRM</title>
        </Helmet>
        <CompanyAdminHeader />
        <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-16 flex items-center justify-center px-4">
          <div className="text-center max-w-md mx-auto p-8 bg-card rounded-2xl border shadow-sm">
            <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2 font-outfit">{t('Access Denied')}</h2>
            <p className="text-muted-foreground">
              {t('You do not have permission to view the revenue page. This area is restricted to company administrators.')}
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('Revenue')} | MANDERA CRM</title>
      </Helmet>
      <CompanyAdminHeader />

      <main className="min-h-[calc(100vh-80px)] bg-muted/20 py-8">
        <div className="container mx-auto px-4">

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight font-outfit flex items-center gap-3">
                <Banknote className="h-8 w-8 text-emerald-600" />
                {t('Revenue & Deals')}
              </h1>
              <p className="text-muted-foreground mt-1">{t('Track closed deals and analyze commission revenues.')}</p>
            </div>

            <div className="flex items-center gap-3 bg-card p-4 rounded-xl border shadow-sm w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground font-medium">{t('Total Period Revenue')}</span>
                <span className="text-2xl font-bold text-emerald-600 font-outfit">
                  AED {totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col xl:flex-row gap-4 items-end justify-between border-b pb-6">
              <div className="flex flex-col sm:flex-row flex-wrap items-end gap-3 w-full xl:w-auto">
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground">{t('Filter by Agent')}</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-full sm:w-[200px] h-9">
                      <SelectValue placeholder={t('All Agents')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Agents')}</SelectItem>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name || e.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground">{t('From Date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal h-9", !dateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "MMM d, yyyy") : <span>{t('Select')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground">{t('To Date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full sm:w-[150px] justify-start text-left font-normal h-9", !dateTo && "text-muted-foreground")}>
                        <CalendarIcon className="me-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "MMM d, yyyy") : <span>{t('Select')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                {(selectedEmployee !== 'all' || dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground h-9">
                    {t('Clear Filters')}
                  </Button>
                )}
              </div>

              <Button onClick={exportCSV} variant="secondary" className="gap-2 shrink-0">
                <Download className="h-4 w-4" /> {t('Export CSV')}
              </Button>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{t('Property Code')}</TableHead>
                    <TableHead>{t('Location')}</TableHead>
                    <TableHead>{t('Client & Owner')}</TableHead>
                    <TableHead>{t('Agent')}</TableHead>
                    <TableHead>{t('Completion Date')}</TableHead>
                    <TableHead className="text-right">{t('Commission')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : revenues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <Banknote className="h-8 w-8 mx-auto opacity-20 mb-2" />
                        <p>{t('No revenue records found for the selected period.')}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    revenues.map(r => (
                      <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-semibold font-mono text-xs">{r.property_code}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground/80">{r.emirate}</span>
                            <span className="text-xs text-muted-foreground">{r.area_district}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1 rounded">C</span>
                              {r.client_name}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1 rounded">O</span>
                              {r.owner_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                              {r.employee_name.charAt(0).toUpperCase()}
                            </div>
                            {r.employee_name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(r.deal_completion_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 font-outfit">
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
