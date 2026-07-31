"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  submitPropertyForReview,
  approveProperty,
  rejectProperty,
  returnPropertyForChanges,
  createPropertyChangeRequest,
  reviewPropertyChangeRequest,
  reviewPropertyChangeRequestImages,
  reviewPropertyStatusChangeRequest,
  listPendingPropertyApprovals,
  cancelPropertyChangeRequest,
  getPendingChangeRequestForProperty,
  classifyProperty,
  pauseProperty,
  unpauseProperty,
  lockProperty,
  unlockProperty,
  reopenArchivedProperty,
  lockClientRecord,
  unlockClientRecord,
  lockOwnerRecord,
  unlockOwnerRecord,
} from "@/actions/propertyApprovals";

export function usePendingPropertyApprovals(companyId: string | undefined) {
  return useQuery({
    queryKey: ["pending-property-approvals", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const result = await listPendingPropertyApprovals(companyId!);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
  });
}

export function usePendingChangeRequestForProperty(
  propertyId: string | undefined,
  companyId: string | undefined,
) {
  return useQuery({
    queryKey: ["pending-change-request", companyId, propertyId],
    enabled: Boolean(propertyId && companyId),
    queryFn: async () => {
      const result = await getPendingChangeRequestForProperty(
        propertyId!,
        companyId!,
      );
      if (result.error) throw new Error(result.error);
      return result.data ?? null;
    },
  });
}

export function usePropertyApprovalMutations(companyId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["pending-property-approvals", companyId] });
    void qc.invalidateQueries({ queryKey: ["properties"] });
    void qc.invalidateQueries({ queryKey: ["property"] });
    void qc.invalidateQueries({ queryKey: ["pending-approvals-count", companyId] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return {
    submitForReview: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await submitPropertyForReview(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    approve: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await approveProperty(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: async ({ propertyId, note }: { propertyId: string; note: string }) => {
        const result = await rejectProperty(propertyId, companyId!, note);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    returnForChanges: useMutation({
      mutationFn: async ({ propertyId, note }: { propertyId: string; note: string }) => {
        const result = await returnPropertyForChanges(propertyId, companyId!, note);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    createChangeRequest: useMutation({
      mutationFn: async (input: Parameters<typeof createPropertyChangeRequest>[0]) => {
        const result = await createPropertyChangeRequest(input);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    reviewChangeRequest: useMutation({
      mutationFn: async (input: {
        id: string;
        decision: "approved" | "rejected" | "changes_requested";
        note?: string;
      }) => {
        const result = await reviewPropertyChangeRequest(
          input.id,
          input.decision,
          input.note,
        );
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    reviewChangeRequestImages: useMutation({
      mutationFn: async (input: {
        id: string;
        decision: "approved" | "rejected";
        acceptedAddedUrls?: string[];
        note?: string;
      }) => {
        const result = await reviewPropertyChangeRequestImages(
          input.id,
          input.decision,
          {
            acceptedAddedUrls: input.acceptedAddedUrls,
            note: input.note,
          },
        );
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    reviewStatusRequest: useMutation({
      mutationFn: async (input: {
        id: string;
        decision: "approved" | "rejected";
        note?: string;
      }) => {
        const result = await reviewPropertyStatusChangeRequest(
          input.id,
          input.decision,
          input.note,
        );
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    cancelChangeRequest: useMutation({
      mutationFn: async (id: string) => {
        const result = await cancelPropertyChangeRequest(id, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: () => {
        invalidate();
        void qc.invalidateQueries({ queryKey: ["pending-change-request", companyId] });
      },
    }),
    classify: useMutation({
      mutationFn: async (input: {
        propertyId: string;
        classification: "A" | "B" | "C";
        reason: string;
      }) => {
        const result = await classifyProperty(
          input.propertyId,
          companyId!,
          input.classification,
          input.reason,
        );
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    pause: useMutation({
      mutationFn: async ({ propertyId, reason }: { propertyId: string; reason: string }) => {
        const result = await pauseProperty(propertyId, companyId!, reason);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    unpause: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await unpauseProperty(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    lock: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await lockProperty(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    unlock: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await unlockProperty(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
    reopenArchived: useMutation({
      mutationFn: async (propertyId: string) => {
        const result = await reopenArchivedProperty(propertyId, companyId!);
        if (result.error) throw new Error(result.error);
        return result.data!;
      },
      onSuccess: invalidate,
    }),
  };
}

export function useRecordLockMutations(companyId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["client"] });
    void qc.invalidateQueries({ queryKey: ["clients"] });
    void qc.invalidateQueries({ queryKey: ["owner"] });
    void qc.invalidateQueries({ queryKey: ["owners"] });
  };

  const run = async (
    action: (
      id: string,
      company: string,
    ) => Promise<{ data?: { id: string }; error?: string }>,
    id: string,
  ) => {
    const result = await action(id, companyId!);
    if (result.error) throw new Error(result.error);
    return result.data!;
  };

  return {
    lockClient: useMutation({
      mutationFn: (id: string) => run(lockClientRecord, id),
      onSuccess: invalidate,
    }),
    unlockClient: useMutation({
      mutationFn: (id: string) => run(unlockClientRecord, id),
      onSuccess: invalidate,
    }),
    lockOwner: useMutation({
      mutationFn: (id: string) => run(lockOwnerRecord, id),
      onSuccess: invalidate,
    }),
    unlockOwner: useMutation({
      mutationFn: (id: string) => run(unlockOwnerRecord, id),
      onSuccess: invalidate,
    }),
  };
}
