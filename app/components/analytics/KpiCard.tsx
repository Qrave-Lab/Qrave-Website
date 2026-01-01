import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
};

export default function KpiCard({ icon: Icon, label, value, delta }: Props) {
  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <div className="flex justify-between mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon className="w-6 h-6" />
        </div>
        {delta !== undefined && (
          <span
            className={`flex items-center gap-1 text-xs font-bold ${
              delta >= 0 ? "text-green-600" : "text-rose-600"
            }`}
          >
            {delta >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}
