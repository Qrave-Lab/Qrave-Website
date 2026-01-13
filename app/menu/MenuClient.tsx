"use client";

import { useEffect, useState } from "react";
import ModernFoodUI from "../(pages)/menu/MenuUi";
import { api } from "@/app/lib/api";

export default function MenuClient({ table }: { table: string | null }) {
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("session_id");
    if (!session) {
      console.error("No session found");
      setItems([]);
      return;
    }

    api<any[]>(`/api/customer/menu`,{credentials: "include"})
      .then(setItems)
      .catch(err => {
        console.error("Menu fetch failed", err);
        setItems([]);
      });
  }, []);

  if (!items) return <div>Loading menu...</div>;

  return <ModernFoodUI menuItems={items} tableNumber={table ?? "N/A"} />;
}
