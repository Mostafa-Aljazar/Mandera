'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import pb from '@/lib/pocketbaseClient';
import { toast } from 'sonner';
import { PieChart, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#6366f1', // indigo
  '#eab308', // yellow
  '#0ea5e9'  // cyan
];

const ClientsBySourceWidget = ({ companyId }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('this_month');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const PERIODS = useMemo(() => [
    { id: 'today', label: t('Today') },
    { id: 'yesterday', label: t('Yesterday') },
    { id: 'this_week', label: t('This Week') },
    { id: 'this_month', label: t('This Month') },
    { id: 'this_year', label: t('This Year') }
  ], [t]);

  const getDateRange = (selectedPeriod) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'this_week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return {
      startStr: start.toISOString().replace('T', ' '),
      endStr: end.toISOString().replace('T', ' ')
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setIsLoading(true);

      try {
        const { startStr, endStr } = getDateRange(period);
        const filterStr = `company_id="${companyId}" && created >= "${startStr}" && created <= "${endStr}"`;

        const clientsRes = await pb.collection('clients').getFullList({
          filter: filterStr,
          $autoCancel: false,
          fields: 'id,marketing_channel'
        });

        const counts = {};
        clientsRes.forEach(client => {
          const channel = client.marketing_channel || 'Other';
          counts[channel] = (counts[channel] || 0) + 1;
        });

        // Convert to array and sort descending by count
        const chartData = Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);

        setData(chartData);
      } catch (error) {
        console.error('Error fetching clients by source:', error);
        toast.error(t('Failed to load marketing channels data.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [companyId, period, t]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-1">{label}</p>
          <p className="text-sm flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full inline-block" 
              style={{ backgroundColor: payload[0].payload.fill || payload[0].color }} 
            />
            <span className="text-muted-foreground">{t('Clients')}:</span> 
            <span className="font-medium text-foreground">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b bg-muted/10 pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {t('Clients by Source')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('Distribution of acquired clients across marketing channels.')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-xl border">
          {PERIODS.map(p => (
            <Button
              key={p.id}
              variant={period === p.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "h-8 rounded-lg text-xs transition-all",
                period === p.id ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="h-[350px] w-full flex items-end justify-around gap-2 pb-8 px-4">
            {[40, 70, 45, 90, 60, 30].map((height, i) => (
              <Skeleton key={i} className="w-full max-w-[60px] rounded-t-md" style={{ height: `${height}%` }} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-[350px] flex flex-col items-center justify-center text-center px-4">
            <Filter className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-foreground">
              {t('No client data found')}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {t('There are no clients registered within the selected time period. Try selecting a wider range.')}
            </p>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  tickMargin={12}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  allowDecimals={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  animationDuration={1000}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientsBySourceWidget;