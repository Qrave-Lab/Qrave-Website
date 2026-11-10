export type PlanCode =
  | "monthly_799"
  | "monthly_1299"
  | "yearly_8999"
  | "yearly_15199"
  | "monthly_499"
  | "yearly_5500";

export const PLAN_OPTIONS = [
  {
    code: "monthly_799",
    name: "AR Menu",
    cadence: "Monthly",
    price: "₹799 / month",
    summary: "AR menu, menu management, and QR code tools.",
  },
  {
    code: "yearly_8999",
    name: "AR Menu",
    cadence: "Yearly",
    price: "₹8,999 / year",
    summary: "AR menu, menu management, and QR code tools.",
  },
  {
    code: "monthly_1299",
    name: "Full Access",
    cadence: "Monthly",
    price: "₹1,299 / month",
    summary: "Everything in Qrave, including ordering and operations.",
  },
  {
    code: "yearly_15199",
    name: "Full Access",
    cadence: "Yearly",
    price: "₹15,199 / year",
    summary: "Everything in Qrave, including ordering and operations.",
  },
] as const;

export const normalizePlanCode = (plan?: string | null): PlanCode => {
  const value = String(plan || "").trim().toLowerCase();
  if (value === "monthly_799") return "monthly_799";
  if (value === "yearly_8999") return "yearly_8999";
  if (value === "monthly_1299") return "monthly_1299";
  if (value === "yearly_15199") return "yearly_15199";
  if (value === "monthly_499") return "monthly_499";
  if (value === "yearly_5500" || value === "yearly_5499") return "yearly_5500";
  return "monthly_1299";
};

export const isArMenuPlan = (plan?: string | null): boolean => {
  const code = normalizePlanCode(plan);
  return code === "monthly_799" || code === "yearly_8999";
};

export const planLabel = (plan?: string | null): string => {
  const code = normalizePlanCode(plan);
  const option = PLAN_OPTIONS.find((p) => p.code === code);
  if (option) return `${option.name} ${option.cadence} ${option.price}`;
  if (code === "yearly_5500") return "Legacy Yearly ₹5,500";
  if (code === "monthly_499") return "Legacy Monthly ₹499";
  return "Full Access Monthly ₹1,299";
};

/** Food court stalls are menu-only: their court pays and diners order at the counter. */
export const FOOD_COURT_STALL_PLAN = "food_court_stall";

export const isFoodCourtStallPlan = (plan?: string | null): boolean =>
  String(plan || "").trim().toLowerCase() === FOOD_COURT_STALL_PLAN;

/** Staff pages a food court stall can open. */
const FOOD_COURT_STALL_PATHS = [
  "/staff/menu",
  "/staff/settings/subscription",
  "/staff/settings/profile",
  "/staff/settings/theme",
  "/staff/settings/security",
  "/staff/settings/feedback",
  "/staff/settings/delete-account",
];

export const isFoodCourtStallPath = (pathname: string): boolean =>
  pathname === "/staff/settings" || FOOD_COURT_STALL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Staff pages an AR Menu restaurant can open: a stall's pages plus table QR codes. */
export const isArMenuPath = (pathname: string): boolean =>
  isFoodCourtStallPath(pathname) ||
  pathname === "/staff/settings/qr-codes" ||
  pathname.startsWith("/staff/settings/qr-codes/");
