import { ImageResponse } from "next/og";
import { SITE_NAME } from "./_lib/seo";

export const alt = "Qrave: restaurant OS with QR ordering, 3D AR menus and cloud POS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0F1117",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800 }}>
          <span style={{ color: "#fe5c13" }}>Q</span>
          <span>{SITE_NAME.slice(1)}</span>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, marginTop: 24, lineHeight: 1.2 }}>
          QR ordering, 3D AR menus &amp; cloud POS for restaurants
        </div>
        <div style={{ fontSize: 28, color: "#9ca3af", marginTop: 32 }}>
          Orders · Kitchen · Billing · Inventory · Analytics
        </div>
      </div>
    ),
    size,
  );
}
