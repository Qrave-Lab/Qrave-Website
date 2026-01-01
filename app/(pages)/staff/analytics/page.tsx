// "use client";

// import React, { useState, useEffect } from "react";
// import StaffSidebar from "../../../components/StaffSidebar"; 
// import { 
//   Download, 
//   TrendingUp, 
//   TrendingDown, 
//   DollarSign, 
//   Users, 
//   ShoppingBag,
//   AlertTriangle,
//   Calendar,
//   CreditCard,
//   Smartphone,
//   Banknote,
//   Lock,
//   X
// } from "lucide-react";

// type TimeRange = "daily" | "weekly" | "monthly" | "custom";
// type UserRole = "owner" | "manager" | "staff";

// const stats = {
//   daily: { 
//     revenue: 24500, 
//     orders: 42, 
//     avgValue: 583, 
//     growth: -12.5, 
//     chartData: [15, 30, 45, 80, 55, 60, 90, 85, 40, 30, 20, 10],
//     labels: ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm", "12am"],
//     peakHour: "8:00 PM - 9:00 PM",
//     anomaly: true 
//   },
//   weekly: { 
//     revenue: 184500, 
//     orders: 310, 
//     avgValue: 595, 
//     growth: 4.2,
//     chartData: [60, 55, 70, 80, 95, 85, 60],
//     labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
//     peakHour: "Friday 7:00 PM",
//     anomaly: false
//   },
//   monthly: { 
//     revenue: 845000, 
//     orders: 1250, 
//     avgValue: 676, 
//     growth: 8.1,
//     chartData: [40, 45, 60, 75],
//     labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
//     peakHour: "Week 3 (Friday)",
//     anomaly: false
//   },
// };

// const paymentMethods = [
//   { method: "UPI", percent: 65, amount: 15925, icon: Smartphone, color: "bg-blue-500" },
//   { method: "Card", percent: 25, amount: 6125, icon: CreditCard, color: "bg-purple-500" },
//   { method: "Cash", percent: 10, amount: 2450, icon: Banknote, color: "bg-emerald-500" },
// ];

// const topItems = [
//   { name: "Chicken Biryani", sold: 45, revenue: 11250 },
//   { name: "Butter Naan", sold: 120, revenue: 6000 },
//   { name: "Paneer Tikka", sold: 30, revenue: 5400 },
//   { name: "Mojito", sold: 55, revenue: 4950 },
//   { name: "Grilled Fish", sold: 12, revenue: 3600 },
// ];

// const underperformingItems = [
//   { name: "Lamb Stew", reason: "Low Sales (2 units)", action: "Consider Removal" },
//   { name: "Avocado Salad", reason: "High Waste / Low Margin", action: "Review Cost" },
// ];

// const recentTransactions = [
//   { id: "TRX-998", time: "10:42 AM", table: "T4", items: 5, total: 2100, method: "UPI" },
//   { id: "TRX-997", time: "10:38 AM", table: "T1", items: 2, total: 850, method: "Cash" },
//   { id: "TRX-996", time: "10:15 AM", table: "T8", items: 8, total: 4200, method: "Card" },
//   { id: "TRX-995", time: "09:55 AM", table: "T2", items: 1, total: 250, method: "UPI" },
//   { id: "TRX-994", time: "09:40 AM", table: "T5", items: 3, total: 1250, method: "Card" },
// ];

// export default function AnalyticsPage() {
//   const [timeRange, setTimeRange] = useState<TimeRange>("daily");
//   const [userRole] = useState<UserRole>("owner"); 
//   const [mounted, setMounted] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [customDates, setCustomDates] = useState({ start: "", end: "" });

//   useEffect(() => { setMounted(true); }, []);

//   const currentStats = stats[timeRange === "custom" ? "daily" : timeRange]; 

//   const handleExportCSV = () => {
//     const metaData = [
//       `Report Generated: ${new Date().toLocaleString()}`,
//       `Time Range: ${timeRange.toUpperCase()}`,
//       `Role Access: ${userRole.toUpperCase()}`,
//       "" 
//     ];
    
//     const headers = "Transaction ID,Time,Table,Items,Total,Payment Method";
//     const rows = recentTransactions.map(t => 
//       `${t.id},${t.time},${t.table},${t.items},${t.total},${t.method}`
//     );
    
