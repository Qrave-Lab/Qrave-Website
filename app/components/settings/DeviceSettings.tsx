import React, { useEffect, useState } from "react";
import { Printer, ArrowRight, Receipt, Plus, Trash2, TestTube2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  loadPrinterProfiles,
  savePrinterProfiles,
  printTicket,
  type PrinterChannel,
  type PrinterMode,
  type PrinterProfile,
} from "@/app/lib/posPrinter";

const CHANNELS: PrinterChannel[] = ["kitchen", "billing", "bar"];
const MODES: PrinterMode[] = ["system", "serial"];

function channelLabel(channel: PrinterChannel): string {
  if (channel === "kitchen") return "Kitchen";
  if (channel === "billing") return "Billing";
  return "Bar";
}

export default function DeviceSettings() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PrinterProfile[]>([]);
  const [isTestingId, setIsTestingId] = useState<string>("");

  useEffect(() => {
    setProfiles(loadPrinterProfiles());
  }, []);

  const updateProfiles = (next: PrinterProfile[]) => {
    setProfiles(next);
    savePrinterProfiles(next);
  };

  const addProfile = () => {
    const id = `printer-${Date.now()}`;
    const next: PrinterProfile[] = [
      {
        id,
        name: "New Printer",
        channel: "kitchen",
        mode: "system",
        baudRate: 9600,
        enabled: true,
        updatedAt: Date.now(),
      },
      ...profiles,
    ];
    updateProfiles(next);
  };

  const patchProfile = (id: string, patch: Partial<PrinterProfile>) => {
    const current = profiles.find((p) => p.id === id);
    const nextChannel = (patch.channel ?? current?.channel ?? "kitchen") as PrinterChannel;
    const nextEnabled = patch.enabled ?? current?.enabled ?? true;

    const next = profiles.map((p) => {
      if (p.id === id) {
        return { ...p, ...patch, channel: nextChannel, enabled: nextEnabled, updatedAt: Date.now() };
      }
      if (nextEnabled && p.channel === nextChannel) {
        return { ...p, enabled: false };
      }
      return p;
    });
    updateProfiles(next);
  };

  const deleteProfile = (id: string) => {
    const next = profiles.filter((p) => p.id !== id);
    updateProfiles(next.length > 0 ? next : loadPrinterProfiles());
  };

  const testProfile = async (profile: PrinterProfile) => {
    setIsTestingId(profile.id);
    try {
      const original = profiles.map((p) => ({ ...p }));
      const reassigned = profiles.map((p) =>
        p.id === profile.id
          ? { ...p, enabled: true, updatedAt: Date.now() }
          : p.channel === profile.channel
            ? { ...p, enabled: false }
            : p
      );
      updateProfiles(reassigned);

      await printTicket(
        profile.channel,
        "Printer Test",
        [
          "QRAVE PRINTER TEST",
          "------------------------------",
          `Printer: ${profile.name}`,
          `Channel: ${channelLabel(profile.channel)}`,
          `Mode   : ${profile.mode.toUpperCase()}`,
          `Time   : ${new Date().toLocaleString()}`,
          "------------------------------",
          "If this prints, setup is good.",
        ].join("\n"),
      );
      toast.success("Test ticket sent");

      updateProfiles(
        reassigned.map((p) =>
          p.id === profile.id ? { ...p, enabled: true, updatedAt: Date.now() } : p
        )
      );
      savePrinterProfiles(loadPrinterProfiles());
      void original;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test print failed";
      toast.error(msg);
    } finally {
      setIsTestingId("");
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Printer className="w-5 h-5 text-gray-500" /> POS Printers
        </h2>
        <button
          type="button"
          onClick={addProfile}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Printer
        </button>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => (
          <div key={p.id} className="p-3 border border-gray-200 rounded-xl bg-gray-50/40">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                value={p.name}
                onChange={(e) => patchProfile(p.id, { name: e.target.value })}
                className="md:col-span-2 h-9 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <select
                value={p.channel}
                onChange={(e) => patchProfile(p.id, { channel: e.target.value as PrinterChannel })}
                className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white"
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {channelLabel(c)}
                  </option>
                ))}
              </select>
              <select
                value={p.mode}
                onChange={(e) => patchProfile(p.id, { mode: e.target.value as PrinterMode })}
                className="h-9 rounded-lg border border-slate-200 px-2 text-sm bg-white"
              >
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "system" ? "System" : "Serial ESC/POS"}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1200}
                step={300}
                value={p.baudRate}
                onChange={(e) => patchProfile(p.id, { baudRate: Number(e.target.value) || 9600 })}
                disabled={p.mode !== "serial"}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm disabled:bg-gray-100"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patchProfile(p.id, { enabled: !p.enabled })}
                  className={`h-9 px-2 rounded-lg text-xs font-bold border ${p.enabled
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-500"
                    }`}
                >
                  {p.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteProfile(p.id)}
                  className="h-9 w-9 rounded-lg border border-rose-200 text-rose-600 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Assign one active printer per channel (Kitchen/Billing/Bar).
              </p>
              <button
                type="button"
                onClick={() => testProfile(p)}
                disabled={isTestingId === p.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold disabled:opacity-60"
              >
                <TestTube2 className="w-3.5 h-3.5" />
                {isTestingId === p.id ? "Testing..." : "Test"}
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => router.push("/staff/settings/qr-codes")}
          className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">QR Codes</p>
              <p className="text-xs text-gray-500">Manage table QR generation</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
        </button>
      </div>
    </section>
  );
}
