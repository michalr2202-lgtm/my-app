import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "job-attachments";

/** Shared shape for both this file's error sources (Storage vs. Postgrest) - see `describeError`. */
type QueryError = { message?: string; code?: string; details?: string; hint?: string };

/**
 * `public.job_attachments.content_type` is NOT a MIME type column -
 * confirmed 2026-09-08 after a real insert hit
 * `job_attachments_content_type_check` (`CHECK (content_type = ANY
 * (ARRAY['image', 'note']))`). It's a coarse row-kind tag: `'image'` rows
 * use `file_url`, `'note'` rows use `text_content` (see this table's
 * `text_content` column - unused by this feature, a job's note lives on
 * `jobs.notes` directly instead). This feature only ever inserts `'image'`
 * rows. The photo's actual MIME type (`image/jpeg` etc.) still goes to
 * Storage's own `upload()` call below - just not stored in this column.
 */
const CONTENT_TYPE_IMAGE = "image";

/**
 * `console.error("...", errorObject)` rendered as an empty `{}` in the
 * Next.js dev overlay for a real insert failure (2026-09-08) - the object
 * itself almost certainly wasn't actually empty (both a Postgrest error
 * and a Storage error always carry a `message`, often `code`/`details`/
 * `hint` too), the overlay just didn't serialize it usefully. Logging
 * these fields as a plain string instead sidesteps that entirely - a
 * string can't fail to serialize. Loosely typed (not `PostgrestError` /
 * the storage SDK's own error type) since this reads whichever shape
 * either of this file's 2 Supabase calls (Storage vs. Postgrest) throws.
 */
function describeError(error: QueryError | null): string {
  if (!error) return "";
  const parts: string[] = [error.message ?? "(no message)"];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);
  return parts.join(" | ");
}

/** How many times `withRetries` attempts a call before giving up - see its doc comment. */
const MAX_ATTEMPTS = 3;
/** Linear backoff base - attempt 2 waits this long, attempt 3 waits double, etc. */
const RETRY_DELAY_MS = 1000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a Supabase call (Storage or Postgrest - both resolve to
 * `{ error }`) up to `MAX_ATTEMPTS` times with linear backoff, added
 * 2026-09-29 - a real photo upload was silently and permanently dropped
 * (2026-09-28, over a mobile connection) from a single transient
 * `"Failed to fetch"`, with no retry attempted at all. Photo loss on one
 * network blip is exactly the failure mode `uploadJobAttachments`'s own
 * "must not block/fail the job" design was never meant to excuse - that
 * design says a hiccup shouldn't roll back the job, not that the app
 * shouldn't even try again first.
 *
 * `treatAsSuccess` covers the one genuinely tricky case retrying
 * introduces: the *previous* attempt's request may have actually reached
 * the server and succeeded, with only its response lost before reaching
 * this client (so this code still believes it failed) - a plain retry
 * would then get back a real "already exists"-style conflict that isn't
 * an actual failure. The `job_attachments` insert below has no such case
 * (no unique constraint on it) - a genuine "insert succeeded, response
 * lost, then retried" there just creates a harmless duplicate row, in the
 * tiny fraction of a percent this would ever happen at all - so its call
 * site below doesn't pass one.
 */
async function withRetries(
  // `PromiseLike`, not `Promise` - a Postgrest call (e.g. `.insert(...)`)
  // returns a thenable query builder, not a real `Promise`, and doesn't
  // structurally satisfy the latter.
  attemptFn: () => PromiseLike<{ error: QueryError | null }>,
  treatAsSuccess: (error: QueryError) => boolean = () => false
): Promise<{ error: QueryError | null }> {
  let lastError: QueryError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { error } = await attemptFn();
    if (!error || treatAsSuccess(error)) return { error: null };
    lastError = error;
    if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS * attempt);
  }
  return { error: lastError };
}

/** See `withRetries`'s `treatAsSuccess` doc - only meaningful for the Storage upload call below, not the insert. */
function isAlreadyExistsError(error: QueryError): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("already exists") || message.includes("duplicate");
}

/**
 * Storage keys must be ASCII-safe - Supabase Storage rejected a real photo
 * upload 2026-09-08 with "Invalid key" because the original file name was
 * a long Hebrew, space- and parenthesis-containing AI-generated-image name
 * (e.g. from a phone's photo library / AI image generator). Rather than
 * trying to allow-list every character Supabase's key validation accepts,
 * the storage path drops the original name entirely and keeps only a
 * lowercase-alnum extension - there's no `file_name` column to preserve
 * the original name in anyway (see `job_attachments.sql`'s doc comment).
 */
function safeFileExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]+)$/.exec(fileName);
  return match ? match[1].toLowerCase() : "bin";
}

