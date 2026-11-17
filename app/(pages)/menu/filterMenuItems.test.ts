import { describe, expect, it } from "vitest";
import {
  DEFAULT_MENU_FILTERS,
  collectAllergens,
  countActiveFilters,
  filterMenuItems,
  parseStoredFilters,
} from "./filterMenuItems";

const items = [
  { id: 1, isVeg: true, spiceLevel: "none", allergenInfo: [{ type: "Dairy", confidence: "contains" }] },
  { id: 2, isVeg: false, spiceLevel: "hot", allergenInfo: [{ type: "Nuts", confidence: "may_contain" }] },
  { id: 3, isVeg: true, spiceLevel: "mild", allergenInfo: [] },
  { id: 4, isVeg: false, spiceLevel: "medium", allergenInfo: [{ type: "nuts", confidence: "trace" }, { type: "Egg", confidence: "contains" }] },
];
const ids = (xs: { id: number }[]) => xs.map((x) => x.id);

describe("filterMenuItems", () => {
  it("returns everything by default", () => {
    expect(ids(filterMenuItems(items, DEFAULT_MENU_FILTERS))).toEqual([1, 2, 3, 4]);
  });
  it("filters by diet", () => {
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, diet: "veg" }))).toEqual([1, 3]);
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, diet: "nonveg" }))).toEqual([2, 4]);
  });
  it("excludes allergens of any confidence, case-insensitively", () => {
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, excludeAllergens: ["NUTS"] }))).toEqual([1, 3]);
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, excludeAllergens: ["Nuts", "Dairy"] }))).toEqual([3]);
  });
  it("caps spice level", () => {
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, maxSpice: "mild" }))).toEqual([1, 3]);
    expect(ids(filterMenuItems(items, { ...DEFAULT_MENU_FILTERS, maxSpice: "none" }))).toEqual([1]);
  });
  it("combines filters", () => {
    expect(ids(filterMenuItems(items, { diet: "nonveg", excludeAllergens: ["egg"], maxSpice: "hot" }))).toEqual([2]);
  });
});

describe("helpers", () => {
  it("collects distinct allergens", () => {
    expect(collectAllergens(items)).toEqual(["Dairy", "Egg", "Nuts"]);
  });
  it("counts active filters", () => {
    expect(countActiveFilters(DEFAULT_MENU_FILTERS)).toBe(0);
    expect(countActiveFilters({ diet: "veg", excludeAllergens: ["a", "b"], maxSpice: "mild" })).toBe(4);
  });
  it("parses stored state defensively", () => {
    expect(parseStoredFilters("not json")).toEqual(DEFAULT_MENU_FILTERS);
    expect(parseStoredFilters(JSON.stringify({ diet: "x", maxSpice: "hot", excludeAllergens: ["a", 3] }))).toEqual({
      diet: "all", maxSpice: "hot", excludeAllergens: ["a"],
    });
  });
});
