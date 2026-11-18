"use client";

import React from "react";
import { Edit2, LayoutGrid, List, Minus, Plus, Trash2, Users, X } from "lucide-react";
import type { Table } from "@/app/components/settings/types";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Link from "next/link";

type Props = {
  tables: Table[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateMeta: (id: string, floorName: string, counterName: string, capacity: number) => void;
};

const DEFAULT_FLOOR = "Main Floor";
const DEFAULT_SECTION = "Counter A";
const floorOf = (t: Table) => (t.floor_name || DEFAULT_FLOOR).trim() || DEFAULT_FLOOR;
const sectionOf = (t: Table) => (t.counter_name || DEFAULT_SECTION).trim() || DEFAULT_SECTION;
const seatsOf = (t: Table) => t.capacity ?? 4;

const INPUT =
  "h-10 w-full rounded-xl border border-[#E8E8E3] bg-white px-3.5 text-[14px] text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#D6D6CF] focus:border-[#fe5c13]";
const SEG_ON = "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
const SEG_OFF = "font-medium text-[#6B7280] hover:text-[#0F1117]";
const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]";

/* ---------- Switch ---------- */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${checked ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
    >
      <span
        className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  );
}

/* ---------- Table sketch: shape sized by seats, chairs around it ---------- */
function seatLayout(cap: number) {
  const c = Math.max(1, Math.min(cap, 20));
  if (c <= 2) return { round: true, w: 52, h: 52, top: c === 1 ? 1 : 0, bottom: 0, left: c === 2 ? 1 : 0, right: c === 2 ? 1 : 0 };
  if (c <= 4) return { round: false, w: 60, h: 60, top: 1, bottom: 1, left: c >= 3 ? 1 : 0, right: c >= 4 ? 1 : 0 };
  const rest = c - 2;
  const top = Math.ceil(rest / 2);
  const bottom = Math.floor(rest / 2);
  return { round: false, w: Math.max(top, 1) * 28 + 16, h: 60, top, bottom, left: 1, right: 1 };
}

export type SketchTone = "idle" | "occupied" | "paid" | "bill" | "cleaning";

const SKETCH_TONES: Record<SketchTone, { table: string; hover: string; chair: string; filled: string; text: string; sub: string }> = {
  idle: { table: "border-[#D6D6CF] bg-white", hover: "group-hover:border-[#fe5c13]", chair: "bg-[#D6D6CF]", filled: "bg-[#D6D6CF]", text: "text-[#0F1117]", sub: "text-[#6B7280]" },
  occupied: { table: "border-[#fe5c13] bg-[#FFF4EC]", hover: "", chair: "bg-[#F8C9AF]", filled: "bg-[#fe5c13]", text: "text-[#0F1117]", sub: "text-[#C2410C]" },
  paid: { table: "border-emerald-500 bg-emerald-50", hover: "", chair: "bg-emerald-200", filled: "bg-emerald-500", text: "text-[#0F1117]", sub: "text-emerald-700" },
  bill: { table: "border-indigo-500 bg-indigo-50", hover: "", chair: "bg-indigo-200", filled: "bg-indigo-500", text: "text-[#0F1117]", sub: "text-indigo-700" },
  cleaning: { table: "border-sky-400 bg-sky-50", hover: "", chair: "bg-sky-200", filled: "bg-sky-200", text: "text-[#0F1117]", sub: "text-sky-700" },
};

