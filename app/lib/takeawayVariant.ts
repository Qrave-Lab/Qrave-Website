export type VariantLike = { id: string; label?: string; name?: string };
export type MenuLike = { id: string; variants?: VariantLike[] | null };
export type TakeawayLine = {
  menu_item_id?: string;
  menu_item_name: string;
  variant_label?: string | null;
  quantity: number;
};

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();

export type VariantResolution =
  | { ok: true; variantId: string | null }
  | { ok: false; reason: string };

/** Finds the variant id for a takeaway line from the cached menu. Never guesses. */
export function resolveVariantId(menu: MenuLike[], line: TakeawayLine): VariantResolution {
  if (!line.menu_item_id) return { ok: false, reason: "item is no longer linked to the menu" };
  const label = norm(line.variant_label);
  if (!label) return { ok: true, variantId: null };
  const item = menu.find((m) => m.id === line.menu_item_id);
  const variant = item?.variants?.find((v) => norm(v.label ?? v.name) === label);
  if (!variant) return { ok: false, reason: `"${line.variant_label}" is no longer on the menu` };
  return { ok: true, variantId: variant.id };
}

export function partitionVoidable<T extends TakeawayLine>(menu: MenuLike[], lines: T[]) {
  const voidable: { item: T; variantId: string | null }[] = [];
  const blocked: { item: T; reason: string }[] = [];
  for (const item of lines) {
    const r = resolveVariantId(menu, item);
    if (r.ok) voidable.push({ item, variantId: r.variantId });
    else blocked.push({ item, reason: r.reason });
  }
  return { voidable, blocked };
}
