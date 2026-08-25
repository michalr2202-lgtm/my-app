import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Classnames combinator: `clsx` for conditional joining, `twMerge` to
 * resolve conflicting Tailwind utilities (e.g. a component's own base
 * `w-full` vs. a caller-supplied `w-[72px]`) by property, not by string
 * order - plain concatenation left the winner dependent on Tailwind's
 * internal generation order in the compiled stylesheet, not the order
 * classes were passed to `cn`, which was the root cause of a real bug
 * (`NewUserDetailsStep`'s street/building-number row breaking - see
 * design-system.md "Forms").
 */
export function cn(...values: ClassValue[]): string {
  return twMerge(clsx(...values));
}
