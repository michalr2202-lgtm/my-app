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
