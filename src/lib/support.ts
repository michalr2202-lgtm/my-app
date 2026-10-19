/**
 * Customer-service contact value, dialed directly (`tel:`) from
 * `JobDetailsScreen`'s "נתקלת בבעיה?" flow - see
 * `docs/cancellation-and-rescheduling.md`'s "Customer-Side Cancellation
 * UI" section for both states that use this (the "ליצור קשר עם שירות
 * הלקוחות" Pill inside the two-option Bottom Sheet, and the "חייג
 * לשירות לקוחות" Pill that replaces the whole Sheet once inside the
 * 2-hour cutoff).
 *
 * TEMPORARY PLACEHOLDER (added 2026-10-01): this is a real personal phone
 * number, used only until a real forwarding number (an Israeli "1-700"-
 * style business line, set up through a telecom/VoIP provider so it
 * rings through to the real number without exposing it) exists - swap
 * this one constant for that number once it's ready. Nothing else in
 * either call site needs to change - both already read this constant
 * rather than a hardcoded literal.
 */
export const SUPPORT_PHONE_NUMBER = "0506002005";
