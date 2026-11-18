import React, { useEffect, useState } from "react";
import { ChefHat, ChevronRight, Info, Loader2, Printer, QrCode, ReceiptText, Trash2, Wine } from "lucide-react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
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

import { Select } from "@/app/components/ui/Select";
const CHANNELS: PrinterChannel[] = ["kitchen", "billing", "bar"];
const MODES: PrinterMode[] = ["system", "serial"];

function channelLabel(channel: PrinterChannel): string {
  if (channel === "kitchen") return "Kitchen";
  if (channel === "billing") return "Billing";
  return "Bar";
}

const CHANNEL_META: Record<PrinterChannel, { icon: React.ElementType; hint: string }> = {
  kitchen: { icon: ChefHat, hint: "Order tickets for the cooks" },
  billing: { icon: ReceiptText, hint: "Customer bills and receipts" },
  bar: { icon: Wine, hint: "Drink orders for the bar" },
};

const SEG_ON = "bg-white font-semibold text-[#0F1117] shadow-[0_1px_2px_rgba(15,17,23,0.06)]";
const SEG_OFF = "font-medium text-[#6B7280] hover:text-[#0F1117]";

/** Exposed so the page header can trigger "Add printer". */
export const ADD_PRINTER_EVENT = "qrave:add-printer";

