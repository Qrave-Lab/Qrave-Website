"use client";

import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
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

  const updateTableMeta = async (id: string, floorName: string, counterName: string, capacity: number) => {
    try {
      await api(`/api/admin/tables/${id}/meta`, {
        method: "PATCH",
        body: JSON.stringify({ floor_name: floorName, counter_name: counterName, capacity }),
      });
      setTables((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, floor_name: floorName, counter_name: counterName, capacity } : t
        )
      );
      toast.success("Table updated");
    } catch {
      toast.error("Failed to update table");
    }
  };

  return (
    <SettingsPageLayout
      title="Floor plan"
      description="Tables, floors and sections, and which tables are in service"
      maxWidth="max-w-6xl"
      action={
        <Link
          href="/staff/settings/tables/add"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add table
        </Link>
      }
    >
      {isLoading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-[76px] rounded-2xl border border-[#E8E8E3] bg-white" />
          <div className="h-9 w-72 rounded-xl bg-[#F3F3EF]" />
          <div className="space-y-px overflow-hidden rounded-2xl border border-[#E8E8E3] bg-[#F0F0EB]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-white" />
            ))}
          </div>
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
