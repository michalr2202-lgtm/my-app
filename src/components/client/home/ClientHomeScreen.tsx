"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActiveJobCard } from "@/components/shared/ActiveJobCard";
import { NotificationBanner } from "@/components/shared/NotificationBanner";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { SearchSection } from "@/components/client/home/SearchSection";
import { CategorySection } from "@/components/client/home/CategorySection";
import { PopularServicesSection } from "@/components/client/home/PopularServicesSection";
import { BookingFlowSheet } from "@/components/client/booking/BookingFlowSheet";
import { getNotificationVisual } from "@/lib/notificationVisuals";
import type { TimeSelection } from "@/components/client/home/TimePillsRow";
import type { ActiveJob, Category, ServiceWithCategory, UrgentNotification } from "@/lib/types";

export interface ClientHomeScreenProps {
  categories: Category[];
  services: ServiceWithCategory[];
  activeJob: ActiveJob | null;
  notification: UrgentNotification | null;
}

/**
 * ClientHomeScreen - top-level Home Screen composition.
 * See /docs/home-screen-prd.md "Component Architecture" and Layout Structure.
 *
 * Search (Flow 1), the Time Pills (Flow 2, wired 2026-09-06), the
 * Category Cards (Flow 3, wired 2026-09-07 - piloted on "חשמלאי" alone
 * first, then extended to all 4 the same day once confirmed), and the
 * Popular Services pills (Flow 4, wired 2026-09-07) all open the shared
 * booking Bottom Sheet - see `BookingFlowSheet`'s doc comment for how each
 * maps onto its step sequence.
 */
export function ClientHomeScreen({ categories, services, activeJob, notification }: ClientHomeScreenProps) {
  const router = useRouter();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingQuery, setBookingQuery] = useState<string | null>(null);
  const [bookingTimeSelection, setBookingTimeSelection] = useState<TimeSelection | null>(null);
  const [bookingCategoryId, setBookingCategoryId] = useState<string | null>(null);
  const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setBookingQuery(trimmed);
    setBookingOpen(true);
  };

  const handleSelectTime = (selection: TimeSelection) => {
    setBookingTimeSelection(selection);
    setBookingOpen(true);
  };

  /**
   * Flow 3 (Category Card) - added 2026-09-07, piloted on "חשמלאי" only
   * first, then confirmed working end-to-end and extended to all 4 the
   * same day. Nothing here is category-specific - `BookingFlowSheet`'s
   * `categoryId` prop and everything downstream of it already handle any
   * category generically - so this is just `setBookingCategoryId`/
   * `setBookingOpen`, same shape as `handleSelectTime` above.
   */
  const handleSelectCategory = (category: Category) => {
    setBookingCategoryId(category.id);
    setBookingOpen(true);
  };

  /**
   * Flow 4 (Service Pill) - wired 2026-09-07, mirrors Flow 3's
   * `handleSelectCategory` exactly. Nothing here is service-specific -
   * `BookingFlowSheet`'s `serviceId` prop and everything downstream of it
   * already handle any catalog service generically - so every Popular
   * Services pill is wired at once, unlike Flow 3's one-category-at-a-time
   * pilot (there's no natural "one pill first" seam here the way there was
   * with 4 distinct category cards).
   */
  const handleSelectService = (service: ServiceWithCategory) => {
    setBookingServiceId(service.id);
    setBookingOpen(true);
  };

  /**
   * Flow 6 (Active Job Click) - wired 2026-09-09, once `JobDetailsScreen`
   * (`/orders/[jobId]`) existed to navigate to. See that component's doc
   * comment for scope (minimal, read-only for this pass).
   */
  const handleActiveJobClick = () => {
    if (!activeJob) return;
    router.push(`/orders/${activeJob.id}`);
  };

  const handleNotificationClick = () => {
    // TODO: navigate to Job Full Screen, Orders tab active (Flow 7).
    console.log("notification clicked:", notification?.id);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    setBookingQuery(null);
    setBookingTimeSelection(null);
    setBookingCategoryId(null);
    setBookingServiceId(null);
  };

  const notificationVisual = notification ? getNotificationVisual(notification.type) : null;

  return (
    <div className="relative flex w-full flex-1 flex-col items-center bg-surface-bg">
      {/*
        `pt-10` (40px, confirmed 2026-09-04 - was `py-6`/24px top too) is
        deliberately more than the 24px `pb-6` bottom padding: the first
        element here is whichever of ActiveJobCard / NotificationBanner /
        SearchSection actually renders first for this customer (state-
        dependent - only SearchSection is unconditional; the build/preview
        environment currently shows both an active job AND an urgent
        notification together to make both visible at once, which isn't
        the typical real state), so this top value is measured from the
        screen's top edge to whichever one that ends up being, not tied to
        any one of them specifically.
      */}
      <div className="flex w-full flex-1 flex-col items-center gap-12 px-4 pb-6 pt-10">
        {activeJob ? <ActiveJobCard job={activeJob} onClick={handleActiveJobClick} /> : null}

        {notification && notificationVisual ? (
          <NotificationBanner
            message={notification.message}
            icon={notificationVisual.icon}
            iconSrc={notificationVisual.iconSrc}
            tone={notificationVisual.tone}
            onClick={handleNotificationClick}
          />
        ) : null}

        <SearchSection onSearch={handleSearch} onSelectTime={handleSelectTime} />
        <CategorySection categories={categories} onSelectCategory={handleSelectCategory} />
        <PopularServicesSection services={services} onSelectService={handleSelectService} />
      </div>

      <div className="sticky bottom-0 flex w-full flex-col items-center bg-surface-bg">
        <div className="h-px w-full bg-divider" />
        {/*
          Temporary placeholder: reuses the urgent-banner fetch as a stand-in for the badge
          signal until the real one exists. Per /docs/notification_system_prd.md §9, the
          badge should reflect whether the latest notification is newer than the user's last
          visit to the Notifications screen (a `last_visited_notifications_at` timestamp) -
          not this banner, which only reflects the single most-recent urgent/critical
          job_update for the active job. Replace once that screen/query exists.
        */}
        <BottomNavigation activeTab="home" hasUnreadNotifications={Boolean(notification)} />
      </div>

      <BookingFlowSheet
        open={bookingOpen}
        query={bookingQuery}
        timeSelection={bookingTimeSelection}
        categoryId={bookingCategoryId}
        serviceId={bookingServiceId}
        categories={categories}
        catalogServices={services}
        onClose={handleCloseBooking}
      />
    </div>
  );
}
