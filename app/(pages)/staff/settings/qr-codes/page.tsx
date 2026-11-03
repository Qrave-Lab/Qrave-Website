"use client";

import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import { api } from "@/app/lib/api";
import { getRootDomain, slugifyRestaurantName } from "@/app/lib/tenant";
import {
  Check,
  ChevronDown,
  Download,
  Triangle,
  ChevronRight,
  Grid,
  Image as ImageIcon,
  Layers,
  Layout,
  Printer,
  RefreshCw,
  Smartphone,
  Trash2,
  Type,
  Upload,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

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
    } catch (e) {
      console.error("Failed to regenerate QR token", e);
      alert("Failed to regenerate QR token");
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
      <div className="flex h-screen items-center justify-center text-gray-500 font-semibold bg-slate-50">
        Loading tables…
      </div>
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
              className={`${isHalf ? "text-base" : "text-2xl"} font-black tracking-widest uppercase`}
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
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${isHalf ? "text-[7px]" : "text-[9px] mb-1.5"} ${
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
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${isHalf ? "text-[7px]" : "text-[9px] mb-1.5"} ${
                isDark
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "bg-blue-500/10 text-blue-800 border border-blue-500/20"
              }`}
            >
              <span>Skip the Line</span>
            </div>
          )}

          <h2
            className={`${isHalf ? "text-sm" : "text-xl"} font-black leading-tight`}
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
                    className="flex items-center justify-center rounded-full text-white font-black"
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
                <div className="text-[8px] uppercase tracking-widest opacity-60">
                  Table
                </div>
                <div
                  className={`${isHalf ? "text-lg" : "text-3xl"} font-black leading-none mt-0.5`}
                >
                  {getTableLabel(table)}
                </div>
              </div>
              <div className="text-right">
                {table.floor_name && (
                  <>
                    <div className="text-[8px] uppercase tracking-widest opacity-60">
                      Floor
                    </div>
                    <div
                      className={`${isHalf ? "text-[10px]" : "text-xs"} font-black leading-none mt-1`}
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
            <div className="bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest text-center py-0.5 shadow-sm">
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
          <span className="relative px-3 py-0.5 rounded-full bg-slate-100 text-[7px] font-extrabold text-slate-400 uppercase tracking-widest border border-slate-200">
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
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[10mm] pt-[5mm] text-[9px] font-bold uppercase tracking-widest text-slate-400">
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

  return (
    <SettingsPageLayout
      title="Table Tent Card & Flyer Builder"
      description="Design, customize, and print high-fidelity tabletop QR flyers or folding standing tent cards."
      maxWidth="max-w-full"
      action={
        <div className="flex gap-2">
          {selectedTable && (
            <button
              onClick={handleRotateToken}
              disabled={rotating}
              className="no-print flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${rotating ? "animate-spin" : ""}`}
              />
              Regenerate QR Token
            </button>
          )}
          <button
            onClick={() => void handleDownload()}
            disabled={downloading}
            className="no-print flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Preparing…" : "Download PNG"}
          </button>
          <button
            onClick={handlePrint}
            className="no-print flex items-center gap-2 bg-[#fe5c13] hover:bg-[#fe5c13]/95 text-gray-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#fe5c13]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Printer className="w-4 h-4" /> Print Setup
          </button>
        </div>
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
      <div className="no-print flex gap-6 min-h-[720px]">
        {/* LEFT: Controls Accordion */}
        <div className="w-96 shrink-0 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* 1. Print Mode & Layout Options */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("layout")}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Grid className="w-3.5 h-3.5" />
                  </div>
                  Format & Layout Mode
                </div>
                {activeSection === "layout" ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {activeSection === "layout" && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                      Print Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPrintMode("single")}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          printMode === "single"
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Single Table
                      </button>
                      <button
                        onClick={() => setPrintMode("bulk")}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          printMode === "bulk"
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Bulk Print All
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                      Tent Folding Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["flat", "Flat Poster", "A5"],
                          ["standing", "Folding Tent", "A5 fold"],
                          ["pyramid", "Pyramid Stand", "A4 net"],
                        ] as const
                      ).map(([id, name, sub]) => (
                        <button
                          key={id}
                          onClick={() => setTentStyle(id)}
                          className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-[11px] font-bold border transition-all ${
                            tentStyle === id
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {id === "pyramid" && <Triangle className="w-3.5 h-3.5" />}
                          {name}
                          <span className="text-[9px] font-medium opacity-60">{sub}</span>
                        </button>
                      ))}
                    </div>

                    {tentStyle === "pyramid" && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Faces
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {([3, 4] as const).map((n) => (
                              <button
                                key={n}
                                onClick={() => setPyramidSides(n)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${pyramidSides === n ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {n === 3 ? "3 faces (triangle)" : "4 faces (square)"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Size (face base)
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              [70, "Mini 7cm"],
                              [90, "Standard 9cm"],
                              [110, "Large 11cm"],
                            ].map(([mm, name]) => (
                              <button
                                key={mm}
                                onClick={() => setPyramidBase(mm as number)}
                                className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${pyramidBase === mm ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Shape
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              [false, "Classic"],
                              [true, "Tall & slim"],
                            ].map(([tall, name]) => (
                              <button
                                key={String(name)}
                                onClick={() => setPyramidTall(tall as boolean)}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${pyramidTall === tall ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                            Face content
                          </label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              ["all", "QR on every face"],
                              ["alternate", "QR + brand faces (alternating)"],
                              ["one", "One QR face, rest branded"],
                            ].map(([id, name]) => (
                              <button
                                key={id}
                                onClick={() => setPyramidMode(id as "all" | "alternate" | "one")}
                                className={`py-2 rounded-xl text-xs font-bold border transition-all ${pyramidMode === id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showGuides}
                            onChange={(e) => setShowGuides(e.target.checked)}
                            className="w-4 h-4 accent-slate-950 rounded"
                          />
                          <span className="text-xs font-bold text-slate-600">
                            Show cut, fold &amp; glue-tab guides
                          </span>
                        </label>
                        <p className="text-[11px] leading-relaxed text-slate-400">
                          Prints on A4 landscape. Use 200gsm+ card, cut around the outer edge, fold on the dashed lines and glue the grey tab inside.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showArBadge}
                        onChange={(e) => setShowArBadge(e.target.checked)}
                        className="w-4 h-4 accent-slate-950 rounded border-slate-350"
                      />
                      <span className="text-xs font-bold text-slate-600">
                        {selectedTable.id === "waitlist"
                          ? 'Include "Skip the Line" badge'
                          : 'Include "3D AR Enabled" badge'}
                      </span>
                    </label>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                        Promo Ribbon Text (Optional)
                      </label>
                      <input
                        value={promoText}
                        onChange={(e) => setPromoText(e.target.value)}
                        placeholder="e.g. 10% OFF ON UPI PAYMENTS"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Target Tables selection */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("target")}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                  <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  {printMode === "single"
                    ? "Target Table"
                    : "Select Tables for Bulk Print"}
                </div>
                {activeSection === "target" ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {activeSection === "target" && (
                <div className="px-6 pb-6">
                  {printMode === "single" ? (
                    <>
                      <p className="text-xs text-gray-500 mb-3">
                        Select which table flyer is being designed.
                      </p>
                      {/* Floor tabs */}
                      {floorGroups.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {floorGroups.map(({ floor }) => (
                            <button
                              key={floor}
                              onClick={() => {
                                setActiveFloor(floor);
                                const first = floorGroups.find(
                                  (g) => g.floor === floor,
                                )?.tables[0];
                                if (first) setSelectedTable(first);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                activeFloor === floor
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                              }`}
                            >
                              <Layers className="w-3 h-3" />
                              {floor}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Tables grid for active floor */}
                      {floorGroups
                        .filter(
                          ({ floor }) =>
                            floorGroups.length === 1 || floor === activeFloor,
                        )
                        .map(({ floor, tables: floorTables }) => (
                          <div key={floor}>
                            {floorGroups.length === 1 && (
                              <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <Layers className="w-3 h-3" />
                                {floor}
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-2">
                              {floorTables.map((t) => (
                                <button
                                  key={t.id}
                                  onClick={() => {
                                    setSelectedTable(t);
                        if (t.id === "waitlist") {
                          setHeadline("Scan to Join Waitlist");
                          setSubheadline("Secure your spot in line directly from your phone.");
                        } else {
                          setHeadline("Scan to Order");
                          setSubheadline("View menu, order & pay from your phone.");
                        }
                                    setActiveFloor(floor);
                                  }}
                                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm font-bold transition-all ${
                                    selectedTable.id === t.id
                                      ? "border-slate-900 bg-slate-900 text-white shadow-md scale-105"
                                      : "border-slate-200 hover:border-slate-350 text-slate-600 bg-white"
                                  }`}
                                >
                                  <span>{getTableLabel(t)}</span>
                                  {t.counter_name && (
                                    <span className="text-[9px] font-normal opacity-70 truncate w-full text-center">
                                      {t.counter_name}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-500">
                          {selectedTableIds.size} / {tables.length} selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllTables}
                            className="text-[10px] bg-slate-900 text-white px-2.5 py-1 rounded-lg font-bold"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllTables}
                            className="text-[10px] bg-white text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg font-bold hover:bg-slate-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {floorGroups.map(({ floor, tables: floorTables }) => (
                        <div
                          key={floor}
                          className="space-y-2 border-t border-slate-100 pt-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">
                              {floor}
                            </span>
                            <button
                              onClick={() => selectFloorTables(floor)}
                              className="text-[9px] text-[#fe5c13] font-black uppercase tracking-wider hover:underline"
                            >
                              Select Floor
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {floorTables.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => toggleTableSelection(t.id)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border text-sm font-bold transition-all ${
                                  selectedTableIds.has(t.id)
                                    ? "border-[#fe5c13] bg-[#fe5c13]/10 text-slate-900"
                                    : "border-slate-200 hover:border-slate-355 text-slate-600 bg-white"
                                }`}
                              >
                                <span>{getTableLabel(t)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Visual Design templates */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("design")}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                  <div className="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Layout className="w-3 h-3" />
                  </div>
                  Visual Design
                </div>
                {activeSection === "design" ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {activeSection === "design" && (
                <div className="px-6 pb-6 space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                      Layout Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTemplate(t.id)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                            template === t.id
                              ? "border-purple-600 bg-purple-50 text-purple-700 scale-[1.02] shadow-sm"
                              : "border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                      Typography
                    </label>
                    <div className="flex rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {fonts.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setActiveFont(f.id)}
                          className={`flex-1 py-2 text-xs font-bold transition-colors ${f.class} ${
                            activeFont === f.id
                              ? "bg-slate-900 text-white"
                              : "bg-white text-slate-600 hover:bg-gray-50"
                          }`}
                        >
                          Aa
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">
                      Accent Color
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {brandColors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrandColor(c)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-105 ${
                            brandColor === c
                              ? "ring-2 ring-offset-2 ring-slate-400"
                              : ""
                          }`}
                          style={{
                            backgroundColor: c,
                            borderColor:
                              brandColor === c ? "white" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Background Image
                      </label>
                      {bgImage && (
                        <button
                          onClick={() => setBgImage(null)}
                          className="text-[10px] text-red-500 font-medium hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      )}
                    </div>
                    {!bgImage ? (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-350 rounded-2xl p-5 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors gap-2"
                      >
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        <span className="text-xs font-semibold">
                          Click to upload image
                        </span>
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative h-24 w-full rounded-2xl overflow-hidden border border-gray-250">
                          <img
                            src={bgImage}
                            className="w-full h-full object-cover"
                            alt="bg upload"
                          />
                          <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-gray-500 font-medium">
                              Overlay Strength
                            </span>
                            <span className="font-bold">{overlayOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="90"
                            value={overlayOpacity}
                            onChange={(e) =>
                              setOverlayOpacity(Number(e.target.value))
                            }
                            className="w-full accent-slate-900 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleImageUpload(e, setBgImage)}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Brand Logo (Center Logo)
                      </label>
                      {logoImage && (
                        <button
                          onClick={() => setLogoImage(null)}
                          className="text-[10px] text-red-500 font-medium hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {logoImage ? (
                        <div className="w-12 h-12 border rounded-xl p-1 bg-white flex items-center justify-center">
                          <img
                            src={logoImage}
                            className="w-full h-full object-contain"
                            alt="logo upload"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 border border-slate-200">
                          <Upload className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs bg-white border border-gray-300 px-3.5 py-2 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      >
                        Choose File...
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => handleImageUpload(e, setLogoImage)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Text & Content headings */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection("content")}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 font-semibold text-sm text-gray-700">
                  <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Type className="w-3.5 h-3.5" />
                  </div>
                  Text & Content
                </div>
                {activeSection === "content" ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {activeSection === "content" && (
                <div className="px-6 pb-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                      Main Headline
                    </label>
                    <input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">
                      Sub-Headline
                    </label>
                    <textarea
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      rows={2}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                    />
                  </div>
                  {selectedTable.id === "waitlist" && (
                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Waitlist headline ideas
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WAITLIST_HEADLINES.map((h) => (
                          <button
                            key={h}
                            onClick={() => setHeadline(h)}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${headline === h ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showSteps}
                          onChange={(e) => setShowSteps(e.target.checked)}
                          className="w-4 h-4 accent-slate-950 rounded"
                        />
                        <span className="text-xs font-bold text-slate-600">
                          Show &ldquo;Scan → Enter details → Get SMS&rdquo; steps
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Wifi className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Wi-Fi Details (Optional)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="Network Name"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                      <input
                        placeholder="Password"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Flyer Live Preview */}
        <div className="flex-1 bg-slate-100 border border-slate-200 rounded-3xl relative flex flex-col items-center justify-center p-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #000 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="no-print absolute top-5 right-5 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200/50 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <RefreshCw
              className="w-3 h-3 animate-spin"
              style={{ animationDuration: "4s" }}
            />
            Live Preview
          </div>

          <div
            className="shadow-2xl shadow-slate-400/30 select-none"
            style={
              tentStyle === "pyramid"
                ? { width: "calc(297mm * 0.62)", height: "calc(210mm * 0.62)" }
                : undefined
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

          {printMode === "bulk" && (
            <div className="no-print mt-4 text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-slate-200/50 border border-slate-350/20 px-4 py-1.5 rounded-full">
              Bulk Print Active: loop printing {selectedTableIds.size} selected
              tables
            </div>
          )}
        </div>
      </div>
    </SettingsPageLayout>
  );
}
