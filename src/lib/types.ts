/**
 * Domain types.
 *
 * `Category` and `Service` fields are verified against the live Supabase
 * schema. `Job`, `JobAssignment`, `Professional` and `JobUpdate` fields
 * follow the documented model in /docs/project-prd.md (section 11) and
 * /docs/order-model.md, since these tables currently contain no rows to
 * verify against - do not add fields here that aren't confirmed in one of
 * those two places.
 */

export interface Category {
  id: string;
  name_en: string;
  label_he: string;
  icon: string | null;
  color_bg: string;
  color_text: string;
  sort_order: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  category_id: string;
  name_en: string;
  label_he: string;
  description: string | null;
  keywords: string[];
  price_min: number;
  price_max: number;
  duration_min: number | null;
  duration_max: number | null;
  pricing_type: "fixed_range" | "diagnosis" | string;
  is_active: boolean;
  /**
   * True only for the one synthetic per-category row inserted by
   * `supabase/sql/diagnosis_placeholder_services.sql` (added 2026-08-21) -
   * never a real, customer-selectable catalog service. Always `is_active:
   * false`; fetched only via `fetchDiagnosisPlaceholderServiceId`, never
   * through `fetchServicesWithCategory`.
   */
  is_diagnosis_placeholder: boolean;
  sort_order: number;
  created_at: string;
}

export interface ServiceWithCategory extends Service {
  category: Pick<Category, "id" | "name_en" | "label_he" | "sort_order"> | null;
}

/** Order lifecycle status, per /docs/order-model.md. */
export type JobStatus =
  | "draft"
  | "searching_professional"
  | "pending_approval"
  | "confirmed"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "waiting_for_customer"
  | "waiting_for_professional"
  | "incomplete_work";

export interface ActiveJob {
  id: string;
  status: JobStatus;
  scheduledTime: string;
  professionalName: string;
  categoryLabel: string;
  categoryColorKey: string;
  serviceLabel: string;
  priceMin: number;
  priceMax: number;
}

/**
 * A saved address row (`public.addresses`) - a returning customer may own
 * several (see `supabase/sql/address_book.sql`); `is_default` marks
 * whichever one was used most recently, the one `ChooseAddressStep`
 * preselects.
 */
export interface Address {
  id: string;
  city: string;
  street: string;
  building_number: string;
  apartment: string | null;
  entrance_code: string | null;
  /**
   * Who the professional should expect to meet/call at this address, when
   * it's not the account holder (e.g. booking for a parent) - see
   * `supabase/sql/address_book.sql`. Both null unless explicitly set when
   * this address was created.
   */
  contact_name: string | null;
  contact_phone: string | null;
  is_default: boolean;
  /**
   * True only for the one address created together with the profile
   * (`submit_booking`'s brand-new-profile branch, via `NewUserDetailsStep`)
   * - never changes afterward, unlike `is_default` above. See
   * `supabase/sql/address_book.sql`'s `is_primary` doc comment: this
   * address always shows the account holder's own locked name instead of
   * an editable contact override, and can never carry one at all.
   */
  is_primary: boolean;
  /**
   * True only once the *current* `contact_name`/`contact_phone` value has
   * actually gone out in a submitted job (added 2026-09-02, replacing an
   * earlier - buggy - client-side derivation from `addressIdsWithJobs`,
   * which locked a field the instant the *address* had any job history at
   * all, even for a brand-new value never itself submitted). Flipped by
   * `submit_booking`, monotonic (never reverts to `false`) - see
   * `supabase/sql/address_book.sql`'s "Per-value lock, not per-address"
   * note. Drives `ChooseAddressStep`'s `contactNameDisabled`/
   * `contactPhoneDisabled` directly now, instead of `addressIdsWithJobs`.
   */
  contact_name_locked: boolean;
  contact_phone_locked: boolean;
  /**
   * Same per-value lock as the contact fields above (added 2026-09-03):
   * true once the current `building_number`/`apartment` has gone out in a
   * submitted job. `entrance_code` has no matching flag - it stays
   * editable indefinitely. See `supabase/sql/address_book.sql`.
   */
  building_number_locked: boolean;
  apartment_locked: boolean;
}

export type NotificationPriority = "normal" | "urgent" | "critical";

export interface UrgentNotification {
  id: string;
  jobId: string;
  type: string;
  priority: NotificationPriority;
  message: string;
  createdAt: string;
}