export function TableSketch({
  number,
  seats,
  enabled = true,
  onClick,
  title,
  large,
  tone = "idle",
  filledSeats,
  sub,
  maxWidth,
}: {
  number: number | string;
  seats: number;
  enabled?: boolean;
  onClick?: () => void;
  title?: string;
  large?: boolean;
  /** Live status colouring, used on the floor overview. */
  tone?: SketchTone;
  /** How many chairs to draw as taken. Defaults to all chairs when the table is in use. */
  filledSeats?: number;
  /** Second line inside the table. Defaults to "N seats" or "Off". */
  sub?: string;
  /** Shrink wide tables to fit this width. */
  maxWidth?: number;
}) {
  const L = seatLayout(seats);
  const pad = 12;
  const W = L.w + pad * 2;
  const H = L.h + pad * 2;
  const T = SKETCH_TONES[enabled ? tone : "idle"];
  const live = enabled && (tone === "occupied" || tone === "paid" || tone === "bill");
  const taken = live ? Math.min(filledSeats ?? seats, seats) : 0;
  let seatIndex = 0;
  const chairClass = () => {
    const isTaken = seatIndex++ < taken;
    return enabled ? (isTaken ? T.filled : T.chair) : "bg-[#E8E8E3]";
  };
  // Chairs are drawn clockwise so taken seats fill in around the table.
  const chairs: React.ReactNode[] = [];
  for (let i = 0; i < L.top; i++)
    chairs.push(<span key={`t${i}`} className={`absolute h-[6px] w-4 rounded-full ${chairClass()}`} style={{ top: 2, left: pad + ((i + 0.5) * L.w) / L.top - 8 }} />);
  if (L.right) chairs.push(<span key="r" className={`absolute h-4 w-[6px] rounded-full ${chairClass()}`} style={{ left: pad + L.w + 4, top: pad + L.h / 2 - 8 }} />);
  for (let i = L.bottom - 1; i >= 0; i--)
    chairs.push(<span key={`b${i}`} className={`absolute h-[6px] w-4 rounded-full ${chairClass()}`} style={{ top: pad + L.h + 4, left: pad + ((i + 0.5) * L.w) / L.bottom - 8 }} />);
  if (L.left) chairs.push(<span key="l" className={`absolute h-4 w-[6px] rounded-full ${chairClass()}`} style={{ left: 2, top: pad + L.h / 2 - 8 }} />);

  const body = (
    <>
      {chairs}
      <span
        className={`absolute flex flex-col items-center justify-center border transition-colors ${L.round ? "rounded-full" : "rounded-xl"} ${
          enabled ? `${T.table} ${onClick ? T.hover : ""}` : "border-dashed border-[#D6D6CF] bg-[#F3F3EF]"
        }`}
        style={{ left: pad, top: pad, width: L.w, height: L.h }}
      >
        <span className={`text-[13px] font-bold leading-none tabular-nums ${enabled ? T.text : "text-[#9CA3AF]"}`}>
          {typeof number === "number" ? `T${number}` : number}
        </span>
        <span className={`mt-1 max-w-full truncate px-1 text-[10px] leading-none tabular-nums ${enabled ? T.sub : "text-[#9CA3AF]"}`}>
          {sub ?? (enabled ? `${seats} seats` : "Off")}
        </span>
      </span>
    </>
  );
  const fit = maxWidth && W > maxWidth ? maxWidth / W : 1;
  const scale = large ? 1.35 : fit;
  const style: React.CSSProperties = { width: W, height: H, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: "center" };
  const wrap = (node: React.ReactNode) =>
    fit < 1 && !large ? (
      <div className="flex shrink-0 items-center justify-center" style={{ width: W * fit, height: H * fit }}>
        {node}
      </div>
    ) : (
      node
    );

  if (onClick) {
    return wrap(
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className="group relative shrink-0 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40"
        style={style}
      >
        {body}
      </button>
    );
  }
  return wrap(
    <div className="relative shrink-0" style={style} aria-hidden="true">
      {body}
    </div>
  );
}

