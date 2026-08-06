/**
 * TODO: Replace with real authentication/session lookup once the customer
 * auth flow (phone + OTP, per /docs/project-prd.md section 5) is
 * implemented. Until then there is no way to identify "the current
 * customer", so screens must gracefully render their empty state.
 */
export function getCurrentCustomerId(): string | null {
  return null;
}
