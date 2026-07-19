"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLegalPages,
  getLegalPage,
  updateLegalPage,
  type UpdateLegalPageInput,
} from "@/actions/legalPages";
import type { LegalPageType } from "@/types/supabase-entities.types";

export function useLegalPages() {
  return useQuery({
    queryKey: ["legal_pages"],
    queryFn: async () => {
      const result = await getLegalPages();
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useLegalPage(pageType: LegalPageType) {
  return useQuery({
    queryKey: ["legal_pages", pageType],
    queryFn: async () => {
      const result = await getLegalPage(pageType);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useUpdateLegalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLegalPageInput) => updateLegalPage(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_pages"] });
    },
  });
}
