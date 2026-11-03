import { ImageResponse } from "next/og";

// Installable-app icons. "maskable-512" keeps the glyph inside the safe zone.
const SIZES: Record<string, { px: number; maskable: boolean }> = {
  "192": { px: 192, maskable: false },
  "512": { px: 512, maskable: false },
  "maskable-512": { px: 512, maskable: true },
};

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const spec = SIZES[size];
  if (!spec) return new Response("Not found", { status: 404 });

  const glyph = Math.round(spec.px * (spec.maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1117",
          borderRadius: spec.maskable ? 0 : Math.round(spec.px * 0.22),
          color: "#fe5c13",
          fontSize: glyph,
          fontWeight: 800,
        }}
      >
        Q
      </div>
    ),
    { width: spec.px, height: spec.px, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
