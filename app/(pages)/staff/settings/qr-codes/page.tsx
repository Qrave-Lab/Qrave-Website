"use client";

import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import { getRootDomain, slugifyRestaurantName } from "@/app/lib/tenant";
import {
  Check,
  Download,
  Image as ImageIcon,
  Printer,
  RefreshCw,
  Smartphone,
  Upload,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type Table = {
  id: string;
  table_number: number;
  is_enabled: boolean;
  zone?: string | null;
  floor_name?: string | null;
  counter_name?: string | null;
  qr_token?: string;
};

const getTableLabel = (table: Table) =>
  table.id === "waitlist" ? "Waitlist" : table.table_number.toString().padStart(2, "0");

const groupByFloor = (
  tables: Table[],
): { floor: string; tables: Table[] }[] => {
  const map = new Map<string, Table[]>();
  for (const t of tables) {
    const key = t.floor_name?.trim() || "Main Floor";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries()).map(([floor, tables]) => ({
    floor,
    tables,
  }));
};

const templates = [
  {
    id: "modern",
    name: "Clean Minimal",
    class: "bg-white text-gray-900 border border-slate-100",
  },
  { id: "dark", name: "Midnight Luxury", class: "bg-gray-950 text-white" },
  {
    id: "framed",
    name: "Bold Frame",
    class: "bg-white text-gray-900 border-8",
  },
  {
    id: "gold",
    name: "Imperial Gold",
    class: "bg-black text-[#F3E5AB] border-4 border-[#D4AF37]",
  },
  {
    id: "eco",
    name: "Organic Green",
    class: "bg-[#FAF9F6] text-emerald-955 border-4 border-emerald-900",
  },
  {
    id: "sunset",
    name: "Sunset Gradient",
    class: "bg-gradient-to-br from-[#fe5c13] via-[#ff7a3d] to-[#ffb36b] text-white",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    class: "bg-gradient-to-br from-[#0f3d6b] via-[#1d6fa5] to-[#4cc3d9] text-white",
  },
  {
    id: "neon",
    name: "Neon Night",
    class: "bg-[#0b0618] text-fuchsia-100 border-4 border-fuchsia-500",
  },
  {
    id: "blush",
    name: "Soft Blush",
    class: "bg-gradient-to-br from-rose-50 to-orange-50 text-rose-950 border border-rose-100",
  },
  {
    id: "chalk",
    name: "Chalkboard",
    class: "bg-[#1f2a24] text-[#f1efe4] border-8 border-[#8b6b3e]",
  },
  {
    id: "kraft",
    name: "Kraft Paper",
    class: "bg-[#d8bf98] text-[#3a2a14] border-4 border-dashed border-[#3a2a14]/40",
  },
];

// Templates whose background is dark enough that body text must be light.
const DARK_TEMPLATES = new Set(["dark", "gold", "sunset", "ocean", "neon", "chalk"]);

// Face backgrounds for the pyramid net (clip-path faces can't use border classes).
const FACE_BG: Record<string, { bg: string; fg: string }> = {
  modern: { bg: "#ffffff", fg: "#111827" },
  dark: { bg: "#030712", fg: "#ffffff" },
  framed: { bg: "#ffffff", fg: "#111827" },
  gold: { bg: "#000000", fg: "#F3E5AB" },
  eco: { bg: "#FAF9F6", fg: "#064e3b" },
  sunset: { bg: "linear-gradient(160deg,#fe5c13,#ffb36b)", fg: "#ffffff" },
  ocean: { bg: "linear-gradient(160deg,#0f3d6b,#4cc3d9)", fg: "#ffffff" },
  neon: { bg: "#0b0618", fg: "#fae8ff" },
  blush: { bg: "linear-gradient(160deg,#fff1f2,#ffedd5)", fg: "#4c0519" },
  chalk: { bg: "#1f2a24", fg: "#f1efe4" },
  kraft: { bg: "#d8bf98", fg: "#3a2a14" },
};

const MM = 3.7795;
const WAITLIST_HEADLINES = [
  "Join the Waitlist",
  "Skip the Line",
  "Wait Less, Eat More",
  "Hungry? Join the Queue",
];
const WAITLIST_STEPS = ["Scan", "Enter your details", "Get an SMS when ready"];

const fonts = [
  { id: "sans", name: "Modern Sans", class: "font-sans" },
  { id: "serif", name: "Elegant Serif", class: "font-serif" },
  { id: "mono", name: "Industrial Mono", class: "font-mono" },
];

const brandColors = [
  "#000000",
  "#10B981",
  "#6366F1",
  "#F43F5E",
  "#F59E0B",
  "#D4AF37",
  "#1E3A8A",
];

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="border-b border-[#F0F0EB] px-5 py-5 last:border-b-0">
    <div className="mb-3.5">
      <h2 className="text-[14px] font-semibold text-[#0F1117]">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] text-[#6B7280]">{hint}</p>}
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

export default function QrFlyerGenerator() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<string | null>("layout");
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [restaurantName, setRestaurantName] = useState<string>("Restaurant");
  const [restaurantSlug, setRestaurantSlug] = useState<string>("");
  const [restaurantLogoUrl, setRestaurantLogoUrl] =
    useState<string>("");
  const [activeFloor, setActiveFloor] = useState<string>("");

  const getTableUrl = (table: Table | null) => {
    if (!table) return "";
    const slug = restaurantSlug || slugifyRestaurantName(restaurantName);
    const rootDomain = getRootDomain();
    if (table.id === "waitlist") return `https://${slug}.${rootDomain}/waitlist/${slug}`;
    if (!table.qr_token) return "";
    return `https://${slug}.${rootDomain}/menu/qr/${table.qr_token}`;
  };

  // Enhanced custom parameters
  const [printMode, setPrintMode] = useState<"single" | "bulk">("single");
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(
    new Set(),
  );
  const [tentStyle, setTentStyle] = useState<"flat" | "standing" | "pyramid">("flat");
  const [pyramidSides, setPyramidSides] = useState<3 | 4>(3);
  const [pyramidBase, setPyramidBase] = useState(90);
  const [pyramidTall, setPyramidTall] = useState(false);
  const [pyramidMode, setPyramidMode] = useState<"all" | "alternate" | "one">("all");
  const [showGuides, setShowGuides] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const [showArBadge, setShowArBadge] = useState(true);
  const [promoText, setPromoText] = useState("");

  const [template, setTemplate] = useState("modern");
  const [activeFont, setActiveFont] = useState("sans");
  const [brandColor, setBrandColor] = useState("#000000");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [headline, setHeadline] = useState("Scan to Order");
  const [subheadline, setSubheadline] = useState(
    "View menu, order & pay from your phone.",
  );
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");

  const [rotating, setRotating] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const handleRotateToken = async () => {
    if (!selectedTable) return;
    try {
      setRotating(true);
      const res = await api<{ token: string }>(
        `/api/admin/tables/${selectedTable.id}/qr-token`,
        { method: "POST" },
      );
      const updatedToken = res.token;

      setSelectedTable((prev) =>
        prev ? { ...prev, qr_token: updatedToken } : null,
      );
      setTables((prev) =>
        prev.map((t) =>
          t.id === selectedTable.id ? { ...t, qr_token: updatedToken } : t,
        ),
      );
      toast.success("New QR code ready. Print it to replace the old card.");
    } catch (e) {
      console.error("Failed to regenerate QR token", e);
      toast.error("Couldn't make a new QR code. Try again.");
    } finally {
      setRotating(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [tablesRes, me] = await Promise.all([
        api<Table[]>("/api/admin/tables", { method: "GET" }),
        api<{
          restaurant_id?: string;
          restaurantId?: string;
          restaurant?: string;
          store_slug?: string;
          logo_url?: string | null;
          logo_version?: number | null;
        }>("/api/admin/me", { method: "GET" }),
      ]);
      const next = Array.isArray(tablesRes)
        ? tablesRes.filter((t) => t.is_enabled)
        : [];

      // Auto-generate missing qr tokens
      const updated = await Promise.all(
        next.map(async (t) => {
          if (!t.qr_token) {
            try {
              const res = await api<{ token: string }>(
                `/api/admin/tables/${t.id}/qr-token`,
                { method: "POST" },
              );
              return { ...t, qr_token: res.token };
            } catch (e) {
              console.warn(
                "Failed to auto-generate token for table",
                t.table_number,
                e,
              );
            }
          }
          return t;
        }),
      );

      const waitlistTable = {
        id: "waitlist",
        table_number: 0,
        is_enabled: true,
        floor_name: "Reception",
      };
      const finalTables = [waitlistTable, ...updated];
      setTables(finalTables);
      const wantsWaitlist =
        new URLSearchParams(window.location.search).get("table") === "waitlist";
      if (wantsWaitlist) {
        setSelectedTable(waitlistTable);
        setActiveFloor("Reception");
        setHeadline("Join the Waitlist");
        setSubheadline("Secure your spot in line directly from your phone.");
        setSelectedTableIds(new Set(updated.map((t) => t.id)));
        setRestaurantId(me?.restaurant_id || me?.restaurantId || "");
        setRestaurantName(me?.restaurant?.trim() || "Restaurant");
        if (me?.store_slug) setRestaurantSlug(me.store_slug.trim());
        const sfx = me?.logo_version ? `?v=${me.logo_version}` : "";
        setRestaurantLogoUrl(me?.logo_url ? `${me.logo_url}${sfx}` : "");
        return;
      }
      if (finalTables.length > 0) {
        const firstFloor = updated[0].floor_name?.trim() || "Main Floor";
        setActiveFloor(firstFloor);
        setSelectedTable(updated[0]);
        // Default to all selected for bulk print
        setSelectedTableIds(new Set(updated.map((t) => t.id)));
      }
      setRestaurantId(me?.restaurant_id || me?.restaurantId || "");
      setRestaurantName(me?.restaurant?.trim() || "Restaurant");
      if (me?.store_slug) {
        setRestaurantSlug(me.store_slug.trim());
      }
      const suffix = me?.logo_version ? `?v=${me.logo_version}` : "";
      setRestaurantLogoUrl(me?.logo_url ? `${me.logo_url}${suffix}` : "");
    })();
  }, []);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!flyerRef.current || !selectedTable) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const url = await toPng(flyerRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#ffffff",
        style: { transform: "none" },
      });
      const a = document.createElement("a");
      a.href = url;
      const base =
        selectedTable.id === "waitlist"
          ? "waitlist-qr"
          : `table-${getTableLabel(selectedTable)}-qr`;
      a.download = `${base}${tentStyle === "pyramid" ? "-pyramid" : ""}.png`;
      a.click();
    } catch (e) {
      console.error("QR download failed", e);
      toast.error("Download failed — use Print Setup → Save as PDF instead.");
    } finally {
      setDownloading(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleSection = (section: string) =>
    setActiveSection(activeSection === section ? null : section);

  const toggleTableSelection = (id: string) => {
    const next = new Set(selectedTableIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTableIds(next);
  };

  const selectAllTables = () => {
    setSelectedTableIds(new Set(tables.map((t) => t.id)));
  };

  const deselectAllTables = () => {
    setSelectedTableIds(new Set());
  };

  const selectFloorTables = (floor: string) => {
    const next = new Set(selectedTableIds);
    tables.forEach((t) => {
      const f = t.floor_name?.trim() || "Main Floor";
      if (f === floor) next.add(t.id);
    });
    setSelectedTableIds(next);
  };

  const floorGroups = groupByFloor(tables);

  if (!selectedTable) {
    return (
      <SettingsPageLayout title="Table QR codes" description="Design and print the QR cards guests scan at their table" maxWidth="max-w-[1400px]">
        <div className="grid animate-pulse grid-cols-1 gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <div className="h-[640px] rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-[760px] rounded-2xl border border-[#E8E8E3] bg-white" />
        </div>
      </SettingsPageLayout>
    );
  }

  // Component to render individual flyer panel details
  const FlyerPanelContent = ({
    table,
    isHalf,
  }: {
    table: Table;
    isHalf: boolean;
  }) => {
    const logoSrc = logoImage || restaurantLogoUrl;
    const qrUrl = getTableUrl(table);
    const isDark = DARK_TEMPLATES.has(template);

    // Standard high-fidelity center logo setting
    const imageSettings = logoSrc
      ? {
          src: logoSrc,
          x: undefined,
          y: undefined,
          height: isHalf ? 24 : 44,
          width: isHalf ? 24 : 44,
          excavate: true,
        }
      : undefined;

    return (
      <div
        className={`relative flex flex-col items-center h-full w-full justify-between ${isHalf ? "p-4" : "py-10 px-8"}`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center justify-center ${isHalf ? "h-8 mb-2" : "h-14 mb-4"}`}
        >
          {logoSrc ? (
            <img src={logoSrc} className="h-full object-contain" alt="Logo" />
          ) : (
            <h1
              className={`${isHalf ? "text-base" : "text-2xl"} font-bold tracking-widest uppercase`}
              style={{ color: template === "gold" ? "#D4AF37" : "inherit" }}
            >
              {restaurantName}
            </h1>
          )}
        </div>

        {/* QR Code Container */}
        <div
          className={`rounded-3xl shadow-xl flex flex-col items-center transition-all duration-300 ${isHalf ? "p-3 mb-2" : "p-6 mb-6"} ${
            "bg-white border border-slate-100 text-slate-900"
          }`}
          style={{
            boxShadow:
              template === "modern" ? `0 20px 40px -10px ${brandColor}30` : "",
            borderColor: template === "framed" ? brandColor : undefined,
          }}
        >
          <QRCodeSVG
            value={qrUrl}
            size={table.id === "waitlist" ? (isHalf ? 140 : 260) : (isHalf ? 110 : 210)}
            level="H"
            fgColor="#000000"
            bgColor="#ffffff"
            imageSettings={imageSettings}
          />
          <div
            className={`py-1 px-4 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${isHalf ? "text-[8px] mt-2.5" : "text-[10px] mt-4"}`}
            style={{ backgroundColor: brandColor, color: "#fff" }}
          >
            <Smartphone className="w-2.5 h-2.5" />
            {table.id === "waitlist" ? "Scan to Join" : "Scan to Order"}
          </div>
        </div>

        {/* Headline & Subhead */}
        <div className={`max-w-[90%] space-y-1.5 ${isHalf ? "mb-1" : "mb-4"}`}>
          {table.id !== "waitlist" && showArBadge && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isHalf ? "text-[7px]" : "text-[9px] mb-1.5"} ${
                isDark
                  ? "bg-[#fe5c13]/15 text-[#fe5c13] border border-[#fe5c13]/20"
                  : "bg-[#fe5c13]/10 text-amber-800 border border-[#fe5c13]/20"
              }`}
            >
              <span>✨ Tabletop 3D AR Enabled</span>
            </div>
          )}
          
          {table.id === "waitlist" && showArBadge && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${isHalf ? "text-[7px]" : "text-[9px] mb-1.5"} ${
                isDark
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "bg-blue-500/10 text-blue-800 border border-blue-500/20"
              }`}
            >
              <span>Skip the Line</span>
            </div>
          )}

          <h2
            className={`${isHalf ? "text-sm" : "text-xl"} font-bold leading-tight`}
            style={{ color: isDark ? "#ffffff" : "#000000" }}
          >
            {table.id === "waitlist" && headline === "Scan to Order" ? "Join the Waitlist" : headline}
          </h2>
          <p
            className={`${isHalf ? "text-[8px]" : "text-xs"} opacity-70 leading-snug font-medium`}
          >
            {table.id === "waitlist" && subheadline === "View menu, order & pay from your phone." ? "Scan the QR code to secure your spot in line. We'll text you when your table is ready!" : subheadline}
          </p>
          {table.id === "waitlist" && showSteps && (
            <ol
              className={`flex items-center justify-center gap-1.5 ${isHalf ? "pt-1" : "pt-2"}`}
            >
              {WAITLIST_STEPS.map((step, i) => (
                <li
                  key={step}
                  className={`flex items-center gap-1 rounded-full border border-current/20 font-bold ${isHalf ? "px-1.5 py-0.5 text-[6px]" : "px-2.5 py-1 text-[9px]"}`}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-white font-bold"
                    style={{
                      backgroundColor: brandColor,
                      width: isHalf ? 8 : 14,
                      height: isHalf ? 8 : 14,
                    }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Wi-Fi Details */}
        {wifiSsid && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${isHalf ? "text-[8px] py-0.5" : "text-xs"} ${
              isDark
                ? "border-slate-800 bg-slate-900/60 text-slate-200"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <Wifi
              className={
                isHalf ? "w-3 h-3 text-slate-400" : "w-3.5 h-3.5 text-slate-400"
              }
            />
            <span className="font-bold">{wifiSsid}</span>
            {wifiPass && <span className="opacity-50">| {wifiPass}</span>}
          </div>
        )}

        {/* Footer Table details */}
        {table.id !== "waitlist" && (
        <div className="w-full pt-3 mt-auto border-t border-current border-opacity-10 flex justify-between items-end opacity-80">
          {table.id === "waitlist" ? null : (
            <>
              <div className="text-left">
                <div className="text-[11px] opacity-60">
                  Table
                </div>
                <div
                  className={`${isHalf ? "text-lg" : "text-3xl"} font-bold leading-none mt-0.5`}
                >
                  {getTableLabel(table)}
                </div>
              </div>
              <div className="text-right">
                {table.floor_name && (
                  <>
                    <div className="text-[11px] opacity-60">
                      Floor
                    </div>
                    <div
                      className={`${isHalf ? "text-[10px]" : "text-xs"} font-bold leading-none mt-1`}
                    >
                      {table.floor_name}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        )}

        {/* Custom Promo Banner */}
        {promoText && (
          <div className="absolute top-0 inset-x-0 overflow-hidden">
            <div className="bg-emerald-500 text-white text-[7px] font-bold uppercase tracking-widest text-center py-0.5 shadow-sm">
              {promoText}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Component to render standing folding table tent cards
  const StandingTentFlyer = ({ table }: { table: Table }) => {
    return (
      <div className="w-full h-full flex flex-col justify-between p-4 relative bg-transparent">
        {/* Top Panel (Back side) - Upside down */}
        <div className="h-[46%] w-full flex flex-col items-center justify-center border border-dashed border-slate-200/20 rounded-2xl relative rotate-180 transform overflow-hidden">
          <FlyerPanelContent table={table} isHalf={true} />
        </div>

        {/* Fold Line Guide */}
        <div className="relative w-full flex items-center justify-center my-1.5 select-none">
          <div className="absolute inset-x-0 h-px border-t border-dashed border-slate-300" />
          <span className="relative px-3 py-0.5 rounded-full bg-slate-100 text-[7px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">
            Fold Line
          </span>
        </div>

        {/* Bottom Panel (Front side) - Right side up */}
        <div className="h-[46%] w-full flex flex-col items-center justify-center border border-dashed border-slate-200/20 rounded-2xl relative overflow-hidden">
          <FlyerPanelContent table={table} isHalf={true} />
        </div>
      </div>
    );
  };

  // Net for a pyramid table stand: faces fan out from the apex, cut, fold, glue.
  const PyramidNet = ({ table }: { table: Table }) => {
    const b = pyramidBase;
    const h = pyramidTall ? b * 1.35 : (b * Math.sqrt(3)) / 2;
    const half = Math.atan(b / 2 / h);
    const apexDeg = (2 * half * 180) / Math.PI;
    const n = pyramidSides;
    const L = Math.hypot(h, b / 2);
    const isWaitlist = table.id === "waitlist";
    const colors = FACE_BG[template] || FACE_BG.modern;
    const logoSrc = logoImage || restaurantLogoUrl;
    const qrUrl = getTableUrl(table);

    // bounding box of the fan (mm, relative to the apex) so we can centre it
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    for (let i = 0; i < n; i++) {
      const centre = (i - (n - 1) / 2) * 2 * half;
      for (const phi of [centre - half, centre + half]) {
        const x = L * Math.sin(phi);
        const y = L * Math.cos(phi);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    const tab = 12;
    minX -= tab; maxX += tab;
    const PAGE_W = 297, PAGE_H = 210, HEADER = 14;
    const cx = PAGE_W / 2 - (minX + maxX) / 2;
    const cy = HEADER + (PAGE_H - HEADER - (maxY - minY)) / 2 - minY;

    const label = isWaitlist ? "Scan to Join" : "Scan to Order";
    const tableLabel = isWaitlist ? "Waitlist" : `Table ${getTableLabel(table)}`;

    const renderFace = (i: number) => {
      const centre = (i - (n - 1) / 2) * apexDeg;
      const hasQr =
        pyramidMode === "all" || (pyramidMode === "alternate" && i % 2 === 0) || (pyramidMode === "one" && i === 0);
      const q = b * 0.28;
      const card = q + b * 0.04;
      const yQr = h * 0.4;
      const fs = (k: number) => `${b * k}mm`;
      // Faces are rotated clockwise for i > 0, so face 0 ends up on the right of the
      // fan and its local right edge is the free outer edge: that's where the tab goes.
      const hasTab = i === 0;
      // glue tab on that edge (local mm coords)
      const ex = (b / 2) / L, ey = h / L;
      const nx = ey, ny = -ex;
      const A = [b / 2, 0], B = [b, h];
      const T = [
        [A[0] + ex * 8, A[1] + ey * 8],
        [A[0] + ex * 8 + nx * tab, A[1] + ey * 8 + ny * tab],
        [B[0] - ex * 8 + nx * tab, B[1] - ey * 8 + ny * tab],
        [B[0] - ex * 8, B[1] - ey * 8],
      ];
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${cx - b / 2}mm`,
            top: `${cy}mm`,
            width: `${b}mm`,
            height: `${h}mm`,
            transformOrigin: "50% 0",
            transform: `rotate(${centre}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
              background: hasQr ? colors.bg : brandColor,
              color: hasQr ? colors.fg : "#fff",
              textAlign: "center",
            }}
          >
            {bgImage && hasQr && (
              <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 1 - overlayOpacity / 100 }} />
            )}
            <div style={{ position: "absolute", top: `${h * 0.16}mm`, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
              {logoSrc ? (
                <img src={logoSrc} alt="" style={{ height: fs(0.1), maxWidth: fs(0.3), objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: fs(0.055), fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", maxWidth: fs(0.3), lineHeight: 1.1 }}>
                  {restaurantName}
                </span>
              )}
            </div>
            {hasQr ? (
              <>
                <div style={{ position: "absolute", top: `${yQr}mm`, left: "50%", transform: "translateX(-50%)", width: `${card}mm`, height: `${card}mm`, background: "#fff", borderRadius: `${b * 0.025}mm`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QRCodeSVG
                    value={qrUrl}
                    size={Math.round(q * MM)}
                    level="H"
                    fgColor="#000000"
                    bgColor="#ffffff"
                    imageSettings={logoSrc ? { src: logoSrc, height: Math.round(q * MM * 0.2), width: Math.round(q * MM * 0.2), excavate: true } : undefined}
                  />
                </div>
                <div style={{ position: "absolute", top: `${yQr + card + b * 0.025}mm`, left: "50%", transform: "translateX(-50%)", background: brandColor, color: "#fff", borderRadius: "999px", padding: `${b * 0.008}mm ${b * 0.03}mm`, fontSize: fs(0.036), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                  {label}
                </div>
                <div style={{ position: "absolute", top: `${yQr + card + b * 0.025 + b * 0.075}mm`, left: 0, right: 0, fontSize: fs(isWaitlist ? 0.05 : 0.06), fontWeight: 900, lineHeight: 1 }}>
                  {tableLabel}
                </div>
              </>
            ) : (
              <div style={{ position: "absolute", top: `${h * 0.42}mm`, left: "50%", transform: "translateX(-50%)", width: `${b * 0.46}mm` }}>
                <p style={{ fontSize: fs(0.075), fontWeight: 900, lineHeight: 1.1 }}>
                  {isWaitlist && headline === "Scan to Order" ? "Join the Waitlist" : headline}
                </p>
                <p style={{ fontSize: fs(0.036), opacity: 0.85, marginTop: fs(0.03), lineHeight: 1.25 }}>{subheadline}</p>
                {wifiSsid && (
                  <p style={{ fontSize: fs(0.03), marginTop: fs(0.04), fontWeight: 700 }}>
                    Wi‑Fi: {wifiSsid}{wifiPass ? ` · ${wifiPass}` : ""}
                  </p>
                )}
              </div>
            )}
          </div>
          {showGuides && (
            <svg
              viewBox={`0 0 ${b} ${h}`}
              width={`${b}mm`}
              height={`${h}mm`}
              style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
            >
              <polygon points={`${b / 2},0 ${b},${h} 0,${h}`} fill="none" stroke="#64748b" strokeWidth={0.35} strokeDasharray="2 1.5" />
              {hasTab && (
                <polygon points={T.map((p) => p.join(",")).join(" ")} fill="#e2e8f0" stroke="#64748b" strokeWidth={0.35} />
              )}
            </svg>
          )}
        </div>
      );
    };

    return (
      <div className="relative h-full w-full bg-white" style={{ color: "#111827" }}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[10mm] pt-[5mm] text-[11px] font-medium text-slate-500">
          <span>{restaurantName} · {tableLabel} · {n}-sided pyramid stand</span>
          {showGuides && <span>Cut outer edge · fold dashed lines · glue the grey tab inside</span>}
        </div>
        {Array.from({ length: n }, (_, i) => renderFace(i))}
      </div>
    );
  };

  // Main wrapper for rendering flyer card
  const FlyerCard = ({ table }: { table: Table }) => {
    if (tentStyle === "pyramid") {
      return (
        <div
          id="flyer-content"
          className={`relative h-full w-full overflow-hidden bg-white ${fonts.find((f) => f.id === activeFont)?.class}`}
        >
          <PyramidNet table={table} />
        </div>
      );
    }
    return (
      <div
        id="flyer-content"
        className={`relative w-full h-full flex flex-col items-center text-center overflow-hidden transition-colors duration-500 ${fonts.find((f) => f.id === activeFont)?.class} ${
          templates.find((t) => t.id === template)?.class
        }`}
      >
        {bgImage && (
          <>
            <img
              src={bgImage}
              className="absolute inset-0 w-full h-full object-cover z-0"
              alt="background"
            />
            <div
              className="absolute inset-0 z-0 transition-colors duration-300"
              style={{
                backgroundColor: DARK_TEMPLATES.has(template) ? "#000" : "#fff",
                opacity: overlayOpacity / 100,
              }}
            />
          </>
        )}
        {template === "framed" && (
          <div
            className="absolute inset-4 border-4 z-10 pointer-events-none"
            style={{ borderColor: brandColor }}
          />
        )}
        {template === "gold" && (
          <div className="absolute inset-4 border border-dashed border-[#D4AF37]/40 z-10 pointer-events-none" />
        )}
        {template === "eco" && (
          <div className="absolute inset-4 border border-dashed border-emerald-800/30 z-10 pointer-events-none" />
        )}

        {tentStyle === "standing" ? (
          <StandingTentFlyer table={table} />
        ) : (
          <div className="relative z-10 flex flex-col h-full w-full items-center p-12">
            <FlyerPanelContent table={table} isHalf={false} />
          </div>
        )}
      </div>
    );
  };

  const OPT_ON = "border-[#fe5c13] bg-[#FFF4EC] text-[#0F1117]";
  const OPT_OFF = "border-[#E8E8E3] bg-white text-[#4B5563] hover:border-[#D6D6CF] hover:text-[#0F1117]";
  const SEG_ON = "whitespace-nowrap bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
  const SEG_OFF = "whitespace-nowrap font-medium text-[#6B7280] hover:text-[#0F1117]";
  const INPUT =
    "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
  const LABEL = "mb-1.5 block text-[13px] font-medium text-[#4B5563]";
  const CHECK_ROW = "flex cursor-pointer items-center gap-2.5 text-[13px] text-[#374151]";
  const isWaitlist = selectedTable.id === "waitlist";
  const formatName = tentStyle === "pyramid" ? "Pyramid stand, A4 landscape" : tentStyle === "standing" ? "Folding tent, A5" : "Flat card, A5";
  const PREVIEW_SCALE = 0.82;

  const pickTable = (t: Table, floor: string) => {
    setSelectedTable(t);
    if (t.id === "waitlist") {
      setHeadline("Scan to Join Waitlist");
      setSubheadline("Secure your spot in line directly from your phone.");
    } else {
      setHeadline("Scan to Order");
      setSubheadline("View menu, order & pay from your phone.");
    }
    setActiveFloor(floor);
  };

  return (
    <SettingsPageLayout
      title="Table QR codes"
      description="Design and print the QR cards guests scan at their table"
      maxWidth="max-w-[1400px]"
      action={
        <>
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="no-print inline-flex h-10 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#6B7280]" />
            {downloading ? "Preparing" : "Download PNG"}
          </button>
          <button
            onClick={handlePrint}
            disabled={printMode === "bulk" && selectedTableIds.size === 0}
            className="no-print inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
          >
            <Printer className="h-4 w-4" />
            {printMode === "bulk" ? `Print ${selectedTableIds.size} ${selectedTableIds.size === 1 ? "card" : "cards"}` : "Print"}
          </button>
        </>
      }
    >
      {/* Print styles: targets A5 portrait or bulk page sequences */}
      <style jsx global>{`
        @media screen {
          .hidden-on-screen {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: ${tentStyle === "pyramid" ? "A4 landscape" : "A5 portrait"};
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #bulk-print-container,
          #bulk-print-container * {
            visibility: visible !important;
          }
          #bulk-print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .print-page {
            width: ${tentStyle === "pyramid" ? "297mm" : "148mm"} !important;
            height: 210mm !important;
            page-break-after: always !important;
            position: relative !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
            overflow: hidden !important;
          }
          .print-page:last-child {
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Bulk Print Container */}
      <div id="bulk-print-container" className="hidden-on-screen">
        {printMode === "single" ? (
          <div className="print-page">
            <FlyerCard table={selectedTable} />
          </div>
        ) : (
          tables
            .filter((t) => selectedTableIds.has(t.id))
            .map((t) => (
              <div key={t.id} className="print-page">
                <FlyerCard table={t} />
              </div>
            ))
        )}
      </div>

      {/* Two-panel layout */}
      <div className="no-print grid grid-cols-1 items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Controls */}
        <div className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
          <Section title="Format" hint="How the card stands on the table.">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Format">
              {(
                [
                  ["flat", "Flat card", "A5"],
                  ["standing", "Folding tent", "A5, folded"],
                  ["pyramid", "Pyramid", "A4 cut-out"],
                ] as const
              ).map(([id, name, sub]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={tentStyle === id}
                  onClick={() => setTentStyle(id)}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors ${tentStyle === id ? OPT_ON : OPT_OFF}`}
                >
                  <span className="text-[13px] font-semibold">{name}</span>
                  <span className="text-[12px] text-[#6B7280]">{sub}</span>
                </button>
              ))}
            </div>

            {tentStyle === "pyramid" && (
              <div className="space-y-4 rounded-xl border border-[#F0F0EB] bg-[#FAFAF7] p-4">
                <div>
                  <p className={LABEL}>Faces</p>
                  <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1">
                    {([3, 4] as const).map((n) => (
                      <button key={n} onClick={() => setPyramidSides(n)} className={`flex h-7 items-center rounded-lg px-3 text-[12px] transition-colors ${pyramidSides === n ? SEG_ON : SEG_OFF}`}>
                        {n === 3 ? "3, triangle" : "4, square"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={LABEL}>Size</p>
                    <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1">
                      {([[70, "7 cm"], [90, "9 cm"], [110, "11 cm"]] as const).map(([mm, name]) => (
                        <button key={mm} onClick={() => setPyramidBase(mm)} className={`flex h-7 items-center rounded-lg px-2.5 text-[12px] tabular-nums transition-colors ${pyramidBase === mm ? SEG_ON : SEG_OFF}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={LABEL}>Shape</p>
                    <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1">
                      {([[false, "Classic"], [true, "Tall"]] as const).map(([tall, name]) => (
                        <button key={name} onClick={() => setPyramidTall(tall)} className={`flex h-7 items-center rounded-lg px-3 text-[12px] transition-colors ${pyramidTall === tall ? SEG_ON : SEG_OFF}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <p className={LABEL}>What goes on each face</p>
                  <div className="space-y-1.5" role="radiogroup" aria-label="Face content">
                    {(
                      [
                        ["all", "QR code on every face"],
                        ["alternate", "QR and brand faces, alternating"],
                        ["one", "One QR face, the rest branded"],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        role="radio"
                        aria-checked={pyramidMode === id}
                        onClick={() => setPyramidMode(id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${pyramidMode === id ? OPT_ON : OPT_OFF}`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${pyramidMode === id ? "border-[#fe5c13]" : "border-[#C4C4BE]"}`}>
                          {pyramidMode === id && <span className="h-2 w-2 rounded-full bg-[#fe5c13]" />}
                        </span>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className={CHECK_ROW}>
                  <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="h-4 w-4 rounded" />
                  Show cut, fold and glue guides
                </label>
                <p className="text-[12px] leading-relaxed text-[#6B7280]">
                  Print on 200 gsm card or thicker. Cut around the outer edge, fold on the dashed lines and glue the grey tab inside.
                </p>
              </div>
            )}
          </Section>

          <Section
            title={printMode === "single" ? "Table" : "Tables to print"}
            hint={printMode === "single" ? "Each table has its own QR code." : `${selectedTableIds.size} of ${tables.length} selected. Each prints on its own page.`}
          >
            <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="Print mode">
              {(
                [
                  ["single", "One table"],
                  ["bulk", "Several tables"],
                ] as const
              ).map(([id, name]) => (
                <button key={id} role="radio" aria-checked={printMode === id} onClick={() => setPrintMode(id)} className={`flex h-7 items-center rounded-lg px-3 text-[12px] transition-colors ${printMode === id ? SEG_ON : SEG_OFF}`}>
                  {name}
                </button>
              ))}
            </div>

            {printMode === "single" ? (
              <>
                {floorGroups.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {floorGroups.map(({ floor, tables: ft }) => (
                      <button
                        key={floor}
                        onClick={() => {
                          setActiveFloor(floor);
                          if (ft[0]) pickTable(ft[0], floor);
                        }}
                        className={`h-7 rounded-lg border px-2.5 text-[12px] font-medium transition-colors ${activeFloor === floor ? OPT_ON : OPT_OFF}`}
                      >
                        {floor}
                      </button>
                    ))}
                  </div>
                )}
                {floorGroups
                  .filter(({ floor }) => floorGroups.length === 1 || floor === activeFloor)
                  .map(({ floor, tables: floorTables }) => (
                    <div key={floor} className="grid grid-cols-4 gap-2">
                      {floorTables.map((t) => {
                        const on = selectedTable.id === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => pickTable(t, floor)}
                            aria-pressed={on}
                            className={`flex h-12 flex-col items-center justify-center rounded-xl border px-1 transition-colors ${on ? OPT_ON : OPT_OFF}`}
                          >
                            <span className={`tabular-nums ${t.id === "waitlist" ? "text-[12px] font-semibold" : "text-[14px] font-semibold"}`}>
                              {t.id === "waitlist" ? "Waitlist" : `T${getTableLabel(t)}`}
                            </span>
                            {t.counter_name && <span className="w-full truncate text-center text-[11px] text-[#9CA3AF]">{t.counter_name}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                {!isWaitlist && (
                  <button
                    onClick={() => setConfirmRotate(true)}
                    disabled={rotating}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6B7280] underline decoration-[#D6D6CF] underline-offset-2 transition-colors hover:text-[#0F1117] disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${rotating ? "animate-spin" : ""}`} />
                    {rotating ? "Making a new QR code" : `Make a new QR code for table ${getTableLabel(selectedTable)}`}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={selectAllTables} className="h-8 rounded-lg border border-[#E8E8E3] bg-white px-2.5 text-[12px] font-semibold text-[#374151] hover:border-[#D6D6CF]">
                    Select all
                  </button>
                  <button onClick={deselectAllTables} className="h-8 rounded-lg px-2.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F3EF] hover:text-[#0F1117]">
                    Clear
                  </button>
                </div>
                {floorGroups.map(({ floor, tables: floorTables }) => (
                  <div key={floor}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[#6B7280]">{floor}</span>
                      <button onClick={() => selectFloorTables(floor)} className="text-[12px] font-medium text-[#6B7280] underline decoration-[#D6D6CF] underline-offset-2 hover:text-[#0F1117]">
                        Select floor
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {floorTables.map((t) => {
                        const on = selectedTableIds.has(t.id);
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleTableSelection(t.id)}
                            aria-pressed={on}
                            className={`relative flex h-10 items-center justify-center rounded-xl border text-[13px] font-semibold tabular-nums transition-colors ${on ? OPT_ON : OPT_OFF}`}
                          >
                            {t.id === "waitlist" ? "Waitlist" : `T${getTableLabel(t)}`}
                            {on && (
                              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#fe5c13] text-white">
                                <Check className="h-2.5 w-2.5" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Design">
            <div>
              <p className={LABEL}>Style</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Style">
                {templates.map((t) => {
                  const on = template === t.id;
                  return (
                    <button
                      key={t.id}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setTemplate(t.id)}
                      className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${on ? OPT_ON : OPT_OFF}`}
                    >
                      <span className="h-6 w-6 shrink-0 rounded-md border border-black/10" style={{ background: FACE_BG[t.id]?.bg || "#fff" }} />
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={LABEL}>Font</p>
                <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="Font">
                  {fonts.map((f) => (
                    <button key={f.id} role="radio" aria-checked={activeFont === f.id} title={f.name} onClick={() => setActiveFont(f.id)} className={`flex h-7 items-center rounded-lg px-3 text-[13px] transition-colors ${f.class} ${activeFont === f.id ? SEG_ON : SEG_OFF}`}>
                      Aa
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={LABEL}>Accent colour</p>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Accent colour">
                  {brandColors.map((c) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={brandColor === c}
                      aria-label={c}
                      onClick={() => setBrandColor(c)}
                      className={`h-6 w-6 rounded-full transition-shadow ${brandColor === c ? "ring-2 ring-[#fe5c13] ring-offset-2" : "ring-1 ring-black/10"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={LABEL}>Logo</p>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8E8E3] bg-[#FAFAF7]">
                    {logoImage ? <img src={logoImage} className="h-full w-full object-contain p-0.5" alt="Logo" /> : <Upload className="h-4 w-4 text-[#9CA3AF]" />}
                  </span>
                  {logoImage ? (
                    <button onClick={() => setLogoImage(null)} className="text-[12px] font-medium text-[#6B7280] hover:text-rose-600">Remove</button>
                  ) : (
                    <button onClick={() => logoInputRef.current?.click()} className="h-9 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] hover:border-[#D6D6CF]">Upload</button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setLogoImage)} />
                </div>
              </div>
              <div>
                <p className={LABEL}>Background photo</p>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E8E8E3] bg-[#FAFAF7]">
                    {bgImage ? <img src={bgImage} className="h-full w-full object-cover" alt="Background" /> : <ImageIcon className="h-4 w-4 text-[#9CA3AF]" />}
                  </span>
                  {bgImage ? (
                    <button onClick={() => setBgImage(null)} className="text-[12px] font-medium text-[#6B7280] hover:text-rose-600">Remove</button>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="h-9 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[12px] font-semibold text-[#374151] hover:border-[#D6D6CF]">Upload</button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, setBgImage)} />
                </div>
              </div>
            </div>
            {bgImage && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="qr-overlay" className="text-[13px] font-medium text-[#4B5563]">Darken photo</label>
                  <span className="text-[12px] tabular-nums text-[#6B7280]">{overlayOpacity}%</span>
                </div>
                <input id="qr-overlay" type="range" min="0" max="90" value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} className="w-full accent-[#fe5c13]" />
              </div>
            )}
          </Section>

          <Section title="Text">
            <div>
              <label htmlFor="qr-head" className={LABEL}>Headline</label>
              <input id="qr-head" value={headline} onChange={(e) => setHeadline(e.target.value)} className={INPUT} />
              {isWaitlist && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WAITLIST_HEADLINES.map((h) => (
                    <button key={h} onClick={() => setHeadline(h)} className={`h-7 rounded-lg border px-2.5 text-[12px] font-medium transition-colors ${headline === h ? OPT_ON : OPT_OFF}`}>
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="qr-sub" className={LABEL}>Line under the headline</label>
              <textarea id="qr-sub" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-[#E8E8E3] bg-white px-3.5 py-2.5 text-[14px] text-[#0F1117] outline-none transition-colors hover:border-[#D6D6CF] focus:border-[#fe5c13]" />
            </div>
            <div>
              <label htmlFor="qr-promo" className={LABEL}>
                Offer banner <span className="font-normal text-[#9CA3AF]">Optional</span>
              </label>
              <input id="qr-promo" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="10% off on UPI payments" className={INPUT} />
            </div>
            <div>
              <p className={LABEL}>
                Wi-Fi <span className="font-normal text-[#9CA3AF]">Optional</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Network name" aria-label="Wi-Fi network name" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className={INPUT} />
                <input placeholder="Password" aria-label="Wi-Fi password" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} className={INPUT} />
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              <label className={CHECK_ROW}>
                <input type="checkbox" checked={showArBadge} onChange={(e) => setShowArBadge(e.target.checked)} className="h-4 w-4 rounded" />
                {isWaitlist ? "Show the “Skip the line” badge" : "Show the “3D AR” badge"}
              </label>
              {isWaitlist && (
                <label className={CHECK_ROW}>
                  <input type="checkbox" checked={showSteps} onChange={(e) => setShowSteps(e.target.checked)} className="h-4 w-4 rounded" />
                  Show the three steps: scan, enter details, get an SMS
                </label>
              )}
            </div>
          </Section>
        </div>

        {/* Preview */}
        <div className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white lg:sticky lg:top-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F0EB] px-5 py-3.5">
            <div>
              <h2 className="text-[14px] font-semibold text-[#0F1117]">
                Preview, {isWaitlist ? "waitlist" : `table ${getTableLabel(selectedTable)}`}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#6B7280]">{formatName}</p>
            </div>
            {printMode === "bulk" && (
              <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">
                Printing {selectedTableIds.size} {selectedTableIds.size === 1 ? "card" : "cards"}
              </span>
            )}
          </div>
          <div className="flex justify-center overflow-auto bg-[#F3F3EF] px-6 py-8">
            <div
              style={
                tentStyle === "pyramid"
                  ? undefined
                  : { width: `calc(148mm * ${PREVIEW_SCALE})`, height: `calc(210mm * ${PREVIEW_SCALE})` }
              }
            >
              <div
                className="select-none shadow-[0_18px_40px_-16px_rgba(15,17,23,0.35)]"
                style={
                  tentStyle === "pyramid"
                    ? { width: "calc(297mm * 0.62)", height: "calc(210mm * 0.62)" }
                    : { transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left", width: "148mm", height: "210mm" }
                }
              >
                <div
                  ref={flyerRef}
                  className="bg-white"
                  style={{
                    width: tentStyle === "pyramid" ? "297mm" : "148mm",
                    height: "210mm",
                    ...(tentStyle === "pyramid"
                      ? { transform: "scale(0.62)", transformOrigin: "top left" }
                      : {}),
                  }}
                >
                  <FlyerCard table={selectedTable} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmRotate}
        title={`Make a new QR code for table ${getTableLabel(selectedTable)}?`}
        message="Cards already printed for this table will stop working. You'll need to print and replace them."
        confirmText="Make new code"
        cancelText="Keep current code"
        destructive
        onClose={() => setConfirmRotate(false)}
        onConfirm={() => {
          setConfirmRotate(false);
          void handleRotateToken();
        }}
      />
    </SettingsPageLayout>
  );
}
