export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "qravetech.in"}`
).replace(/\/+$/, "");

export const SITE_NAME = "Qrave";

export const SITE_TITLE = "Qrave: QR Ordering, 3D AR Menus & Cloud POS for Restaurants";

export const SITE_DESCRIPTION =
  "Qrave is the restaurant operating system: QR table ordering, 3D/AR menus, cloud POS, kitchen display, GST billing, inventory and analytics in one platform.";
