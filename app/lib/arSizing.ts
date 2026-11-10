// Shared real-world sizing for 3D/AR dishes.
//
// Staff set how big a dish is "across" (its widest side seen from above,
// in cm). The customer menu and the staff editor both turn that into a
// model-viewer `scale`, so what staff see while editing is exactly what a
// customer gets on their table. AR is always opened with ar-scale="fixed",
// so customers can't pinch the dish bigger or smaller.

export type Dims = { x: number; y: number; z: number }; // metres

export type SizeCm = { width: number; height: number; depth: number };

export const MIN_SIZE_CM = 3;
export const MAX_SIZE_CM = 80;

export const SIZE_PRESETS: { label: string; cm: number }[] = [
  { label: "Shot glass", cm: 5 },
  { label: "Glass / cup", cm: 8 },
  { label: "Burger", cm: 12 },
  { label: "Bowl", cm: 15 },
  { label: "Side plate", cm: 18 },
  { label: "Dinner plate", cm: 27 },
  { label: "Pizza (12\")", cm: 30 },
  { label: "Platter", cm: 40 },
];

export const clampCm = (cm: number) =>
  Math.min(MAX_SIZE_CM, Math.max(MIN_SIZE_CM, Math.round(cm * 10) / 10));

/** Widest side seen from above, in cm. */
export const acrossCm = (d: Dims) => Math.max(d.x, d.z) * 100;

const currentUniformScale = (viewer: any): number => {
  const raw = String(viewer?.scale ?? "1 1 1").trim().split(/\s+/)[0];
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/**
 * Size of the model file itself, ignoring any scale already applied.
 * model-viewer's getDimensions() includes the current `scale`, so reading it
 * after scaling and scaling again would compound the error.
 */
export const readNaturalDims = (viewer: any): Dims | null => {
  if (!viewer?.getDimensions) return null;
  try {
    const d = viewer.getDimensions();
    if (!(d?.x > 0 && d?.y > 0 && d?.z > 0)) return null;
    const s = currentUniformScale(viewer);
    return { x: d.x / s, y: d.y / s, z: d.z / s };
  } catch {
    return null;
  }
};

/** Scale factor that makes the model `targetCm` across. */
export const ratioFor = (natural: Dims, targetCm: number) =>
  targetCm / acrossCm(natural);

export const sizedCm = (natural: Dims, ratio: number): SizeCm => ({
  width: Math.round(natural.x * 100 * ratio * 10) / 10,
  height: Math.round(natural.y * 100 * ratio * 10) / 10,
  depth: Math.round(natural.z * 100 * ratio * 10) / 10,
});

export const scaleString = (ratio: number) => `${ratio} ${ratio} ${ratio}`;

/**
 * Fallback when a size option (e.g. "Large") has no size of its own:
 * guess from its name. Staff see this guess in the editor and can override it.
 */
export const portionGuess = (label: string | undefined | null): number => {
  const name = String(label ?? "").toLowerCase();
  if (/\b(xl|jumbo|family)\b/.test(name)) return 1.35;
  if (/\b(large|big)\b/.test(name)) return 1.2;
  if (/\b(small|mini|kids?)\b/.test(name)) return 0.8;
  return 1;
};

export const formatCm = (cm: number) =>
  `${Number.isInteger(cm) ? cm : cm.toFixed(1)} cm`;
