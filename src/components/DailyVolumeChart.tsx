import React from "react";
import { Order } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { BarChart3, Calendar, ShoppingBag, PackageOpen, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface DailyVolumeChartProps {
  orders: Order[];
  theme?: "dark" | "light";
}

export default function DailyVolumeChart({ orders, theme = "dark" }: DailyVolumeChartProps) {
  const isDark = theme === "dark";

  // 1. Generate the last 7 calendar days safely.
  // To handle static spreadsheets or simulation data, we align the 7-day window
  // with either today or the latest order date in the system, whichever is later.
  const getLast7Days = () => {
    let maxDate = new Date();
    orders.forEach(o => {
      if (o.date) {
        const d = new Date(o.date);
        if (!isNaN(d.getTime()) && d > maxDate) {
          maxDate = d;
        }
      }
    });

    const refDate = maxDate > new Date() ? maxDate : new Date();
    const dates: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    return dates;
  };

  const last7Days = getLast7Days();

  // 2. Format Hebrew days of week
  const getHebrewDayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      return `יום ${days[d.getDay()]}`;
    } catch {
      return "";
    }
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // 3. Process the daily volume metrics
  const chartData = last7Days.map(date => {
    const dailyOrders = orders.filter(o => o.date === date);
    
    // Count total items
    const totalItems = dailyOrders.reduce((acc, order) => {
      if (order.parsedItems && order.parsedItems.length > 0) {
        return acc + order.parsedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      }
      return acc + 1; // Fallback to 1 item per order if none parsed
    }, 0);

    return {
      date,
      dayName: getHebrewDayName(date),
      formattedDate: formatDateLabel(date),
      ordersCount: dailyOrders.length,
      itemsCount: totalItems,
      avgItemsPerOrder: dailyOrders.length > 0 ? parseFloat((totalItems / dailyOrders.length).toFixed(1)) : 0
    };
  });

  // Calculate high-level summary metrics for these 7 days
  const totalPeriodOrders = chartData.reduce((sum, d) => sum + d.ordersCount, 0);
  const totalPeriodItems = chartData.reduce((sum, d) => sum + d.itemsCount, 0);
  const maxDayOrders = Math.max(...chartData.map(d => d.ordersCount), 0);

  // Custom tooltips with detailed stats
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-xl border shadow-2xl text-right text-xs backdrop-blur-md flex flex-col gap-2 ${
          isDark ? "bg-slate-900/95 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-800"
        }`} dir="rtl">
          <div className="border-b pb-1.5 mb-1">
            <p className="font-bold text-sm text-cyan-400">{data.dayName}</p>
            <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{data.formattedDate}</p>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>כמות הזמנות:</span>
            <span className={`font-mono font-extrabold ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>{data.ordersCount}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className={isDark ? "text-slate-300" : "text-slate-600"}>נפח פריטים כולל:</span>
            <span className="font-mono font-extrabold text-amber-500">{data.itemsCount}</span>
          </div>
          {data.ordersCount > 0 && (
            <div className="flex items-center justify-between gap-8 border-t pt-1.5 mt-1 text-[10px]">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>ממוצע פריטים להזמנה:</span>
              <span className={`font-mono font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{data.avgItemsPerOrder}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      id="daily-volume-chart-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-full flex flex-col rounded-2xl border p-5 md:p-6 shadow-xl relative overflow-hidden ${
        isDark ? "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40" : "border-slate-200/80 bg-white"
      }`}
    >
      {/* Decorative gradient strip */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-amber-500 to-purple-500 pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-dashed border-slate-800/40" dir="rtl">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className={`text-base font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              השוואת נפח הזמנות יומי - 7 ימים אחרונים
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              ניתוח השוואתי בין כמות ההזמנות שנקלטו לבין כמות הפריטים הכוללת שהוכנה
            </p>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <div className={`flex flex-col items-end px-3 py-1.5 rounded-xl border ${
            isDark ? "bg-slate-900/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>סה"כ הזמנות (שבוע)</span>
            <span className="font-mono text-xs font-bold">{totalPeriodOrders}</span>
          </div>
          <div className={`flex flex-col items-end px-3 py-1.5 rounded-xl border ${
            isDark ? "bg-slate-900/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-slate-400"}`}>סה"כ פריטים (שבוע)</span>
            <span className="font-mono text-xs font-bold text-amber-500">{totalPeriodItems}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full relative" dir="rtl">
        {totalPeriodOrders === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center p-6">
            <div className={`p-4 rounded-full ${isDark ? "bg-slate-900 text-slate-700" : "bg-slate-100 text-slate-400"}`}>
              <PackageOpen className="h-10 w-10 stroke-[1.5]" />
            </div>
            <div>
              <p className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-750"}`}>אין נתונים זמינים</p>
              <p className={`text-xs mt-1 max-w-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                אין הזמנות בטווח 7 הימים האחרונים. טען קובץ מעודכן או הוסף הזמנות חדשות.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              barGap={6}
            >
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.15} />
                </linearGradient>
                <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(71, 85, 105, 0.15)" : "rgba(148, 163, 184, 0.15)"}
                vertical={false}
              />
              <XAxis
                dataKey="formattedDate"
                stroke={isDark ? "#475569" : "#94a3b8"}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                stroke={isDark ? "#475569" : "#94a3b8"}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)' }} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                align="right"
                formatter={(value) => (
                  <span className={`text-xs font-bold font-sans ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {value === "ordersCount" ? "כמות הזמנות יומיות" : "נפח פריטים כולל"}
                  </span>
                )}
              />
              <Bar
                dataKey="ordersCount"
                name="ordersCount"
                fill="url(#colorOrders)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                dataKey="itemsCount"
                name="itemsCount"
                fill="url(#colorItems)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
