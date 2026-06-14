import React, { useEffect, useState } from "react";
import { Printer, ArrowRight, Receipt, Plus, Trash2, TestTube2, QrCode } from "lucide-react";
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
    <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
      {/* Sticky action bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">POS Hardware</p>
          <h2 className="text-sm font-black text-slate-900 mt-0.5">Printers & Connected Devices</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/staff/settings/qr-codes")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-500" />
            Table QR Flyers
          </button>
          <button
            type="button"
            onClick={addProfile}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Printer
          </button>
        </div>
      </div>

      {/* Main content table area */}
      <div className="flex-1 bg-white overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100">
            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-8 py-3.5">Printer Name</th>
              <th className="px-8 py-3.5">Print Channel</th>
              <th className="px-8 py-3.5">Connection Mode</th>
              <th className="px-8 py-3.5">Target Device / Speed</th>
              <th className="px-8 py-3.5">Status & Action</th>
              <th className="px-8 py-3.5 text-right">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profiles.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-2.5">
                    <Printer className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      value={p.name}
                      onChange={(e) => patchProfile(p.id, { name: e.target.value })}
                      className="w-full max-w-[200px] h-9 rounded-xl border border-slate-250 px-3 text-sm focus:border-[#fe5c13] focus:ring-1 focus:ring-[#fe5c13] outline-none transition-all"
                      placeholder="e.g. Kitchen Printer"
                    />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <select
                    value={p.channel}
                    onChange={(e) => patchProfile(p.id, { channel: e.target.value as PrinterChannel })}
                    className="h-9 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:border-[#fe5c13] focus:ring-1 focus:ring-[#fe5c13] outline-none transition-all"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {channelLabel(c)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-8 py-4">
                  <select
                    value={p.mode}
                    onChange={(e) => patchProfile(p.id, { mode: e.target.value as PrinterMode })}
                    className="h-9 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:border-[#fe5c13] focus:ring-1 focus:ring-[#fe5c13] outline-none transition-all"
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m}>
                        {m === "system" ? "System Printer" : "Serial ESC/POS"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-8 py-4">
                  {p.mode === "system" ? (
                    <span className="text-xs text-slate-400 font-medium">Browser Print Fallback</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1200}
                        step={300}
                        value={p.baudRate}
                        onChange={(e) => patchProfile(p.id, { baudRate: Number(e.target.value) || 9600 })}
                        className="w-24 h-9 rounded-xl border border-slate-200 px-3 text-sm focus:border-[#fe5c13] focus:ring-1 focus:ring-[#fe5c13] outline-none transition-all"
                      />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Baud</span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => patchProfile(p.id, { enabled: !p.enabled })}
                      className={`h-9 px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                        p.enabled
                          ? "bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100/50"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {p.enabled ? "Active" : "Inactive"}
                    </button>
                    <button
                      type="button"
                      onClick={() => testProfile(p)}
                      disabled={isTestingId === p.id}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold disabled:opacity-60 transition-colors"
                    >
                      <TestTube2 className="w-3.5 h-3.5 text-slate-400" />
                      {isTestingId === p.id ? "Testing..." : "Test"}
                    </button>
                  </div>
                </td>
                <td className="px-8 py-4 text-right">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteProfile(p.id)}
                      className="h-9 w-9 rounded-xl border border-rose-100 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info footer */}
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2 shrink-0">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>Assign one active printer per channel (Kitchen/Billing/Bar).</span>
      </div>
    </div>
  );
}
