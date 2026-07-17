'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, Home, Loader2, Medal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EmployeeLeaderboard = ({ companyId }) => {
  const { t } = useTranslation();
  const [employeesData, setEmployeesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        // Fetch all employees
        const empRes = await pb.collection('company_employees').getList(1, 500, {
          filter: `companyId="${companyId}"`,
          $autoCancel: false
        });

        // Process each employee
        const promises = empRes.items.map(async (emp) => {
          // 1. Fetch clients for this employee
          const clientsRes = await pb.collection('clients').getFullList({
            filter: `employee_id="${emp.id}"`,
            $autoCancel: false
          });
          
          // Fetch properties for this employee
          const propsRes = await pb.collection('properties').getList(1, 1, {
            filter: `employee_id="${emp.id}"`,
            $autoCancel: false
          });

          // 2. Retrieve latest status for each client
          const statusCounts = {};
          const clientIds = clientsRes.map(c => c.id);
          
          if (clientIds.length > 0) {
            // Chunk fetching to avoid URL length limits
            const chunkSize = 50;
            for (let i = 0; i < clientIds.length; i += chunkSize) {
              const chunk = clientIds.slice(i, i + chunkSize);
              const filterStr = chunk.map(id => `client_id="${id}"`).join(' || ');
              
              const historyRes = await pb.collection('client_status_history').getFullList({
                filter: filterStr,
                sort: '-created', // Newest first
                expand: 'status_id',
                $autoCancel: false
              });

              const clientCurrentStatus = {};
              // First occurrence in sorted array is the latest
              historyRes.forEach(h => {
                if (!clientCurrentStatus[h.client_id]) {
                  clientCurrentStatus[h.client_id] = h.expand?.status_id?.name || 'Unknown';
                }
              });

              // 3. Group by status and count
              Object.values(clientCurrentStatus).forEach(status => {
                statusCounts[status] = (statusCounts[status] || 0) + 1;
              });

              // Account for clients with NO status history (New)
              const clientsWithHistory = Object.keys(clientCurrentStatus).length;
              if (clientsWithHistory < chunk.length) {
                statusCounts['__NEW__'] = (statusCounts['__NEW__'] || 0) + (chunk.length - clientsWithHistory);
              }
            }
          }

          return {
            id: emp.id,
            name: emp.name || emp.firstName || emp.email,
            clientsCount: clientsRes.length,
            propertiesCount: propsRes.totalItems,
            statusCounts
          };
        });

        let results = await Promise.all(promises);
        
        // Sort descending by clients count
        results.sort((a, b) => b.clientsCount - a.clientsCount);
        
        setEmployeesData(results);
      } catch (error) {
        console.error('Leaderboard error:', error);
        toast.error(t('Failed to load employee leaderboard.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [companyId, t]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card className="border-border/60 shadow-sm mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-5 w-5 text-primary" />
          {t('Team Leaderboard')}
        </CardTitle>
        <CardDescription>
          {t('Performance metrics for your team members sorted by active clients.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : employeesData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('No employees found for this company.')}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-16 text-center">{t('Rank')}</TableHead>
                  <TableHead>{t('Employee Name')}</TableHead>
                  <TableHead className="text-right">{t('Clients (عملاء)')}</TableHead>
                  <TableHead className="text-right">{t('Properties (عقارات)')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesData.map((emp, index) => {
                  const isTop = index === 0 && emp.clientsCount > 0;
                  const isExpanded = !!expandedRows[emp.id];

                  return (
                    <React.Fragment key={emp.id}>
                      {/* Main Employee Row */}
                      <TableRow 
                        onClick={() => toggleRow(emp.id)}
                        className={cn(
                          "cursor-pointer transition-colors group",
                          isTop ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-muted/50",
                          isExpanded && !isTop ? "bg-muted/30" : ""
                        )}
                      >
                        <TableCell className="text-center font-semibold align-middle">
                          {isTop ? (
                            <div className="flex justify-center">
                              <Trophy className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                            </div>
                          ) : (
                            <span className="text-muted-foreground">#{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell className="align-middle">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-medium", isTop && "text-amber-700 dark:text-amber-400 font-bold")}>
                              {emp.name}
                            </span>
                            {isTop && (
                              <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                {t('Top Performer')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {emp.clientsCount} <Users className="h-4 w-4 text-muted-foreground opacity-50" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {emp.propertiesCount} <Home className="h-4 w-4 text-muted-foreground opacity-50" />
                          </div>
                        </TableCell>
                        <TableCell className="align-middle text-right">
                          <ChevronDown 
                            className={cn(
                              "h-5 w-5 text-muted-foreground transition-transform duration-300 ml-auto",
                              isExpanded && "rotate-180"
                            )} 
                          />
                        </TableCell>
                      </TableRow>

                      {/* Expandable Status Breakdown Row */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <TableRow className={cn(
                            "hover:bg-transparent",
                            isTop ? "bg-amber-500/5" : "bg-muted/10"
                          )}>
                            <TableCell colSpan={5} className="p-0 border-b">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 py-4 md:px-16 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 border-t border-border/50 shadow-inner">
                                  <span className="text-sm font-semibold text-foreground/80 shrink-0">
                                    {t('Status Breakdown:')}
                                  </span>
                                  
                                  <div className="flex flex-wrap items-center gap-2">
                                    {Object.entries(emp.statusCounts).length > 0 ? (
                                      Object.entries(emp.statusCounts).map(([status, count]) => {
                                        const displayName = status === '__NEW__' ? t('New') : status;
                                        return (
                                          <span 
                                            key={status} 
                                            className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20 shadow-sm"
                                          >
                                            {displayName}
                                            <span className="ml-1.5 rtl:mr-1.5 rtl:ml-0 bg-primary/20 text-primary-foreground/90 px-1.5 rounded-full min-w-[1.25rem] text-center">
                                              {count}
                                            </span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border/50">
                                        {t('No client data')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeLeaderboard;