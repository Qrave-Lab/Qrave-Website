export type PlanCode =
  | "monthly_399"
  | "monthly_799_order"
  | "monthly_999_ar"
  | "monthly_799"
  | "monthly_1299"
  | "yearly_8999"
  | "yearly_15199"
  | "monthly_499"
  | "yearly_5500";

export const PLAN_OPTIONS = [
  {
    code: "monthly_399",
    name: "QR Menu",
    cadence: "Monthly",
    price: "₹399 / month",
    summary: "Digital QR menu and table QR codes. No ordering, no AR.",
  },
  {
    code: "monthly_799_order",
    name: "Ordering",
    cadence: "Monthly",
    price: "₹799 / month",
    summary: "QR menu plus diner ordering and order handling. No AR.",
  },
  {
    code: "monthly_999_ar",
    name: "AR",
    cadence: "Monthly",
    price: "₹999 / month",
    summary: "Ordering plus 3D / AR dishes on the menu.",
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

/** Grace period after every bill's due date before access is locked. */
export const BILLING_GRACE_DAYS = 3;

export const normalizePlanCode = (plan?: string | null): PlanCode => {
  const value = String(plan || "").trim().toLowerCase();
  if (value === "monthly_399") return "monthly_399";
  if (value === "monthly_799_order") return "monthly_799_order";
  if (value === "monthly_999_ar") return "monthly_999_ar";
  if (value === "monthly_799") return "monthly_799";
  if (value === "yearly_8999") return "yearly_8999";
  if (value === "monthly_1299") return "monthly_1299";
  if (value === "yearly_15199") return "yearly_15199";
  if (value === "monthly_499") return "monthly_499";
  if (value === "yearly_5500" || value === "yearly_5499") return "yearly_5500";
  return "monthly_1299";
};

/** Menu-only plans: QR Menu (₹399) and the grandfathered AR Menu (₹799 / ₹8,999). */
export const isArMenuPlan = (plan?: string | null): boolean => {
  const code = normalizePlanCode(plan);
  return code === "monthly_399" || code === "monthly_799" || code === "yearly_8999";
};

/** Ordering, AR, Full and legacy plans can run the order-handling POS flow. */
export const planHasOrdering = (plan?: string | null): boolean => !isArMenuPlan(plan);

/** Only Full Access (and grandfathered legacy plans) include operations tools. */
export const planHasOps = (plan?: string | null): boolean => {
  const code = normalizePlanCode(plan);
  return !(code === "monthly_399" || code === "monthly_799_order" || code === "monthly_999_ar");
};

/** AR / 3D models: AR, AR Menu (legacy) and Full plans. */
export const planHasAr = (plan?: string | null): boolean => {
  const code = normalizePlanCode(plan);
  return code !== "monthly_399" && code !== "monthly_799_order";
};

const OPS_PATHS = [
  "/staff/reservations",
  "/staff/takeaway",
  "/staff/analytics",
  "/staff/invoices",
  "/staff/inventory",
  "/staff/operations",
  "/staff/settings/audit",
  "/staff/settings/delivery-zones",
];

/** Where a locked operations page sends the user. */
export const OPS_UPGRADE_URL = "/staff/settings/subscription?upgrade=ops";

/** Plans that include a second branch. Mirrors branchEntitlementForPlan on the server. */
const MULTI_BRANCH_PLANS = [
  "monthly_1299",
  "monthly_1499",
  "monthly_999",
  "monthly_999_ar",
  "monthly_799_order",
  "yearly_15199",
  "yearly_14999",
  "yearly_10999",
];

export const planAllowsMoreBranches = (plan?: string | null): boolean =>
  MULTI_BRANCH_PLANS.includes(String(plan || "").trim().toLowerCase());

/** Staff pages that need operations (Full Access). */
export const isOpsPath = (pathname: string): boolean =>
  OPS_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const planLabel = (plan?: string | null): string => {
  const code = normalizePlanCode(plan);
  const option = PLAN_OPTIONS.find((p) => p.code === code);
  if (option) return `${option.name} ${option.cadence} ${option.price}`;
  if (code === "yearly_5500") return "Legacy Yearly ₹5,500";
  if (code === "monthly_799") return "AR Menu (legacy) ₹799 / month";
  if (code === "yearly_8999") return "AR Menu (legacy) ₹8,999 / year";
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
