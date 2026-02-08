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
  logo_url?: string;
  openTime?: string;
  closeTime?: string;
};
