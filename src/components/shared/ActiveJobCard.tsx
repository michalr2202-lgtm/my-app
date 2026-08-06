"use client";

import { Card } from "@/components/ui/Card";
import { StatusBar } from "@/components/ui/StatusBar";
import { resolveCategoryBackground } from "@/lib/categoryVisuals";
import { formatJobDate, formatTimeWindow } from "@/lib/formatDate";
import { getJobStatusLabel } from "@/lib/jobStatus";
import type { ActiveJob } from "@/lib/types";

export interface ActiveJobCardProps {
  job: ActiveJob;
  onClick?: () => void;
}

/**
 * ActiveJobCard - shown when the customer has a non-completed/cancelled
 * job. See /docs/home-screen-prd.md 3.1 and Flow 6 (click -> job details).
 */
export function ActiveJobCard({ job, onClick }: ActiveJobCardProps) {
  const background = resolveCategoryBackground({
    name_en: job.categoryColorKey,
  });

  return (
    <Card
      interactive
      onClick={onClick}
      className={background.className}
      style={background.style}
    >
      {/*
        Nested gap groups match Figma exactly (verified via get_design_context
        on the isolated node): 4px between the category/date and name/time
        rows, then 16px before the service/price row - NOT a uniform 16px
        between all 3 rows.
      */}
      <div className="flex w-full flex-col gap-6 px-6 py-5">
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-1">
            <div className="flex w-full items-end justify-between">
              <p className="text-lg font-semibold leading-[1.4] text-text-primary">
                {job.categoryLabel}
              </p>
              <p className="text-sm font-semibold leading-[1.4] text-text-primary">
                {formatJobDate(job.scheduledTime)}
              </p>
            </div>
            <div className="flex w-full items-center justify-between">
              <p className="text-sm leading-[1.4] text-text-primary">
                {job.professionalName}
              </p>
              <p dir="ltr" className="text-sm font-semibold leading-[1.4] text-text-primary">
                {formatTimeWindow(job.scheduledTime)}
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-between">
            <p className="text-sm leading-[1.4] text-text-primary">
              {job.serviceLabel}
            </p>
            <p dir="ltr" className="text-sm leading-[1.4] text-text-primary">
              {`\u20AA ${job.priceMin}-${job.priceMax}`}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center justify-center">
          <StatusBar>{getJobStatusLabel(job.status)}</StatusBar>
        </div>
      </div>
    </Card>
  );
}
