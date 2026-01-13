"use client";

import { useEffect, useState } from "react";
import ModernFoodUI from "../../menu/MenuUi";
import { api } from "@/app/lib/api";

export default function MenuPage({ searchParams }: { searchParams?: Record<string, string> }) {
  const table = searchParams?.table;
  const [menuItems, setMenuItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<any[]>("/api/customer/menu", { method: "GET" })
      .then(data => setMenuItems(data))
      .catch(err => {
        console.error("Failed to load menu:", err);
        setMenuItems([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4">Loading menu...</div>;
  }

  return (
    <ModernFoodUI
      menuItems={menuItems || []}
      tableNumber={table}
    />
  );
}
