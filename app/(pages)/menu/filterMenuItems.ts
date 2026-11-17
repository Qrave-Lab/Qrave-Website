export type DietFilter = "all" | "veg" | "nonveg";
export type SpiceLevel = "none" | "mild" | "medium" | "hot";
export type MaxSpice = "any" | SpiceLevel;

export type MenuFilterState = {
  diet: DietFilter;
  excludeAllergens: string[];
  maxSpice: MaxSpice;
};

export const DEFAULT_MENU_FILTERS: MenuFilterState = {
  diet: "all",
  excludeAllergens: [],
  maxSpice: "any",
};

export type AllergenInfo = { type: string; confidence: string };

export type FilterableItem = {
  isVeg?: boolean;
  spiceLevel?: string;
  allergenInfo?: AllergenInfo[];
  allergens?: string[];
};

const SPICE_ORDER: SpiceLevel[] = ["none", "mild", "medium", "hot"];

export const normaliseAllergen = (name: string) => name.trim().toLowerCase();

export function spiceRank(level: unknown): number {
  const idx = SPICE_ORDER.indexOf(String(level ?? "none").toLowerCase() as SpiceLevel);
  return idx < 0 ? 0 : idx;
}

/** Allergen names (lower-cased) for an item, regardless of confidence. */
export function itemAllergenNames(item: FilterableItem): string[] {
  const source = item.allergenInfo?.length
    ? item.allergenInfo.map((a) => a.type)
    : item.allergens ?? [];
  return source.map(normaliseAllergen).filter(Boolean);
}

/** Distinct allergens present on the menu, sorted, with display-cased name. */
export function collectAllergens(items: FilterableItem[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const raw = item.allergenInfo?.length
      ? item.allergenInfo.map((a) => a.type)
      : item.allergens ?? [];
    for (const name of raw) {
      const key = normaliseAllergen(name);
      if (key && !seen.has(key)) seen.set(key, name.trim());
    }
  }
  return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

export function countActiveFilters(f: MenuFilterState): number {
  return (
    (f.diet !== "all" ? 1 : 0) +
    f.excludeAllergens.length +
    (f.maxSpice !== "any" ? 1 : 0)
  );
}

/**
 * Pure filter. Excluding an allergen hides items that contain it, may contain
 * it, or carry a trace of it (any confidence), erring on the side of safety.
 */
export function filterMenuItems<T extends FilterableItem>(
  items: T[],
  f: MenuFilterState,
): T[] {
  const excluded = new Set(f.excludeAllergens.map(normaliseAllergen));
  const maxRank = f.maxSpice === "any" ? Infinity : spiceRank(f.maxSpice);
  return items.filter((item) => {
    if (f.diet === "veg" && !item.isVeg) return false;
    if (f.diet === "nonveg" && item.isVeg) return false;
    if (spiceRank(item.spiceLevel) > maxRank) return false;
    if (excluded.size > 0) {
      for (const name of itemAllergenNames(item)) {
        if (excluded.has(name)) return false;
      }
    }
    return true;
  });
}

export function parseStoredFilters(raw: string | null): MenuFilterState {
  if (!raw) return DEFAULT_MENU_FILTERS;
  try {
    const p = JSON.parse(raw);
    const diet: DietFilter = ["all", "veg", "nonveg"].includes(p?.diet) ? p.diet : "all";
    const maxSpice: MaxSpice = ["any", ...SPICE_ORDER].includes(p?.maxSpice) ? p.maxSpice : "any";
    const excludeAllergens: string[] = Array.isArray(p?.excludeAllergens)
      ? p.excludeAllergens.filter((x: unknown) => typeof x === "string")
      : [];
    return { diet, maxSpice, excludeAllergens };
  } catch {
    return DEFAULT_MENU_FILTERS;
  }
}
