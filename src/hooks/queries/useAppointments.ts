"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClientAppointments,
  createClientAppointment,
  deleteClientAppointment,
} from "@/actions/appointments";

export function useClientAppointments(companyId?: string, clientId?: string) {
  return useQuery({
    queryKey: ["client_appointments", companyId, clientId],
    queryFn: async () => {
      const result = await getClientAppointments(companyId!, clientId!);
      if (result.error) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: !!companyId && !!clientId,
  });
}

export function useCreateClientAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClientAppointment,
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["client_appointments", vars.companyId, vars.clientId],
      });
    },
  });
}

export function useDeleteClientAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      companyId,
      clientId,
    }: {
      id: string;
      companyId: string;
      clientId: string;
    }) => deleteClientAppointment(id, companyId, clientId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["client_appointments", vars.companyId, vars.clientId],
      });
    },
  });
}
