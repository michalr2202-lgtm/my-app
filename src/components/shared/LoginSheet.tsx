"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationStep } from "@/components/client/booking/AuthenticationStep";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { COPY } from "@/lib/copy";
import { supabase } from "@/lib/supabase";

export interface LoginSheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * LoginSheet - standalone phone-verification entry point (added
 * 2026-09-28), decoupled from the Booking Flow entirely. Solves a real gap:
 * a returning customer opening the app on a *different* browser/device
 * than the one they originally booked on has no session there, and until
 * now the only way this app ever created one was as a side effect of
 * placing an order - there was no way to just "log in" to see existing
 * orders without going through category/service/scheduling questions
 * again.
 *
 * Reuses `AuthenticationStep` exactly as `BookingFlowSheet` does (same
 * component, same `supabase.auth.signInWithOtp`/`verifyOtp` calls) - only
 * its `heading`/`subheading` are overridden, since the booking copy talks
 * about the order being placed right now, which doesn't apply here. Its
 * own `pendingPhone` tracking (`onSendCode`'s argument, needed by
 * `onVerifyCode`) mirrors `BookingFlowSheet.handleSendCode`/
 * `handleVerifyCode` exactly, for the same reason: `AuthenticationStep`
 * itself never learns/passes back which phone it sent a code to.
 *
 * On successful verification: closes the sheet and calls `router.refresh()`
 * (not a full page reload) - the session is already synced to cookies by
 * the browser Supabase client (`createBrowserClient`, `src/lib/supabase.ts`)
 * by the time `verifyOtp` resolves, so refreshing just re-runs the current
 * route's Server Component (`OrdersPage`, etc.) with that cookie now
 * present - the same real per-customer data Cursor's browser already
 * shows appears immediately, no navigation needed.
 *
 * Deliberately generic/shared (not under `client/orders`) despite its
 * first caller being `OrdersScreen`'s empty state - the same "I have an
 * account, just not on this device" gap applies anywhere a screen depends
 * on a session (e.g. a future Profile tab), so this isn't Orders-specific.
 */
export function LoginSheet({ open, onClose }: LoginSheetProps) {
  const router = useRouter();
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  const handleSendCode = async (phone: string): Promise<string | null> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        console.error("LoginSheet signInWithOtp error:", error);
        return COPY.bookingFlow.authentication.errorSendFailed;
      }
      setPendingPhone(phone);
      return null;
    } catch (err) {
      console.error("LoginSheet signInWithOtp threw:", err);
      return COPY.bookingFlow.authentication.errorSendFailed;
    }
  };

  const handleVerifyCode = async (code: string): Promise<string | null> => {
    if (!pendingPhone) {
      return COPY.bookingFlow.authentication.errorSendFailed;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: code,
        type: "sms",
      });

      if (error) {
        console.error("LoginSheet verifyOtp error:", error);
        return error.message?.toLowerCase().includes("expired")
          ? COPY.bookingFlow.authentication.errorExpiredCode
          : COPY.bookingFlow.authentication.errorInvalidCode;
      }

      setPendingPhone(null);
      onClose();
      router.refresh();
      return null;
    } catch (err) {
      console.error("LoginSheet verifyOtp threw:", err);
      return COPY.bookingFlow.authentication.errorInvalidCode;
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <AuthenticationStep
        heading={COPY.login.heading}
        subheading={COPY.login.subheading}
        onSendCode={handleSendCode}
        onVerifyCode={handleVerifyCode}
      />
    </BottomSheet>
  );
}
