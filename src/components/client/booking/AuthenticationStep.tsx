"use client";

import { useEffect, useRef, useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { Input } from "@/components/ui/Input";
import { COPY } from "@/lib/copy";
import { formatIsraeliPhoneInput, normalizeIsraeliPhone } from "@/lib/phone";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export interface AuthenticationStepProps {
  /** Sends the OTP to this (not-yet-normalized, local-format) phone input; returns an error message to show inline, or null on success. */
  onSendCode: (phone: string) => Promise<string | null>;
  /**
   * Verifies the entered code; returns an error message to show inline, or
   * null on success. The orchestrator decides what happens after success -
   * either advancing away to `NewUserDetailsStep` (new phone), or passing
   * `recap` back down here (phone already has a profile).
   */
  onVerifyCode: (code: string) => Promise<string | null>;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
  /**
   * Override the booking-flow-specific heading/subheading (added
   * 2026-09-28 for `LoginSheet`'s standalone "log in to see your existing
   * orders on this device" use, which isn't part of placing an order -
   * `COPY.bookingFlow.authentication.subheading`'s wording ("...ובעל
   * המקצוע יוכל ליצור איתך קשר") doesn't fit there). Defaults to the
   * booking copy, so every existing caller is unaffected.
   */
  heading?: string;
  subheading?: string;
}

/**
 * Authentication step (Step 5 - client-booking-flow-prd.md). One screen, not
 * two: phone input, then the OTP field expands inline below it once a code
 * has been sent (same expand-in-place pattern as `AttachmentsStep`'s note
 * field) - never a navigation to a second screen/history entry, per that
 * PRD's documented exception to the Step Screen Reveal Rule. Auto-verifies
 * as soon as the 6th digit is entered; the footer button stays available as
 * a manual fallback (e.g. pasting the code).
 *
 * Always advances via `onVerifyCode`'s success - never terminal itself. An
 * earlier version re-rendered inline as a `"זיהינו אותך!"` + `OrderRecap` +
 * `"שלח הזמנה"` screen whenever the just-verified phone already had a
 * profile; that was moved out to a dedicated `ConfirmStep` (2026-08-21) for
 * consistency with the other two terminal populations - see its doc
 * comment.
 *
 * No Figma reference yet for this screen - built against existing
 * design-system primitives (`Input`, `BookingStepFooter`, the step heading/
 * subheading pattern) pending the real visual pass.
 */
export function AuthenticationStep({
  onSendCode,
  onVerifyCode,
  onPrevious,
  heading = COPY.bookingFlow.authentication.heading,
  subheading = COPY.bookingFlow.authentication.subheading,
}: AuthenticationStepProps) {
  const [phone, setPhone] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    const normalized = normalizeIsraeliPhone(phone);
    if (!normalized) {
      setError(COPY.bookingFlow.authentication.errorInvalidPhone);
      return;
    }
    setError(null);
    setSending(true);
    const sendError = await onSendCode(normalized);
    setSending(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    setCodeSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH || verifyingRef.current) return;
    verifyingRef.current = true;
    setError(null);
    setVerifying(true);
    const verifyError = await onVerifyCode(code);
    setVerifying(false);
    verifyingRef.current = false;
    if (verifyError) {
      setError(verifyError);
    }
    // On success there's nothing further to do here - the orchestrator
    // decides what renders next (see the `recap` prop doc above).
  };

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digitsOnly);
    if (digitsOnly.length === CODE_LENGTH) {
      void handleVerify();
    }
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">{heading}</p>
          <p className="w-full text-sm leading-[1.4]">{subheading}</p>
        </div>

        <Input
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          label={COPY.bookingFlow.authentication.phoneLabel}
          placeholder={COPY.bookingFlow.authentication.phonePlaceholder}
          // The example placeholder ("050-1234567") reads enough like a
          // real number that it's worth hiding the instant the field is
          // focused, not just once typing starts (native placeholder
          // behavior) - otherwise it looks like an already-filled value
          // that can't be edited/deleted. Same fade-on-focus mechanism
          // SearchBar already uses. `inputClassName`, not `className`:
          // this needs to land on the real `<input>` for the `focus:`/
          // `placeholder:` pseudo-classes to apply (see Input.tsx).
          inputClassName="placeholder:transition-opacity placeholder:duration-150 focus:placeholder:opacity-0"
          value={phone}
          // Stays editable even after a code's been sent (not `disabled`) -
          // a typo is only obvious once you're staring at the OTP field
          // waiting for an SMS that'll never arrive, so locking the field
          // right when you'd most want to fix it was the wrong call. It
          // also kept fading the already-typed number toward
          // `disabled:opacity-50` for no reason - typed content should
          // always stay full `text-text-primary`, disabled or not (see
          // design-system.md "Forms"). Editing here doesn't resend
          // anything by itself - "שלח קוד מחדש" below reads this same
          // `phone` value, so fixing a typo and tapping resend just works.
          onChange={(event) => setPhone(formatIsraeliPhoneInput(event.target.value))}
          error={!codeSent ? error ?? undefined : undefined}
        />

        {codeSent ? (
          <div className="flex w-full flex-col gap-2">
            <Input
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoFocus
              autoComplete="one-time-code"
              label={COPY.bookingFlow.authentication.codeLabel}
              placeholder={COPY.bookingFlow.authentication.codePlaceholder}
              // Unlike the phone field above, this placeholder conveys real
              // information ("הקוד שקיבלת ב-SMS") rather than just a format
              // example, so it stays fully legible.
              placeholderFullOpacity
              value={code}
              onChange={(event) => handleCodeChange(event.target.value)}
              error={error ?? undefined}
            />
            <button
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={() => void handleSendCode()}
              className="w-fit text-right text-xs leading-[1.4] text-brand-primary disabled:pointer-events-none disabled:text-text-secondary"
            >
              {cooldown > 0
                ? COPY.bookingFlow.authentication.resendCooldown.replace("{seconds}", String(cooldown))
                : COPY.bookingFlow.authentication.resendButton}
            </button>
          </div>
        ) : null}
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={
          codeSent
            ? COPY.bookingFlow.authentication.verifyButton
            : COPY.bookingFlow.authentication.sendCodeButton
        }
        onNext={() => void (codeSent ? handleVerify() : handleSendCode())}
        nextDisabled={
          codeSent ? code.length !== CODE_LENGTH || verifying : phone.trim().length === 0 || sending
        }
      />
    </div>
  );
}
