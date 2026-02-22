export type Table = {
  id: string;
  table_number: number;
  is_enabled: boolean;
  zone?: string | null;
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
  logo_url?: string;
  orderingEnabled?: boolean;
  openTime?: string;
  closeTime?: string;
  themeConfig?: ThemeConfig;
};

export type ThemeConfig = {
  preset?: "thai" | "indian" | "minimal" | "";
  font_family?: string;
  bg_image_url?: string;
  bg_overlay_opacity?: number;
  card_style?: "rounded" | "soft" | "sharp" | "";
  button_style?: "solid" | "outline" | "glass" | "";
  motif?: "thai" | "indian" | "minimal" | "custom" | "";
  ornament_level?: "off" | "subtle" | "bold" | "";
  header_style?: "classic" | "elegant" | "festival" | "";
  pattern_style?: "none" | "silk" | "mandala" | "waves" | "leaf" | "";
  section_icon?: string;
  icon_pack?: "auto" | "thai" | "indian" | "minimal" | "";
  colors?: {
    bg?: string;
    surface?: string;
    text?: string;
    muted?: string;
    accent?: string;
    accent_text?: string;
  };
};
