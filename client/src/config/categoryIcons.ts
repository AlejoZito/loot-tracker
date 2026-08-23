import {
  ShoppingCart,
  Car,
  Home,
  Heart,
  Palmtree,
  Package,
  type LucideIcon,
} from 'lucide-react';

/**
 * Optional Lucide-icon fallback for category ids, keyed by whatever `id` you use in your
 * sheet's `categories` tab. Categories are otherwise fully sheet-driven — this is just a
 * convenience map for a few common ones; anything not listed here falls back to the emoji
 * from your sheet (or the generic Package icon if you use this map directly).
 */
export const categoryIconMap: Record<string, LucideIcon> = {
  groceries: ShoppingCart,
  transport: Car,
  home: Home,
  health: Heart,
  leisure: Palmtree,
  other: Package,
};

export function getCategoryIcon(categoryId: string): LucideIcon {
  return categoryIconMap[categoryId] || Package;
}
