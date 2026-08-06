"use client";

import { CategoryCard } from "@/components/shared/CategoryCard";
import { getCategoryIconSrc, sortCategoriesForDisplay } from "@/lib/categoryVisuals";
import type { Category } from "@/lib/types";

export interface CategorySectionProps {
  categories: Category[];
  onSelectCategory: (category: Category) => void;
}

/**
 * CategorySection - quick-access category shortcuts.
 * See /docs/home-screen-prd.md 3.5 and Flow 3 (-> opens bottom sheet).
 */
export function CategorySection({ categories, onSelectCategory }: CategorySectionProps) {
  if (categories.length === 0) return null;

  const orderedCategories = sortCategoriesForDisplay(categories);

  return (
    <div className="flex w-full flex-col gap-6">
      <h2 className="text-right text-lg font-semibold leading-[1.4] text-text-primary">
        הזמן איש מקצוע מהתחומים שלנו
      </h2>
      <div className="flex w-full items-start justify-between">
        {orderedCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            iconSrc={getCategoryIconSrc(category.name_en)}
            onClick={() => onSelectCategory(category)}
          />
        ))}
      </div>
    </div>
  );
}
