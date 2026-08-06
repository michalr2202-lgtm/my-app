import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Info,
  MapPin,
  Navigation,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Notification icon/tone system, per /docs/notification_system_prd.md
 * section 4 ("Visual System (FINAL)"). Text color is always the same
 * (text-primary) - only the icon carries color/meaning.
 *
 * `type` values below are first-pass slugs inferred from the PRD's section
 * headers (the PRD only gives one literal example: `type: 'delay'`). These
 * should be confirmed/standardized once real job_updates rows exist.
 */

export type NotificationTone = "success" | "live" | "reminder" | "problem" | "info";

export const NOTIFICATION_TONE_CLASS: Record<NotificationTone, string> = {
  success: "text-green-600",
  live: "text-blue-500",
  reminder: "text-orange-500",
  problem: "text-notification-red",
  info: "text-text-secondary",
};

interface NotificationVisual {
  /** Lucide icon - tinted via NOTIFICATION_TONE_CLASS. Mutually exclusive with `iconSrc`. */
  icon?: LucideIcon;
  /**
   * Custom SVG asset (own baked-in color, from /public/icons) - used instead
   * of `icon` when Figma provides a pixel-exact reference for this type.
   * Currently only "cancelled" has one (matches Figma's solid/filled
   * "CancelIcon", not lucide's outline-style XCircle).
   */
  iconSrc?: string;
  tone: NotificationTone;
}

const NOTIFICATION_VISUALS: Record<string, NotificationVisual> = {
  professional_assigned: { icon: UserCheck, tone: "live" },
  pre_arrival_reminder: { icon: Clock, tone: "reminder" },
  on_the_way: { icon: Navigation, tone: "live" },
  delay_minor: { icon: Clock, tone: "reminder" },
  delay_major: { icon: AlertCircle, tone: "reminder" },
  arrived: { icon: CheckCircle, tone: "success" },
  job_summary: { icon: FileText, tone: "success" },
  rescheduled: { icon: Calendar, tone: "reminder" },
  cancelled: { iconSrc: "/icons/notification-cancelled.svg", tone: "problem" },
  reminder_to_start: { icon: Clock, tone: "reminder" },
  did_not_start: { icon: AlertTriangle, tone: "problem" },
  delay_pending_approval: { icon: Clock, tone: "reminder" },
  reminder_mark_arrival: { icon: MapPin, tone: "reminder" },
  reminder_send_summary: { icon: FileText, tone: "reminder" },
  commission_payment_required: { icon: Wallet, tone: "problem" },
  system_info: { icon: Info, tone: "info" },
};

const DEFAULT_VISUAL: NotificationVisual = { icon: Info, tone: "info" };

export function getNotificationVisual(type: string): NotificationVisual {
  return NOTIFICATION_VISUALS[type] ?? DEFAULT_VISUAL;
}
