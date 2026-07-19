"use client";

import React from "react";
import { useCompanyAuth } from "@/contexts/CompanyAuthContext";
import { useClientPipeline } from "@/hooks/queries/useClientPipeline";
import { TrendingUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const ClientPipelineWidget = () => {
  const { company } = useCompanyAuth();
  const { t } = useTranslation();
  const { data, isLoading } = useClientPipeline(company?.id);

  const pipelineData = data?.statuses ?? [];
  const totalClients = data?.totalClients ?? 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center bg-card shadow-sm mb-8 border rounded-xl w-full h-[110px]">
        <Loader2 className="w-6 h-6 text-primary/50 animate-spin" />
      </div>
    );
  }

  if (pipelineData.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-1">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="font-outfit font-bold text-foreground text-xl">
          {t("Client Pipeline")}
        </h2>
      </div>

      <div className="flex gap-3 -mx-4 sm:mx-0 px-4 sm:px-0 pb-4 overflow-x-auto snap-x hide-scrollbar">
        {pipelineData.map((status, index) => {
          const percentage =
            totalClients > 0
              ? Math.round((status.count / totalClients) * 100)
              : 0;

          return (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex-1 min-w-[160px] max-w-[200px] snap-start shrink-0"
            >
              <div className="group box-border relative flex flex-col bg-card shadow-sm hover:shadow-md p-3 border border-border/60 hover:border-primary/40 rounded-xl h-[115px] transition-all hover:-translate-y-1 duration-300">
                {/* Decorative top accent */}
                <div className="top-0 left-0 absolute bg-primary/10 group-hover:bg-primary/30 rounded-t-xl w-full h-1 transition-colors" />

                {/* Header: Title and Priority */}
                <div className="flex justify-between items-start gap-2 mb-1 w-full">
                  <h3
                    className="font-semibold text-[13px] text-foreground truncate leading-tight"
                    title={status.name}
                  >
                    {status.name}
                  </h3>
                  <span className="flex-shrink-0 bg-muted/80 px-1.5 py-0.5 rounded font-bold text-[10px] text-muted-foreground/80">
                    #{status.priority_order || index + 1}
                  </span>
                </div>

                {/* Body: Large Count */}
                <div className="flex flex-col flex-1 justify-center">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-outfit font-bold tabular-nums text-primary text-2xl leading-none tracking-tight">
                      {status.count}
                    </span>
                  </div>
                </div>

                {/* Footer: Percentage and Label */}
                <div className="mt-auto pt-2 w-full">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center font-medium text-[11px] text-muted-foreground">
                      <span>{t("clients")}</span>
                      <span>{percentage}%</span>
                    </div>
                    {/* Progress bar indicator */}
                    <div className="bg-muted rounded-full w-full h-1 overflow-hidden">
                      <div
                        className="bg-primary rounded-full h-full transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientPipelineWidget;
