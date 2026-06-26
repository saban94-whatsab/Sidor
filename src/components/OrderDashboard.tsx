import React from "react";
import { Order, OrderStatus } from "../types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { BarChart3, PieChart as PieIcon, Calendar, TrendingUp } from "lucide-react";

interface OrderDashboardProps {
  orders: Order[];
  theme?: "dark" | "light";
}

export default function OrderDashboard({ orders, theme = "dark" }: OrderDashboardProps) {
  const isDark = theme === "dark";

  // 1. Process Status Distribution Data
  const statusCounts = orders.reduce<Record<OrderStatus, number>>(
    (acc, order) => {
      if (order.status in acc) {
        acc[order.status]++;
      } else {
        acc[order.status] = 1;
      }
      return acc;
    },
    {
      "ממתין להכנה": 0,
      "בהכנה": 0,
      "מוכן לאיסוף": 0,
      "נשלח": 0
    }
  );

  const statusColors: Record<OrderStatus, string> = {
    "ממתין להכנה": "#f59e0b", // Amber 500
    "בהכנה": "#06b6d4",     // Cyan 500
    "מוכן לאיסוף": "#10b981", // Emerald 500
    "נשלח": "#a855f7"       // Purple 500
  };

  const statusPieData = Object.entries(statusCounts)
    .map(([status, count]) => ({
      name: status,
      value: count,
      color: statusColors[status as OrderStatus]
    }))
    .filter(d => d.value > 0); // Only show statuses with orders

  // 2. Process Orders per Day Data
  const dateCounts = orders.reduce<Record<string, number>>((acc, order) => {
    const dateStr = order.date || "ללא תאריך";
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});

  // Format date to DD/MM
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

  const ordersPerDayData = Object.entries(dateCounts)
    .map(([date, count]) => ({
      rawDate: date,
      dateLabel: formatDateLabel(date),
      count: count
    }))
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-xl border shadow-2xl text-right text-xs ${
          isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <p className="font-bold mb-1">{data.name || data.dateLabel}</p>
          <div className="flex items-center gap-2 justify-end">
            <span className={`font-mono font-extrabold ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>{payload[0].value}</span>
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>הזמנות</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full" id="order-dashboard-container">
      
      {/* 1. Status Distribution Pie Chart Card */}
      <div className={`lg:col-span-5 flex flex-col rounded-2xl border p-5 md:p-6 shadow-xl relative overflow-hidden ${
        isDark ? "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40" : "border-slate-200/80 bg-white"
      }`}>
        {/* Border glow */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent rounded-t-2xl" />
        
        <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDark ? "border-slate-800/50" : "border-slate-100"}`}>
          <div className="flex items-center gap-2">
            <PieIcon className="h-4.5 w-4.5 text-cyan-400" />
            <h3 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>התפלגות סטטוס הזמנות</h3>
          </div>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isDark ? "text-slate-500 bg-slate-950/40 border-slate-850" : "text-slate-500 bg-slate-50 border-slate-200"
          }`}>
            יחס אחוזים
          </span>
        </div>

        <div className="h-60 w-full relative flex items-center justify-center">
          {statusPieData.length === 0 ? (
            <div className="text-slate-500 text-xs text-center flex flex-col items-center gap-2">
              <PieIcon className="h-8 w-8 text-slate-600 animate-pulse" />
              <span>אין מספיק נתונים להצגת התפלגות</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className={`text-[11px] font-bold mr-1 ml-3 font-sans ${isDark ? "text-slate-300" : "text-slate-600"}`}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Orders per Day Bar Chart Card */}
      <div className={`lg:col-span-7 flex flex-col rounded-2xl border p-5 md:p-6 shadow-xl relative overflow-hidden ${
        isDark ? "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40" : "border-slate-200/80 bg-white"
      }`}>
        {/* Border glow */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent rounded-t-2xl" />

        <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDark ? "border-slate-800/50" : "border-slate-100"}`}>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4.5 w-4.5 text-emerald-400" />
            <h3 className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>קצב הזמנות יומי</h3>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            isDark ? "text-slate-500 bg-slate-950/40 border-slate-850" : "text-slate-500 bg-slate-50 border-slate-200"
          }`}>
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span>נפח עבודה</span>
          </div>
        </div>

        <div className="h-60 w-full relative flex items-center justify-center">
          {ordersPerDayData.length === 0 ? (
            <div className="text-slate-500 text-xs text-center flex flex-col items-center gap-2">
              <Calendar className="h-8 w-8 text-slate-600 animate-pulse" />
              <span>אין מספיק נתונים להצגת ציר הזמן</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersPerDayData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="dateLabel" 
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                <Bar 
                  dataKey="count" 
                  name="הזמנות" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
