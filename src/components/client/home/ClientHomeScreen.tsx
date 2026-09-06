"use client";

import { useState } from "react";
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
 * Search opens the shared booking Bottom Sheet (Flow 1). Other entry points
 * still stubbed until their Figma steps are wired into BookingFlowSheet.
 */
export function ClientHomeScreen({ categories, services, activeJob, notification }: ClientHomeScreenProps) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingQuery, setBookingQuery] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setBookingQuery(trimmed);
    setBookingOpen(true);
  };

  const handleSelectTime = (selection: TimeSelection) => {
    // TODO: open Bottom Sheet -> scheduling-first entry (Flow 2).
    console.log("time selection:", selection);
  };

  const handleSelectCategory = (category: Category) => {
    // TODO: open Bottom Sheet -> services in category (Flow 3).
    console.log("category:", category.name_en);
  };

  const handleSelectService = (service: ServiceWithCategory) => {
    // TODO: open Bottom Sheet -> scheduling (Flow 4).
    console.log("service:", service.name_en);
  };

  const handleActiveJobClick = () => {
    // TODO: navigate to job details screen (Flow 6).
    console.log("active job clicked:", activeJob?.id);
  };

  const handleNotificationClick = () => {
    // TODO: navigate to Job Full Screen, Orders tab active (Flow 7).
    console.log("notification clicked:", notification?.id);
  };

  const handleCloseBooking = () => {
    setBookingOpen(false);
    setBookingQuery(null);
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

      <BookingFlowSheet open={bookingOpen} query={bookingQuery} onClose={handleCloseBooking} />
    </div>
  );
}
