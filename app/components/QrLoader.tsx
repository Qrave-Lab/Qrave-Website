/*
 * Qrave's loading mark: a small QR code that assembles itself.
 * The three corner squares stay solid in saffron; the data modules fill in
 * as a diagonal sweep and loop. With reduced motion everything is static.
 */

// F = corner square, x = data module, . = empty
const GRID = [
  "FFFx.xFFF",
  "F.F.xxF.F",
  "FFF.x.FFF",
  "xx.x.xx.x",
  ".x.xx.x.x",
  "x.xx.x.xx",
  "FFF.xx.xx",
  "F.Fx.xx.x",
  "FFF.xx.x.",
];

export default function QrLoader({ size = 72 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: "repeat(9, 1fr)",
        gridTemplateRows: "repeat(9, 1fr)",
        gap: Math.max(1, Math.round(size / 40)),
      }}
    >
      {GRID.flatMap((row, r) =>
        row.split("").map((ch, c) => {
          if (ch === ".") return <span key={`${r}-${c}`} />;
          if (ch === "F") {
            return <span key={`${r}-${c}`} className="rounded-[1.5px] bg-[#fe5c13]" />;
          }
          return (
            <span
              key={`${r}-${c}`}
              className="qr-cell rounded-[1.5px] bg-[#0F1117]"
              style={{ animationDelay: `${(r + c) * 90}ms` }}
            />
          );
        })
      )}
    </span>
  );
}
