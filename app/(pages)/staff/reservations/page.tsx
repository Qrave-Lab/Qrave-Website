import { serverApi } from "@/app/lib/serverApi";
import ReservationsClient from "./ReservationsClient";

export default async function ReservationsPage() {
  const [tablesData, reservationsRes, waitlistRes, sessionsRes, meRes] = await Promise.all([
    serverApi<any>("/api/admin/tables").catch(() => null),
    serverApi<any>("/api/admin/reservations").catch(() => null),
    serverApi<any>("/api/admin/waitlist").catch(() => null),
    serverApi<any>("/api/admin/sessions/active").catch(() => null),
    serverApi<any>("/api/admin/me").catch(() => null),
  ]);

  return <ReservationsClient initialData={{ tablesData, reservationsRes, waitlistRes, sessionsRes, meRes }} />;
}
