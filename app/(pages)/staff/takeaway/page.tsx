import { serverApi } from "@/app/lib/serverApi";
import TakeawayClient from "./TakeawayClient";

export default async function TakeawayPage() {
  const [me, menuRes, zonesRes, ordersRes] = await Promise.all([
    serverApi<any>("/api/admin/me").catch(() => null),
    serverApi<any>("/api/admin/menu").catch(() => null),
    serverApi<any>("/api/admin/delivery/zones").catch(() => null),
    serverApi<any>("/api/admin/takeaway/orders?status=active").catch(() => null),
  ]);

  return <TakeawayClient initialData={{ me, menuRes, zonesRes, ordersRes }} />;
}