export default function DeviceSettings() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<PrinterProfile[]>([]);
  const [isTestingId, setIsTestingId] = useState<string>("");
  const [pendingDelete, setPendingDelete] = useState<PrinterProfile | null>(null);

  useEffect(() => {
    setProfiles(loadPrinterProfiles());
  }, []);

  useEffect(() => {
    const onAdd = () => addProfile();
    window.addEventListener(ADD_PRINTER_EVENT, onAdd);
    return () => window.removeEventListener(ADD_PRINTER_EVENT, onAdd);
  });

  const updateProfiles = (next: PrinterProfile[]) => {
    setProfiles(next);
    savePrinterProfiles(next);
  };

  const addProfile = () => {
    const id = `printer-${Date.now()}`;
    const next: PrinterProfile[] = [
      {
        id,
        name: "New printer",
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
      toast.success("Test ticket sent to the printer");

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

  const activeFor = (c: PrinterChannel) => profiles.find((p) => p.channel === c && p.enabled);

  return (
    <>
      {/* Stations */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-[#0F1117]">Print stations</h2>
          <p className="text-[12px] text-[#9CA3AF]">Each station uses one printer at a time.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHANNELS.map((c) => {
            const active = activeFor(c);
            const Icon = CHANNEL_META[c].icon;
            return (
              <div key={c} className="rounded-2xl border border-[#E8E8E3] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3F3EF] text-[#4B5563]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#0F1117]">{channelLabel(c)}</p>
                    <p className="text-[12px] text-[#6B7280]">{CHANNEL_META[c].hint}</p>
                  </div>
                </div>
                <div className="mt-3 border-t border-[#F0F0EB] pt-3">
                  {active ? (
                    <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-[#0F1117]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {active.name || "Unnamed printer"}
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[13px] font-medium text-amber-700">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      No printer in use
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Printers */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold text-[#0F1117]">Printers</h2>
            <span className="rounded-full bg-[#F3F3EF] px-2.5 py-1 text-[12px] font-medium leading-none tabular-nums text-[#6B7280]">{profiles.length}</span>
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-[#9CA3AF]">
            <Info className="h-3.5 w-3.5" /> Saved on this computer only. Set up each till separately.
          </p>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E8E8E3] bg-white px-6 py-16 text-center">
            <Printer className="h-6 w-6 text-[#C4C4BE]" />
            <p className="mt-3 text-[15px] font-semibold text-[#0F1117]">No printers set up</p>
            <p className="mt-1 text-[13px] text-[#6B7280]">Add the printers connected to this computer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-[#E8E8E3] bg-white">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.enabled ? "bg-[#F3F3EF] text-[#4B5563]" : "bg-[#FAFAF7] text-[#C4C4BE]"}`}>
                    <Printer className="h-4 w-4" />
                  </span>
                  <input
                    value={p.name}
                    onChange={(e) => patchProfile(p.id, { name: e.target.value })}
                    aria-label="Printer name"
                    placeholder="Kitchen printer"
                    className="h-9 min-w-[180px] flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[15px] font-semibold text-[#0F1117] outline-none transition-colors placeholder:text-[#9CA3AF] hover:border-[#E8E8E3] focus:border-[#fe5c13] focus:bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-medium ${p.enabled ? "text-[#0F1117]" : "text-[#9CA3AF]"}`}>
                      {p.enabled ? `In use for ${channelLabel(p.channel).toLowerCase()}` : "Not in use"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.enabled}
                      aria-label={`Use ${p.name || "this printer"}`}
                      onClick={() => patchProfile(p.id, { enabled: !p.enabled })}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40 focus-visible:ring-offset-2 ${p.enabled ? "bg-[#fe5c13]" : "bg-[#D6D6CF]"}`}
                    >
                      <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,23,0.2)] transition-transform ${p.enabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-[#F0F0EB] px-5 py-4 md:grid-cols-[auto_auto_1fr] md:items-end">
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-[#6B7280]">Station</p>
                    <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="Station">
                      {CHANNELS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          role="radio"
                          aria-checked={p.channel === c}
                          onClick={() => patchProfile(p.id, { channel: c })}
                          className={`flex h-7 items-center rounded-lg px-3 text-[12px] transition-colors ${p.channel === c ? SEG_ON : SEG_OFF}`}
                        >
                          {channelLabel(c)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-[#6B7280]">Connection</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex h-9 items-center gap-0.5 rounded-xl bg-[#F3F3EF] p-1" role="radiogroup" aria-label="Connection">
                        {MODES.map((m) => (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={p.mode === m}
                            onClick={() => patchProfile(p.id, { mode: m })}
                            className={`flex h-7 items-center whitespace-nowrap rounded-lg px-3 text-[12px] transition-colors ${p.mode === m ? SEG_ON : SEG_OFF}`}
                          >
                            {m === "system" ? "Browser print" : "USB or serial"}
                          </button>
                        ))}
                      </div>
                      {p.mode === "serial" && (
                        <div className="flex h-9 overflow-hidden rounded-xl border border-[#E8E8E3] bg-white focus-within:border-[#fe5c13]">
                          <input
                            type="number"
                            min={1200}
                            step={300}
                            value={p.baudRate}
                            onChange={(e) => patchProfile(p.id, { baudRate: Number(e.target.value) || 9600 })}
                            aria-label="Baud rate"
                            className="w-20 bg-transparent px-3 text-[13px] tabular-nums text-[#0F1117] outline-none"
                          />
                          <span className="flex items-center border-l border-[#E8E8E3] bg-[#F3F3EF] px-2.5 text-[12px] text-[#6B7280]">baud</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => testProfile(p)}
                      disabled={isTestingId === p.id}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#E8E8E3] bg-white px-3 text-[13px] font-semibold text-[#374151] transition-colors hover:border-[#D6D6CF] hover:text-[#0F1117] disabled:opacity-60"
                    >
                      {isTestingId === p.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Printing</> : <><Printer className="h-4 w-4 text-[#6B7280]" /> Print test</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(p)}
                      aria-label={`Remove ${p.name || "printer"}`}
                      title="Remove printer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#9CA3AF] transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="border-t border-[#F0F0EB] bg-[#FAFAF7] px-5 py-2.5 text-[12px] text-[#6B7280]">
                  {p.mode === "system"
                    ? "Uses the print window of this browser. Works with any printer your computer can print to."
                    : "Talks to a thermal printer directly over USB or serial. Chrome or Edge will ask which port to use the first time."}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* QR codes */}
      <button
        type="button"
        onClick={() => router.push("/staff/settings/qr-codes")}
        className="group flex w-full items-center gap-4 rounded-2xl border border-[#E8E8E3] bg-white p-5 text-left transition-colors hover:border-[#D6D6CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fe5c13]/40"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F3EF] text-[#4B5563] transition-colors group-hover:bg-[#FFF4EC] group-hover:text-[#fe5c13]">
          <QrCode className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[#0F1117]">Table QR codes</span>
          <span className="mt-0.5 block text-[13px] text-[#6B7280]">Design and print the QR flyers guests scan to see your menu.</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#C4C4BE] transition-colors group-hover:text-[#0F1117]" />
      </button>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Remove this printer?"
        message={pendingDelete ? `${pendingDelete.name || "This printer"} will be removed from this computer.` : ""}
        confirmText="Remove printer"
        cancelText="Keep printer"
        destructive
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteProfile(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