//     const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [...metaData, headers, ...rows].join("\n");
//     const encodedUri = encodeURI(csvContent);
//     const link = document.createElement("a");
//     link.setAttribute("href", encodedUri);
//     link.setAttribute("download", `noir_financials_${timeRange}_${new Date().toISOString().slice(0,10)}.csv`);
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   if (userRole === "staff") {
//     return (
//       <div className="flex h-screen bg-gray-50 font-sans">
//         <StaffSidebar />
//         <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
//           <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
//             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
//               <Lock className="w-8 h-8" />
//             </div>
//             <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
//             <p className="text-gray-500 mb-6">Staff members do not have permission to view financial analytics.</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
//       <StaffSidebar />

//       <div className="flex-1 flex flex-col min-w-0">

//         <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shrink-0 z-20 relative">
//           <div>
//             <h1 className="text-xl font-bold text-gray-900">Financial Reports</h1>
//             <p className="text-xs text-gray-500 mt-1">
//               Sales performance • <span className="text-emerald-600 font-medium">Verified Owner Access</span>
//             </p>
//           </div>
          
//           <div className="flex items-center gap-4">
            
//             <div className="relative">
//               <div className="flex bg-gray-100 p-1 rounded-lg">
//                 {(["daily", "weekly", "monthly"] as const).map((range) => (
//                   <button
//                     key={range}
//                     onClick={() => { setTimeRange(range); setShowDatePicker(false); }}
//                     className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all
//                       ${timeRange === range ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}
//                     `}
//                   >
//                     {range}
//                   </button>
//                 ))}
//                 <button 
//                   onClick={() => { setTimeRange("custom"); setShowDatePicker(!showDatePicker); }}
//                   className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-all
//                     ${timeRange === "custom" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}
//                   `}
//                 >
//                   <Calendar className="w-3 h-3" /> Custom
//                 </button>
//               </div>

//               {showDatePicker && timeRange === "custom" && (
//                 <div className="absolute top-full right-0 mt-3 bg-white p-4 rounded-xl shadow-xl border border-gray-200 w-72 z-50">
//                    <div className="flex justify-between items-center mb-4">
//                       <h4 className="text-sm font-bold text-gray-900">Select Range</h4>
//                       <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
//                         <X className="w-4 h-4" />
//                       </button>
//                    </div>
//                    <div className="space-y-3">
//                       <div>
//                         <label className="text-xs font-semibold text-gray-500 block mb-1">Start Date</label>
//                         <input 
//                           type="date" 
//                           value={customDates.start}
//                           onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
//                           className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-xs font-semibold text-gray-500 block mb-1">End Date</label>
//                         <input 
//                           type="date" 
//                           value={customDates.end}
//                           onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
//                           className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
//                         />
//                       </div>
//                       <button 
//                         onClick={() => setShowDatePicker(false)}
//                         className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg mt-2 transition-colors"
//                       >
//                         Apply Filter
//                       </button>
//                    </div>
//                 </div>
//               )}
//             </div>
            
//             <button 
//               onClick={handleExportCSV}
//               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
//             >
//               <Download className="w-4 h-4" />
//               Export
//             </button>
//           </div>
//         </header>

//         <main className="flex-1 overflow-y-auto p-8 z-10">
//           <div className="max-w-7xl mx-auto w-full space-y-6">

//             {currentStats.anomaly && (
//               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
//                 <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
//                 <div>
//                   <h3 className="text-sm font-bold text-amber-900">Revenue Alert</h3>
//                   <p className="text-sm text-amber-700 mt-1">
//                     Revenue is <span className="font-bold">12.5% lower</span> than the same time yesterday. Check table turnover or operational delays.
//                   </p>
//                 </div>
//               </div>
//             )}
            
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
//                 <div className="flex justify-between items-start mb-4">
//                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
//                     <DollarSign className="w-6 h-6" />
//                   </div>
//                   <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${currentStats.growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
//                     {currentStats.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
//                     {Math.abs(currentStats.growth)}%
//                   </span>
//                 </div>
//                 <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
//                 <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{currentStats.revenue.toLocaleString()}</h3>
//                 <p className="text-xs text-gray-400 mt-2">vs. previous period</p>
//               </div>

//               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
//                 <div className="flex justify-between items-start mb-4">
//                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
//                     <ShoppingBag className="w-6 h-6" />
//                   </div>
//                 </div>
//                 <p className="text-sm text-gray-500 font-medium">Total Orders</p>
//                 <h3 className="text-3xl font-bold text-gray-900 mt-1">{currentStats.orders.toLocaleString()}</h3>
//                 <p className="text-xs text-gray-400 mt-2">Volume trend stable</p>
//               </div>

//               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
//                 <div className="flex justify-between items-start mb-4">
//                   <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
//                     <Users className="w-6 h-6" />
//                   </div>
//                 </div>
//                 <p className="text-sm text-gray-500 font-medium">Avg. Order Value</p>
//                 <h3 className="text-3xl font-bold text-gray-900 mt-1">₹{currentStats.avgValue}</h3>
//                 <p className="text-xs text-gray-400 mt-2">+₹12 vs last week</p>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
//               <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between">
//                 <div className="flex justify-between items-center mb-8">
//                   <h3 className="text-lg font-bold text-gray-900">Revenue Trend</h3>
                  
//                   <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
//                     <TrendingUp className="w-3 h-3 text-emerald-600" />
//                     <span className="text-xs font-medium text-gray-600">Peak: <span className="text-gray-900 font-bold">{currentStats.peakHour}</span></span>
//                   </div>
//                 </div>
                
//                 <div className="h-48 flex items-end justify-between gap-3">
//                     {currentStats.chartData.map((height, i) => (
//                       <div key={i} className="w-full bg-gray-50 rounded-t-sm relative group h-full flex items-end">
//                         <div 
//                           style={{ height: mounted ? `${height}%` : '0%' }} 
//                           className="w-full bg-gray-900 rounded-t-sm opacity-80 group-hover:opacity-100 group-hover:bg-emerald-600 transition-all duration-700 ease-out relative"
//                         >
//                           <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg transition-opacity whitespace-nowrap z-10">
//                             ₹{(height * 850).toLocaleString()}
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                 </div>
//                 <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
//                   {currentStats.labels.map((label, i) => (
//                     <span key={i} className="text-[10px] text-gray-400 font-medium w-full text-center">{label}</span>
//                   ))}
//                 </div>
//               </div>

//               <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
//                 <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Methods</h3>
//                 <div className="space-y-6">
//                   {paymentMethods.map((pm) => (
//                     <div key={pm.method}>
//                       <div className="flex justify-between text-sm mb-1">
//                         <span className="flex items-center gap-2 font-medium text-gray-700">
//                           <pm.icon className="w-4 h-4 text-gray-400" /> {pm.method}
//                         </span>
//                         <span className="font-bold text-gray-900">₹{pm.amount.toLocaleString()}</span>
//                       </div>
//                       <div className="w-full bg-gray-100 rounded-full h-2">
//                         <div 
//                           className={`h-2 rounded-full ${pm.color} transition-all duration-1000`} 
//                           style={{ width: mounted ? `${pm.percent}%` : '0%' }}
//                         />
//                       </div>
//                       <p className="text-xs text-gray-400 mt-1 text-right">{pm.percent}% of total</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
//               <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
//                 <div className="p-5 border-b border-gray-100">
//                   <h3 className="font-bold text-gray-900">🏆 Top Performing Items</h3>
//                 </div>
//                 <div className="p-0">
//                   <table className="w-full text-sm text-left">
//                     <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
//                       <tr>
//                         <th className="px-5 py-3 font-medium">Item</th>
//                         <th className="px-5 py-3 font-medium text-right">Sold</th>
//                         <th className="px-5 py-3 font-medium text-right">Revenue</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-50">
//                       {topItems.map((item, i) => (
//                         <tr key={i} className="hover:bg-gray-50/50">
//                           <td className="px-5 py-3 font-medium text-gray-900">{item.name}</td>
//                           <td className="px-5 py-3 text-right text-gray-600">{item.sold}</td>
//                           <td className="px-5 py-3 text-right font-bold text-emerald-600">₹{item.revenue.toLocaleString()}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>

//               <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
//                 <div className="p-5 border-b border-gray-100 flex justify-between items-center">
//                   <h3 className="font-bold text-gray-900">⚠️ Needs Attention</h3>
//                   <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold">Low Margin / Vol</span>
//                 </div>
//                 <div className="p-5 space-y-4">
//                   {underperformingItems.map((item, i) => (
//                     <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
//                       <div>
//                         <p className="font-bold text-gray-900 text-sm">{item.name}</p>
//                         <p className="text-xs text-red-500 mt-0.5">{item.reason}</p>
//                       </div>
//                       <button className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 font-medium text-gray-600">
//                         {item.action}
//                       </button>
//                     </div>
//                   ))}
//                   <div className="pt-2 text-center">
//                     <p className="text-xs text-gray-400">Regularly prune these items to improve food costs.</p>
//                   </div>
//                 </div>
//               </div>

//             </div>

//             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
//               <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
//                 <h3 className="font-bold text-gray-900">Recent Transactions</h3>
//                 <button className="text-xs text-blue-600 font-bold hover:underline">View All</button>
//               </div>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm text-left">
//                   <thead className="bg-gray-50 text-gray-500 font-medium">
//                     <tr>
//                       <th className="px-6 py-3 whitespace-nowrap">ID</th>
//                       <th className="px-6 py-3 whitespace-nowrap">Time</th>
//                       <th className="px-6 py-3 whitespace-nowrap">Table</th>
//                       <th className="px-6 py-3 whitespace-nowrap">Total</th>
//                       <th className="px-6 py-3 whitespace-nowrap">Method</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-100">
//                     {recentTransactions.map((trx) => (
//                       <tr key={trx.id} className="hover:bg-gray-50/50">
//                         <td className="px-6 py-4 font-medium text-gray-900">{trx.id}</td>
//                         <td className="px-6 py-4 text-gray-500">{trx.time}</td>
//                         <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{trx.table}</span></td>
//                         <td className="px-6 py-4 font-bold text-gray-900">₹{trx.total}</td>
//                         <td className="px-6 py-4 text-gray-500">{trx.method}</td>
//                       </tr> 
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }



