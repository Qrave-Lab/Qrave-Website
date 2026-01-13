"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/lib/api";

export default function TablePage({ params }: { params: Promise<{ table: string }> }) {
  const router = useRouter();
  const { table } = use(params);

  useEffect(() => {
    async function start() {
      if (!table) {
        router.replace("/menu");
        return;
      }

      try {
        const res = await api<{ session_id: string }>("/public/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant_id: "d7e5553a-bf08-463b-a19c-114391930dc7",
            table_id: "75fe1a4b-ba9d-452a-a249-72681b4a50a1",
          }),
          credentials: "include",
        });

        console.log("Started session:", res.session_id);

        localStorage.setItem("session_id", res.session_id);

      } catch (e) {
        console.error("Failed to start session:", e);
      }

      router.replace(`/menu?table=${table}`);
    }

    start();
  }, [table, router]);

  return <div>Loading table {table}...</div>;
}
