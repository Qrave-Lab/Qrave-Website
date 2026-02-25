"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SettingsPageLayout from "@/app/components/settings/SettingsPageLayout";
import TableManager from "@/app/components/settings/TableManager";
import { api } from "@/app/lib/api";
import type { Table } from "@/app/components/settings/types";

export default function FloorPlanPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tablesData = await api<Table[]>("/api/admin/tables", { method: "GET" });
        setTables(tablesData || []);
      } catch {
        toast.error("Failed to load floor plan");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleTable = async (id: string) => {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    try {
      await api(`/api/admin/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: !table.is_enabled }),
      });
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, is_enabled: !t.is_enabled } : t)));
    } catch {
      toast.error("Failed to update table");
    }
  };

  const removeTable = async (id: string) => {
    try {
      await api(`/api/admin/tables/${id}`, { method: "DELETE" });
      setTables((prev) => prev.filter((t) => t.id !== id));
      toast.success("Table archived");
    } catch {
      toast.error("Failed to archive table");
    }
  };

  const updateTableMeta = async (id: string, floorName: string, counterName: string) => {
    try {
      await api(`/api/admin/tables/${id}/meta`, {
        method: "PATCH",
        body: JSON.stringify({ floor_name: floorName, counter_name: counterName }),
      });
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, floor_name: floorName, counter_name: counterName } : t))
      );
      toast.success("Table updated");
    } catch {
      toast.error("Failed to update floor/counter");
    }
  };

  return (
    <SettingsPageLayout title="Floor Plan" description="Manage your tables and seating layout." maxWidth="max-w-6xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <TableManager
          tables={tables}
          onToggle={toggleTable}
          onRemove={removeTable}
          onUpdateMeta={updateTableMeta}
        />
      )}
    </SettingsPageLayout>
  );
}
