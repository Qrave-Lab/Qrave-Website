import { serverApi } from "@/app/lib/serverApi";
import StaffFloorClient from "./FloorClient";

export default async function StaffFloorPage() {
  const [tablesRes, ordersRes, sessionsRes, takeawayRes, serviceRes, salesRes, waitlistRes] = await Promise.all([
    serverApi<any>("/api/admin/tables").catch(() => null),
    serverApi<any>("/api/admin/orders/active").catch(() => null),
    serverApi<any>("/api/admin/sessions/active").catch(() => null),
    serverApi<any>("/api/admin/takeaway/orders?status=active").catch(() => null),
    serverApi<any>("/api/admin/service-calls").catch(() => null),
    serverApi<any>("/api/admin/sales/today").catch(() => null),
    serverApi<any>("/api/admin/waitlist").catch(() => null),
  ]);

  const initialData = {
    tablesRes,
    ordersRes,
    sessionsRes,
    takeawayRes,
    serviceRes,
    salesRes,
    waitlistRes
  };

  return <StaffFloorClient initialData={initialData} />;
}