"use client";

import React, { useState, useEffect } from "react";
import StaffSidebar from "../../../components/StaffSidebar";
import KpiCard from "@/app/components/analytics/KpiCard";
import RevenueChart from "@/app/components/analytics/RevenueChart";
import PaymentBreakdown from "@/app/components/analytics/PaymentBreakdown";
import TopItemsTable from "@/app/components/analytics/TopItemsTable";
import AttentionItems from "@/app/components/analytics/AttentionItems";
import RecentTransactionsTable from "@/app/components/analytics/RecentTransactionsTable";
import { stats, paymentMethods, topItems, underperformingItems, recentTransactions } from "@/app/data/analytics.mock";
import { DollarSign, ShoppingBag, Users } from "lucide-react";
import AnalyticsAccessGuard from "@/app/components/analytics/AnalyticsGuard";
import AnalyticsHeader from "@/app/components/analytics/AnalyticsHeader";

type TimeRange = "daily" | "weekly" | "monthly" | "custom";
type UserRole = "owner" | "manager" | "staff";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [userRole] = useState<UserRole>("owner");
  const [mounted, setMounted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDates, setCustomDates] = useState({ start: "", end: "" });

  useEffect(() => setMounted(true), []);

  const currentStats = stats[timeRange === "custom" ? "daily" : timeRange];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <StaffSidebar />
      <AnalyticsAccessGuard role={userRole}>
        <div className="flex-1 flex flex-col min-w-0">
          <AnalyticsHeader
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            customDates={customDates}
            setCustomDates={setCustomDates}
          />

          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard
                  icon={DollarSign}
                  label="Total Revenue"
                  value={`₹${currentStats.revenue.toLocaleString()}`}
                  delta={currentStats.growth}
                />
                <KpiCard
                  icon={ShoppingBag}
                  label="Total Orders"
                  value={currentStats.orders.toLocaleString()}
                />
                <KpiCard
                  icon={Users}
                  label="Avg Order Value"
                  value={`₹${currentStats.avgValue}`}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RevenueChart
                  data={currentStats.chartData}
                  labels={currentStats.labels}
                  peakHour={currentStats.peakHour}
                  mounted={mounted}
                />
                <PaymentBreakdown methods={paymentMethods} mounted={mounted} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopItemsTable items={topItems} />
                <AttentionItems items={underperformingItems} />
              </div>

              <RecentTransactionsTable transactions={recentTransactions} />
            </div>
          </main>
        </div>
      </AnalyticsAccessGuard>
    </div>
  );
}
