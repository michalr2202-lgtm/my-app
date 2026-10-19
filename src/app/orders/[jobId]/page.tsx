import { JobDetailsScreen } from "@/components/client/orders/JobDetailsScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import { withDevPreviewFinalPrice } from "@/lib/devPreviewData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchJobById } from "@/lib/queries/jobById";
import { fetchJobPhotoUrls } from "@/lib/queries/jobAttachments";

/**
 * /orders/[jobId] route - see `JobDetailsScreen`'s doc comment. Same
 * per-request, cookie-authenticated server client pattern as `/` and
 * `/orders` (`createSupabaseServerClient` + `getCurrentCustomerId`).
 *
 * `params` is a Promise here per this project's Next.js version (see
 * AGENTS.md) - confirmed against `node_modules/next/dist/docs`'s "Dynamic
 * Segments" guide.
 *
 * `fetchJobById`/`fetchJobPhotoUrls` run in parallel (fixed 2026-09-30,
 * were sequential - `photoUrls` only started fetching after `fetchedJob`
 * resolved, needlessly serializing 2 network round trips into one this
 * screen has to wait through before it can render anything at all - no
 * `loading.tsx` exists anywhere in the app yet, so the browser shows
 * nothing until this whole function returns). Safe to run photos
 * unconditionally, without waiting to know if `fetchedJob` is even
 * non-null first: `fetchJobPhotoUrls` has no ownership check of its own
 * in application code, but doesn't need one - `job_attachments`' own RLS
 * policy (`job_attachments.sql`) already requires `jobs.customer_id =
 * auth.uid()` (or a matching `job_assignments` row) independently, at the
 * database level, for both the table read and the Storage signed-URL
 * exchange. A request for a job that doesn't exist, or isn't this
 * customer's, correctly still comes back `[]` either way - this change
 * doesn't relax that check, just stops waiting on it before starting a
 * second, independent request that was never actually gated on its
 * *result*, only sequenced after it for no real reason.
 */
export default async function JobDetailsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  const supabase = await createSupabaseServerClient();
  const customerId = await getCurrentCustomerId(supabase);

  const [fetchedJob, photoUrls] = await Promise.all([
    fetchJobById(supabase, jobId, customerId),
    fetchJobPhotoUrls(supabase, jobId),
  ]);

  // See src/lib/devPreviewData.ts - temporary, QA-only overlay; a no-op
  // once this job has a real final price. (The matching
  // `withDevPreviewProfessional` overlay was removed 2026-09-30, once its
  // one purpose - letting the customer confirm how the name/call-button
  // row looks against a real order - was confirmed: it had no status
  // gating at all, so it injected a fake professional name/phone onto
  // ANY job with an empty `professionalName`, including one still
  // `searching_professional` - a state real `job_assignments` data could
  // never produce, since that row only ever exists from `confirmed`
  // onward. Removing it restores the correct, currently-empty behavior
  // for every real job today, exactly as it'll look once real
  // assignments exist but none has been made yet.)
  const job = fetchedJob ? withDevPreviewFinalPrice(fetchedJob) : fetchedJob;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg">
      <JobDetailsScreen job={job} photoUrls={photoUrls} />
    </div>
  );
}
