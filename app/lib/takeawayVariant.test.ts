import { describe, expect, it } from "vitest";
import { partitionVoidable, resolveVariantId } from "./takeawayVariant";

const menu = [
  { id: "m1", variants: [{ id: "v1", label: "Large" }, { id: "v2", label: " Half " }] },
  { id: "m2", variants: [] },
];

describe("resolveVariantId", () => {
  it("returns null variant when the line has no variant label", () => {
    expect(resolveVariantId(menu, { menu_item_id: "m2", menu_item_name: "Tea", quantity: 1 })).toEqual({ ok: true, variantId: null });
  });
  it("matches label case-insensitively and trimmed", () => {
    expect(resolveVariantId(menu, { menu_item_id: "m1", menu_item_name: "Pizza", variant_label: "large ", quantity: 1 })).toEqual({ ok: true, variantId: "v1" });
    expect(resolveVariantId(menu, { menu_item_id: "m1", menu_item_name: "Pizza", variant_label: "HALF", quantity: 1 })).toEqual({ ok: true, variantId: "v2" });
  });
  it("refuses when the variant or item is gone", () => {
    expect(resolveVariantId(menu, { menu_item_id: "m1", menu_item_name: "Pizza", variant_label: "Small", quantity: 1 }).ok).toBe(false);
    expect(resolveVariantId(menu, { menu_item_id: "zz", menu_item_name: "X", variant_label: "Large", quantity: 1 }).ok).toBe(false);
    expect(resolveVariantId(menu, { menu_item_name: "X", quantity: 1 }).ok).toBe(false);
  });
});

describe("partitionVoidable", () => {
  it("splits resolvable from blocked lines", () => {
    const r = partitionVoidable(menu, [
      { menu_item_id: "m1", menu_item_name: "Pizza", variant_label: "Large", quantity: 1 },
      { menu_item_id: "m1", menu_item_name: "Pizza", variant_label: "Tiny", quantity: 1 },
    ]);
    expect(r.voidable).toHaveLength(1);
    expect(r.blocked[0].reason).toContain("Tiny");
  });
});
