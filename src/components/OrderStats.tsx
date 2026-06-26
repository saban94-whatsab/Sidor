import { Order } from "../types";
import { Clipboard, Play, CheckCircle2, Truck, BarChart3 } from "lucide-react";

interface OrderStatsProps {
  orders: Order[];
  theme?: "dark" | "light";
}

export default function OrderStats({ orders, theme = "dark" }: OrderStatsProps) {
  const total = orders.length;
  const pending = orders.filter(o => o.status === "ממתין להכנה").length;
  const inPrep = orders.filter(o => o.status === "בהכנה").length;
  const ready = orders.filter(o => o.status === "מוכן לאיסוף").length;
  const sent = orders.filter(o => o.status === "נשלח").length;

  const isDark = theme === "dark";

  const stats = [
    {
      id: "stat-total",
      label: "סה\"כ הזמנות",
      value: total,
      icon: BarChart3,
      colorClass: isDark
        ? "text-slate-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-slate-700/80"
        : "text-slate-600 bg-white border-slate-200/80 hover:border-slate-300 shadow-sm",
      glowColor: isDark ? "hover:shadow-slate-500/10" : "hover:shadow-slate-300/5",
      accent: isDark ? "bg-slate-500/10 text-slate-400" : "bg-slate-100 text-slate-500"
    },
    {
      id: "stat-pending",
      label: "ממתין להכנה",
      value: pending,
      icon: Clipboard,
      colorClass: isDark
        ? "text-amber-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-amber-500/30"
        : "text-amber-600 bg-white border-slate-200/80 hover:border-amber-500/30 shadow-sm",
      glowColor: isDark ? "hover:shadow-amber-500/10" : "hover:shadow-amber-300/5",
      accent: "bg-amber-500/10 text-amber-500"
    },
    {
      id: "stat-in-prep",
      label: "בהכנה במחסן",
      value: inPrep,
      icon: Play,
      colorClass: isDark
        ? "text-cyan-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-cyan-500/30"
        : "text-cyan-600 bg-white border-slate-200/80 hover:border-cyan-500/30 shadow-sm",
      glowColor: isDark ? "hover:shadow-cyan-500/10" : "hover:shadow-cyan-300/5",
      accent: "bg-cyan-500/10 text-cyan-500"
    },
    {
      id: "stat-ready",
      label: "מוכן לאיסוף",
      value: ready,
      icon: CheckCircle2,
      colorClass: isDark
        ? "text-emerald-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-emerald-500/30"
        : "text-emerald-600 bg-white border-slate-200/80 hover:border-emerald-500/30 shadow-sm",
      glowColor: isDark ? "hover:shadow-emerald-500/10" : "hover:shadow-emerald-300/5",
      accent: "bg-emerald-500/10 text-emerald-500"
    },
    {
      id: "stat-sent",
      label: "נשלח ללקוח",
      value: sent,
      icon: Truck,
      colorClass: isDark
        ? "text-purple-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-purple-500/30"
        : "text-purple-600 bg-white border-slate-200/80 hover:border-purple-500/30 shadow-sm",
      glowColor: isDark ? "hover:shadow-purple-500/10" : "hover:shadow-purple-300/5",
      accent: "bg-purple-500/10 text-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 w-full" id="order-stats-grid">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            id={stat.id}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 shadow-lg ${stat.colorClass} ${stat.glowColor}`}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {stat.label}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.accent}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>

            {/* Bottom Row */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className={`font-mono text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                {stat.value}
              </span>
              <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>הזמנות</span>
            </div>

            {/* Subtle glow border */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: stat.accent.split(" ")[1] }} />
          </div>
        );
      })}
    </div>
  );
}
