"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateEntityStatus, type UpdateEntityStatusInput } from "@/actions/statusUpdate";

export function useUpdateEntityStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEntityStatusInput) => updateEntityStatus(input),
    onSuccess: (result, variables) => {
      if (result.error) return;
      if (variables.entityType === "owner") {
        queryClient.invalidateQueries({ queryKey: ["owners"] });
      } else if (variables.entityType === "property") {
        queryClient.invalidateQueries({ queryKey: ["properties"] });
      }
    },
  });
}
