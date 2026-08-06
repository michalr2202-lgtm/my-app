import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  size?: number;
  "aria-label": string;
}

/**
 * IconButton - minimal stub primitive.
 *
 * No screen has needed a standalone icon-only button yet (SearchBar's
 * search icon and BottomNavigation's icons are bespoke to those
 * components). Flesh out real variants/sizes once a screen requires a
 * generic one - see /docs/architecture/component-library.md "Not yet built".
 */
export function IconButton({ icon: Icon, size = 24, className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-full p-2 text-text-primary",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <Icon size={size} strokeWidth={1.75} />
    </button>
  );
}
