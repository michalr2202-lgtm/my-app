import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Whether the card is interactive (adds press feedback). */
  interactive?: boolean;
}

/**
 * Card - reusable rounded surface primitive.
 *
 * Base for ActiveJobCard (see /docs/architecture/frontend-architecture.md
 * componentsui examples). Radius/shadow follow the Figma "shadow/card"
 * and 24px corner radius tokens.
 */
export function Card({ children, interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-card shadow-card",
        interactive &&
          "cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:brightness-95",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
