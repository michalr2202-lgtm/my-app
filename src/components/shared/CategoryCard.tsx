"use client";

import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

export interface CategoryCardProps {
  category: Category;
  iconSrc: string | null;
  onClick?: () => void;
}

/**
 * CategoryCard - one category shortcut in CategorySection.
 * See /docs/home-screen-prd.md 3.5 and Flow 3 (click -> bottom sheet).
 */
export function CategoryCard({ category, iconSrc, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-[72px] shrink-0 flex-col items-center gap-3",
        "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
      )}
    >
      {iconSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconSrc} alt="" className="size-[72px]" />
      ) : (
        <span className="size-[72px] rounded-full bg-surface-pill" aria-hidden />
      )}
          <span className="whitespace-nowrap text-center text-sm font-medium leading-[1.4] text-text-primary">
        {category.label_he}
      </span>
    </button>
  );
}
