"use client";

import { OrderCard } from "@/components/shared/OrderCard";
import { getJobStatusLabel } from "@/lib/jobStatus";
import type { ActiveJob } from "@/lib/types";

export interface ActiveJobCardProps {
  job: ActiveJob;
  onClick?: () => void;
}

/**
 * ActiveJobCard - shown when the customer has a non-completed/cancelled
 * job. See /docs/home-screen-prd.md 3.1 and Flow 6 (click -> job details).
 *
 * Thin wrapper around the shared `OrderCard` (extracted 2026-09-08 for the
 * Orders screen, `project-prd.md` §6 - see that component's doc comment) -
 * this component's own external API (`job`/`onClick`) and every call site
 * are unchanged; it just fixes `OrderCard`'s variance props to the values
 * this screen has always used (full card, active/blue status pill, label
 * from the generic `jobStatus.*` map).
 */
export function ActiveJobCard({ job, onClick }: ActiveJobCardProps) {
  return (
    <OrderCard
      job={job}
      statusVariant="active"
      statusLabel={getJobStatusLabel(job.status)}
      onClick={onClick}
    />
  );
}
