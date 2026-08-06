type ClassValue = string | number | null | undefined | false;

/** Minimal classnames combinator (no extra dependency needed for this project's scope). */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
