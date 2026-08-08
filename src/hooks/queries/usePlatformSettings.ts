"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlatformSettings,
  updatePlatformSettings,
  type UpdatePlatformSettingsInput,
} from "@/actions/platformSettings";

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform_settings"],
    queryFn: async () => {
      const result = await getPlatformSettings();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePlatformSettingsInput) => {
      const result = await updatePlatformSettings(input);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["platform_settings"], data);
    },
  });
}
