export type TaxConfig = {
  mode?: "cgst_sgst" | "igst" | "utgst_cgst"; // cgst_sgst = intra-state (default), igst = inter-state
  inclusive?: boolean;                          // prices already include tax
  cess_enabled?: boolean;
  cess_percent?: number;
};

export type Table = {
  id: string;
  table_number: number;
  is_enabled: boolean;
  zone?: string | null;
  floor_name?: string;
  counter_name?: string;
};

export type Staff = {
  id: string;
  name: string;
  role: "owner" | "manager" | "staff";
  email: string;
};

export type Restaurant = {
  name: string;
  address: string;
  currency: string;
  taxPercent: number;
  serviceCharge: number;
  phone: string;
  phoneCountryCode: string;
  website?: string;
  logo_url?: string;
  orderingEnabled?: boolean;
  openTime?: string;
  closeTime?: string;
  themeConfig?: ThemeConfig;
  gstNumber?: string;
  taxConfig?: TaxConfig;
};

export type ThemeConfig = {
  role_access?: {
    owner?: Record<string, boolean>;
    manager?: Record<string, boolean>;
    kitchen?: Record<string, boolean>;
    waiter?: Record<string, boolean>;
    cashier?: Record<string, boolean>;
  };
  preset?: string;

  // ── Typography ────────────────────────────────────────────────────────────
  font_family?: string;      // body font (backward compat key)
  heading_font?: string;     // separate heading font
  font_size?: "sm" | "md" | "lg";

  // ── Custom text ───────────────────────────────────────────────────────────
  hero_title?: string;       // custom menu page title
  hero_subtitle?: string;    // tagline / subtitle

  // ── Layout ────────────────────────────────────────────────────────────────
  layout?: "list" | "grid" | "compact";
  image_style?: "none" | "small" | "large" | "full";
  spacing?: "compact" | "normal" | "relaxed";
  shadow?: "none" | "sm" | "md" | "lg";
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  section_icon?: string;

  // ── Background ────────────────────────────────────────────────────────────
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  pattern_style?: "none" | "dots" | "grid" | "silk" | "chevron" | "waves" | "mandala" | "leaf" | "";

  // ── Motif / Ornament ──────────────────────────────────────────────────────
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";

  // ── Colors ────────────────────────────────────────────────────────────────
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
    header_bg?: string;
    header_text?: string;
  };
};
