import { Smartphone, CreditCard, Banknote } from "lucide-react";

export const stats = {
  daily: {
    revenue: 24500,
    orders: 42,
    avgValue: 583,
    growth: -12.5,
    chartData: [15, 30, 45, 80, 55, 60, 90],
    labels: ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm"],
    peakHour: "8:00 PM",
    anomaly: true,
  },
  weekly: {
    revenue: 184500,
    orders: 310,
    avgValue: 595,
    growth: 4.2,
    chartData: [60, 55, 70, 80, 95, 85, 60],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    peakHour: "Friday 7:00 PM",
    anomaly: false,
  },
  monthly: {
    revenue: 845000,
    orders: 1250,
    avgValue: 676,
    growth: 8.1,
    chartData: [40, 45, 60, 75],
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    peakHour: "Week 3",
    anomaly: false,
  },
};

export const paymentMethods = [
  { method: "UPI", percent: 65, amount: 15925, icon: Smartphone, color: "bg-blue-500" },
  { method: "Card", percent: 25, amount: 6125, icon: CreditCard, color: "bg-purple-500" },
  { method: "Cash", percent: 10, amount: 2450, icon: Banknote, color: "bg-emerald-500" },
];

export const topItems = [
  { name: "Chicken Biryani", sold: 45, revenue: 11250 },
  { name: "Butter Naan", sold: 120, revenue: 6000 },
];

export const underperformingItems = [
  { name: "Lamb Stew", reason: "Low Sales", action: "Review" },
];

export const recentTransactions = [
  { id: "TRX-998", time: "10:42 AM", table: "T4", total: 2100, method: "UPI" },
];
