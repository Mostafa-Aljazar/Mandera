'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import supabase from '@/lib/supabase/client';

/**
 * Subscribes to Postgres changes on `table` and debounce-invalidates
 * `queryKey` so TanStack Query refetches. Mirrors the old PocketBase
 * `pb.collection(table).subscribe('*', debouncedFetch)` pattern used by
 * ClientPipelineWidget, generalized so any module can reuse it.
 */
export function useRealtimeInvalidate(
  table: string,
  queryKey: QueryKey,
  filter?: string,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const debouncedInvalidate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 1000);
    };

    const channel = supabase
      .channel(`realtime:${table}:${queryKey.join(':')}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        debouncedInvalidate,
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, queryClient]);
}