/**
 * Uploads the Booking Flow's Attachments-step photos to Storage and links
 * them to the newly-created job (Phase 3, 2026-09-08) - see
 * `supabase/sql/job_attachments.sql` for the bucket/RLS this relies on.
 * Called from `BookingFlowSheet.submitBooking` right after
 * `submit_booking` returns the new job's id.
 *
 * `public.job_attachments` already existed in Supabase before this feature
 * (same as `job_assignments`/`job_updates`) with its own shape - this
 * writes to that existing shape (`job_id`, `user_id`, `content_type`,
 * `file_url`), not a new one. `content_type` is a coarse `'image' | 'note'`
 * row-kind tag, not a MIME type - see `CONTENT_TYPE_IMAGE`'s doc comment.
 * `file_url` holds the Storage object *path* (the bucket is private -
 * there is no public URL), and `job_attachments.sql`'s doc comment
 * explains why there's no separate filename column. `text_content` is
 * left null - unrelated to this feature (a job's note lives on
 * `jobs.notes` directly).
 *
 * Derives `user_id` itself via `auth.getUser()` rather than taking it as a
 * parameter: by the time this runs, `submit_booking` already succeeded,
 * which itself requires `auth.uid()` to be non-null, so this is safe and
 * keeps the caller from having to thread a session value through.
 *
 * Path convention `{jobId}/{uuid}.{ext}` (extension only, no original
 * file name - see `safeFileExtension` above) - the `{jobId}` prefix is
 * load-bearing: the Storage RLS policies parse it back out of the object
 * path to check job involvement (see that SQL file's design notes), so it
 * must stay exactly this shape.
 *
 * Deliberately does not throw or fail the caller: by the time this runs,
 * `submit_booking` has already committed the job - a photo upload
 * hiccup (network blip, one bad file) shouldn't roll that back or block
 * the customer from reaching the "job created" screen. Each photo is
 * attempted independently (`Promise.allSettled`) so one failure doesn't
 * skip the rest; failures are only logged. Both the Storage upload and the
 * `job_attachments` insert go through `withRetries` (added 2026-09-29 -
 * see its doc comment) - a photo is only ever actually dropped after 3
 * genuine failures, not the very first transient one.
 */
export async function uploadJobAttachments(supabase: SupabaseClient, jobId: string, photos: File[]): Promise<void> {
  if (photos.length === 0) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("uploadJobAttachments: no authenticated user, skipping upload");
    return;
  }

  await Promise.allSettled(
    photos.map(async (photo) => {
      const storagePath = `${jobId}/${crypto.randomUUID()}.${safeFileExtension(photo.name)}`;

      const { error: uploadError } = await withRetries(
        () =>
          supabase.storage.from(BUCKET).upload(storagePath, photo, {
            contentType: photo.type || "application/octet-stream",
          }),
        isAlreadyExistsError
      );

      if (uploadError) {
        console.error("uploadJobAttachments upload error:", describeError(uploadError));
        return;
      }

      const { error: insertError } = await withRetries(() =>
        supabase.from("job_attachments").insert({
          job_id: jobId,
          user_id: user.id,
          content_type: CONTENT_TYPE_IMAGE,
          file_url: storagePath,
        })
      );

      if (insertError) {
        console.error("uploadJobAttachments insert error:", describeError(insertError));
      }
    })
  );
}

/**
 * How long a signed photo URL stays valid (Job Details screen, added
 * 2026-09-28) - one hour comfortably covers a single page view/refresh
 * without needing a refresh mechanism; a new signed URL is generated on
 * every server-render anyway (`fetchJobById`'s pattern), so there's no
 * caching concern that would make a longer expiry worthwhile.
 */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

/**
 * Fetches signed display URLs for a job's attached photos (Job Details
 * screen, `JobDetailsScreen.tsx`) - the read-side counterpart to
 * `uploadJobAttachments` above. Only `'image'` rows are considered (a
 * job's note lives on `jobs.notes` directly, not a `'note'`-tagged row
 * here - see `CONTENT_TYPE_IMAGE`'s doc comment).
 *
 * `file_url` is a private Storage object path, not a public URL (bucket
 * `job-attachments` has `public: false` - see `job_attachments.sql`), so
 * every row must be exchanged for a short-lived signed URL before it can
 * be used in an `<img>` tag. Ordered by `created_at asc` (upload order -
 * the order photos were originally attached during booking).
 *
 * Never throws - a signing failure for one photo just drops that photo
 * (logged), rather than failing the whole screen; the caller renders
 * whatever comes back (0-3 URLs), same "don't block the page over a
 * photo issue" reasoning as `uploadJobAttachments`.
 */
export async function fetchJobPhotoUrls(supabase: SupabaseClient, jobId: string): Promise<string[]> {
  const { data: rows, error } = await supabase
    .from("job_attachments")
    .select("file_url")
    .eq("job_id", jobId)
    .eq("content_type", CONTENT_TYPE_IMAGE)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchJobPhotoUrls select error:", describeError(error));
    return [];
  }

  const paths = (rows ?? [])
    .map((row) => (row as { file_url: string | null }).file_url)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return [];

  const signedUrls = await Promise.all(
    paths.map(async (path) => {
      const { data, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

      if (signError || !data) {
        console.error("fetchJobPhotoUrls sign error:", describeError(signError));
        return null;
      }

      return data.signedUrl;
    })
  );

  return signedUrls.filter((url): url is string => Boolean(url));
}