/* ---------- Main ---------- */
export default function TableManager({ tables, onToggle, onRemove, onUpdateMeta }: Props) {
  const [pendingDelete, setPendingDelete] = React.useState<Table | null>(null);
  const [editingTable, setEditingTable] = React.useState<Table | null>(null);
  const [editFloor, setEditFloor] = React.useState("");
  const [editCounter, setEditCounter] = React.useState("");
  const [editCapacity, setEditCapacity] = React.useState(4);
  const [floorFilter, setFloorFilter] = React.useState<string>("all");
  const [view, setView] = React.useState<"list" | "preview">("list");

  const floors = Array.from(new Set(tables.map(floorOf))).sort();
  const sections = Array.from(new Set(tables.map(sectionOf))).sort();
  const filteredTables = tables
    .filter((t) => floorFilter === "all" || floorOf(t) === floorFilter)
    .sort((a, b) => a.table_number - b.table_number);

  const floorKey = floors.join("|");
  React.useEffect(() => {
    if (floorFilter !== "all" && !floorKey.split("|").includes(floorFilter)) setFloorFilter("all");
  }, [floorKey, floorFilter]);

  const active = tables.filter((t) => t.is_enabled);
  const activeSeats = active.reduce((s, t) => s + seatsOf(t), 0);

  const openEdit = (table: Table) => {
    setEditingTable(table);
    setEditFloor(table.floor_name || "");
    setEditCounter(table.counter_name || "");
    setEditCapacity(table.capacity ?? 4);
  };

  const floorsToDraw = floorFilter === "all" ? floors : floors.filter((f) => f === floorFilter);

  if (tables.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-20 text-center">
        <LayoutGrid className="h-6 w-6 text-[#C4C4BE]" />
        <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No tables yet</p>
        <p className="mt-1 max-w-sm text-[13px] text-[#6B7280]">Add your tables so guests can scan a QR code and staff can take orders against them.</p>
        <Link
          href="/staff/settings/tables/add"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#fe5c13] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Add table
        </Link>
      </section>
    );
  }

  return (
    <>
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white md:grid-cols-4">
        {[
          { label: "Tables in service", value: `${active.length}`, note: `of ${tables.length}` },
          { label: "Seats", value: String(activeSeats), note: "in service" },
          { label: "Floors", value: String(floors.length) },
          { label: "Sections", value: String(sections.length) },
        ].map((k, i) => (
          <div key={k.label} className={`px-6 py-4 ${i > 0 ? "border-l border-[#F0F0EB]" : ""} ${i > 1 ? "border-t border-[#F0F0EB] md:border-t-0" : ""}`}>
            <dt className="text-[12px] font-medium text-[#6B7280]">{k.label}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold tabular-nums tracking-[-0.02em] text-[#0F1117]">{k.value}</span>
              {k.note && <span className="text-[12px] text-[#9CA3AF]">{k.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="Floor">
          {[["all", "All floors"] as const, ...floors.map((f) => [f, f] as const)].map(([id, label]) => {
            const on = floorFilter === id;
            const n = id === "all" ? tables.length : tables.filter((t) => floorOf(t) === id).length;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                onClick={() => setFloorFilter(id)}
                className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[12px] transition-colors ${on ? SEG_ON : SEG_OFF}`}
              >
                {label}
                <span className={`tabular-nums ${on ? "text-[#6B7280]" : "text-[#9CA3AF]"}`}>{n}</span>
              </button>
            );
          })}
        </div>

        <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="tablist" aria-label="View">
          {(
            [
              ["list", "List", List],
              ["preview", "Preview", LayoutGrid],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12px] transition-colors ${view === id ? SEG_ON : SEG_OFF}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <section className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
          {filteredTables.length === 0 ? (
            <p className="px-6 py-16 text-center text-[13px] text-[#6B7280]">No tables on this floor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#F0F0EB] text-[12px] text-[#6B7280]">
                    <th className="px-5 py-3 font-medium">Table</th>
                    <th className="px-5 py-3 font-medium">Seats</th>
                    <th className="px-5 py-3 font-medium">Floor</th>
                    <th className="px-5 py-3 font-medium">Section</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0EB] text-[13px] text-[#4B5563]">
                  {filteredTables.map((table) => (
                    <tr key={table.id ?? `table-${table.table_number}`} className="transition-colors hover:bg-[#FAFAF7]">
                      <td className="px-5 py-3">
                        <span className={`text-[14px] font-semibold tabular-nums ${table.is_enabled ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
                          Table {table.table_number}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 tabular-nums text-[#0F1117]">
                          <Users className="h-3.5 w-3.5 text-[#9CA3AF]" />
                          {seatsOf(table)}
                        </span>
                      </td>
                      <td className="px-5 py-3">{floorOf(table)}</td>
                      <td className="px-5 py-3">{sectionOf(table)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            checked={table.is_enabled}
                            onChange={() => onToggle(table.id)}
                            label={`Table ${table.table_number} in service`}
                          />
                          <span className={`w-16 text-[12px] font-medium ${table.is_enabled ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
                            {table.is_enabled ? "In service" : "Off"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          <button onClick={() => openEdit(table)} className={ICON_BTN} aria-label={`Edit table ${table.table_number}`} title="Edit table">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDelete(table)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600"
                            aria-label={`Archive table ${table.table_number}`}
                            title="Archive table"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-5">
          {floorsToDraw.map((floor) => {
            const onFloor = tables.filter((t) => floorOf(t) === floor).sort((a, b) => a.table_number - b.table_number);
            const floorSections = Array.from(new Set(onFloor.map(sectionOf))).sort();
            const seats = onFloor.filter((t) => t.is_enabled).reduce((s, t) => s + seatsOf(t), 0);
            return (
              <section key={floor} className="rounded-2xl border border-[#E8E8E3] bg-white">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#F0F0EB] px-6 py-4">
                  <h3 className="text-[15px] font-semibold text-[#0F1117]">{floor}</h3>
                  <p className="text-[12px] tabular-nums text-[#6B7280]">
                    {onFloor.length} {onFloor.length === 1 ? "table" : "tables"}, {seats} seats in service
                  </p>
                </div>
                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  {floorSections.map((sec) => {
                    const list = onFloor.filter((t) => sectionOf(t) === sec);
                    return (
                      <div key={sec} className="rounded-xl border border-[#F0F0EB] bg-[#FAFAF7] p-4">
                        <p className="mb-3 text-[12px] font-medium text-[#6B7280]">
                          {sec} <span className="text-[#9CA3AF]">{list.length}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          {list.map((t) => (
                            <TableSketch
                              key={t.id ?? t.table_number}
                              number={t.table_number}
                              seats={seatsOf(t)}
                              enabled={t.is_enabled}
                              onClick={() => openEdit(t)}
                              title={`Table ${t.table_number}, ${seatsOf(t)} seats${t.is_enabled ? "" : ", off"}. Click to edit.`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12px] text-[#6B7280]">
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-[#D6D6CF] bg-white" /> In service
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded border border-dashed border-[#D6D6CF] bg-[#F3F3EF]" /> Off
            </span>
            <span className="text-[#9CA3AF]">Tables are grouped by section and sized by seats. Click one to edit it.</span>
          </div>
        </div>
      )}

      <datalist id="floor-options">
        {floors.map((f) => <option key={f} value={f} />)}
      </datalist>
      <datalist id="counter-options">
        {sections.map((c) => <option key={c} value={c} />)}
      </datalist>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Archive this table?"
        message={
          pendingDelete
            ? `Table ${pendingDelete.table_number} will be taken off your floor plan.`
            : "Archive this table?"
        }
        confirmText="Archive table"
        cancelText="Keep table"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.id) onRemove(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      {editingTable && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F1117]/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Edit table ${editingTable.table_number}`}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white shadow-[0_24px_60px_-20px_rgba(15,17,23,0.35)]">
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div>
                <h3 className="text-[17px] font-bold text-[#0F1117]">Table {editingTable.table_number}</h3>
                <p className="mt-1 text-[13px] text-[#6B7280]">Change where it sits and how many it seats.</p>
              </div>
              <button onClick={() => setEditingTable(null)} className={`${ICON_BTN} -mr-2 -mt-1`} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 px-6 pt-5 sm:grid-cols-[1fr_168px]">
              <div className="space-y-4">
                <div>
                  <label htmlFor="tbl-floor" className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">Floor</label>
                  <input
                    id="tbl-floor"
                    list="floor-options"
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    placeholder="Main Floor, Rooftop"
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor="tbl-section" className="mb-1.5 block text-[13px] font-medium text-[#4B5563]">Section</label>
                  <input
                    id="tbl-section"
                    list="counter-options"
                    value={editCounter}
                    onChange={(e) => setEditCounter(e.target.value)}
                    placeholder="Counter A, Bar, Patio"
                    className={INPUT}
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[13px] font-medium text-[#4B5563]">Seats</p>
                  <div className="inline-flex h-10 items-center overflow-hidden rounded-xl border border-[#E8E8E3] bg-white">
                    <button
                      type="button"
                      onClick={() => setEditCapacity((c) => Math.max(1, c - 1))}
                      disabled={editCapacity <= 1}
                      aria-label="Fewer seats"
                      className="flex h-full w-10 items-center justify-center text-[#4B5563] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117] disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 border-x border-[#E8E8E3] text-center text-[15px] font-semibold leading-10 tabular-nums text-[#0F1117]" aria-live="polite">
                      {editCapacity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditCapacity((c) => Math.min(100, c + 1))}
                      aria-label="More seats"
                      className="flex h-full w-10 items-center justify-center text-[#4B5563] transition-colors hover:bg-[#F3F3EF] hover:text-[#0F1117]"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[2, 4, 6, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEditCapacity(n)}
                        aria-pressed={editCapacity === n}
                        className={`h-7 rounded-lg border px-2.5 text-[12px] font-medium tabular-nums transition-colors ${editCapacity === n ? "border-[#fe5c13] bg-[#FFF4EC] text-[#0F1117]" : "border-[#E8E8E3] text-[#4B5563] hover:border-[#D6D6CF]"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col rounded-xl border border-[#F0F0EB] bg-[#FAFAF7]">
                <p className="px-3 pt-3 text-[12px] font-medium text-[#6B7280]">Preview</p>
                <div className="flex min-h-[150px] flex-1 items-center justify-center overflow-hidden px-2 py-4">
                  <TableSketch number={editingTable.table_number} seats={editCapacity} enabled={editingTable.is_enabled} large={editCapacity <= 6} />
                </div>
                <p className="truncate border-t border-[#F0F0EB] px-3 py-2 text-[11px] text-[#6B7280]">
                  {editFloor.trim() || DEFAULT_FLOOR}, {editCounter.trim() || DEFAULT_SECTION}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2 border-t border-[#F0F0EB] px-6 py-4">
              <button
                onClick={() => setEditingTable(null)}
                className="h-10 flex-1 rounded-xl border border-[#E8E8E3] bg-white text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateMeta(
                    editingTable.id,
                    editFloor.trim() || DEFAULT_FLOOR,
                    editCounter.trim() || DEFAULT_SECTION,
                    editCapacity
                  );
                  setEditingTable(null);
                }}
                className="h-10 flex-1 rounded-xl bg-[#fe5c13] text-[14px] font-semibold text-white transition-colors hover:bg-[#e44e0b]"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
