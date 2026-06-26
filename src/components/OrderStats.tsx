import { Order } from "../types";
import { Clipboard, Play, CheckCircle2, Truck, BarChart3, XCircle, AlertCircle } from "lucide-react";

interface OrderStatsProps {
  orders: Order[];
  theme?: "dark" | "light";
  activeView: "active" | "archive";
  selectedStatusTab: string;
  onStatClick: (view: "active" | "archive", statusTab: string) => void;
}

export default function OrderStats({ 
  orders, 
  theme = "dark", 
  activeView, 
  selectedStatusTab, 
  onStatClick 
}: OrderStatsProps) {
  const totalActive = orders.filter(o => o.status !== "נשלח").length;
  const totalArchived = orders.filter(o => o.status === "נשלח").length;
  const pending = orders.filter(o => o.status === "ממתין להכנה").length;
  const inPrep = orders.filter(o => o.status === "בהכנה").length;
  const ready = orders.filter(o => o.status === "מוכן לאיסוף").length;
  const cancelled = orders.filter(o => o.status === "בוטל").length;
  const frozen = orders.filter(o => o.status === "הוקפא").length;

  const isDark = theme === "dark";

  const stats = [
    {
      id: "stat-active",
      label: "הזמנות בטיפול",
      value: totalActive,
      icon: BarChart3,
      targetView: "active" as const,
      targetStatus: "הכל",
      isActiveFilter: activeView === "active" && selectedStatusTab === "הכל",
      colorClass: isDark
        ? "text-cyan-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-cyan-500/30"
        : "text-cyan-600 bg-white border-slate-200/80 hover:border-cyan-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-cyan-500/80 bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        : "ring-2 ring-cyan-500 bg-cyan-50 border-cyan-300 shadow-md",
      glowColor: isDark ? "hover:shadow-cyan-500/10" : "hover:shadow-cyan-300/5",
      accent: isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-100 text-cyan-500"
    },
    {
      id: "stat-pending",
      label: "ממתין להכנה",
      value: pending,
      icon: Clipboard,
      targetView: "active" as const,
      targetStatus: "ממתין להכנה",
      isActiveFilter: activeView === "active" && selectedStatusTab === "ממתין להכנה",
      colorClass: isDark
        ? "text-amber-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-amber-500/30"
        : "text-amber-600 bg-white border-slate-200/80 hover:border-amber-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-amber-500/80 bg-amber-950/20 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        : "ring-2 ring-amber-500 bg-amber-50 border-amber-300 shadow-md",
      glowColor: isDark ? "hover:shadow-amber-500/10" : "hover:shadow-amber-300/5",
      accent: "bg-amber-500/10 text-amber-500"
    },
    {
      id: "stat-in-prep",
      label: "בהכנה במחסן",
      value: inPrep,
      icon: Play,
      targetView: "active" as const,
      targetStatus: "בהכנה",
      isActiveFilter: activeView === "active" && selectedStatusTab === "בהכנה",
      colorClass: isDark
        ? "text-cyan-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-cyan-500/30"
        : "text-cyan-600 bg-white border-slate-200/80 hover:border-cyan-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-cyan-500/80 bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        : "ring-2 ring-cyan-500 bg-cyan-50 border-cyan-300 shadow-md",
      glowColor: isDark ? "hover:shadow-cyan-500/10" : "hover:shadow-cyan-300/5",
      accent: "bg-cyan-500/10 text-cyan-500"
    },
    {
      id: "stat-ready",
      label: "מוכן לאיסוף",
      value: ready,
      icon: CheckCircle2,
      targetView: "active" as const,
      targetStatus: "מוכן לאיסוף",
      isActiveFilter: activeView === "active" && selectedStatusTab === "מוכן לאיסוף",
      colorClass: isDark
        ? "text-emerald-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-emerald-500/30"
        : "text-emerald-600 bg-white border-slate-200/80 hover:border-emerald-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-emerald-500/80 bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
        : "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300 shadow-md",
      glowColor: isDark ? "hover:shadow-emerald-500/10" : "hover:shadow-emerald-300/5",
      accent: "bg-emerald-500/10 text-emerald-500"
    },
    {
      id: "stat-archived",
      label: "הזמנות בארכיון",
      value: totalArchived,
      icon: Truck,
      targetView: "archive" as const,
      targetStatus: "נשלח",
      isActiveFilter: activeView === "archive",
      colorClass: isDark
        ? "text-purple-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-purple-500/30"
        : "text-purple-600 bg-white border-slate-200/80 hover:border-purple-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-purple-500/80 bg-purple-950/20 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
        : "ring-2 ring-purple-500 bg-purple-50 border-purple-300 shadow-md",
      glowColor: isDark ? "hover:shadow-purple-500/10" : "hover:shadow-purple-300/5",
      accent: "bg-purple-500/10 text-purple-500"
    },
    {
      id: "stat-cancelled",
      label: "בוטל",
      value: cancelled,
      icon: XCircle,
      targetView: "active" as const,
      targetStatus: "בוטל",
      isActiveFilter: activeView === "active" && selectedStatusTab === "בוטל",
      colorClass: isDark
        ? "text-rose-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-rose-500/30"
        : "text-rose-600 bg-white border-slate-200/80 hover:border-rose-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-rose-500/80 bg-rose-950/20 border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
        : "ring-2 ring-rose-500 bg-rose-50 border-rose-300 shadow-md",
      glowColor: isDark ? "hover:shadow-rose-500/10" : "hover:shadow-rose-300/5",
      accent: "bg-rose-500/10 text-rose-500"
    },
    {
      id: "stat-frozen",
      label: "הוקפא",
      value: frozen,
      icon: AlertCircle,
      targetView: "active" as const,
      targetStatus: "הוקפא",
      isActiveFilter: activeView === "active" && selectedStatusTab === "הוקפא",
      colorClass: isDark
        ? "text-sky-400 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-slate-800/80 hover:border-sky-500/30"
        : "text-sky-600 bg-white border-slate-200/80 hover:border-sky-500/30 shadow-sm",
      activeColorClass: isDark
        ? "ring-2 ring-sky-500/80 bg-sky-950/20 border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.25)]"
        : "ring-2 ring-sky-500 bg-sky-50 border-sky-300 shadow-md",
      glowColor: isDark ? "hover:shadow-sky-500/10" : "hover:shadow-sky-300/5",
      accent: "bg-sky-500/10 text-sky-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 md:gap-4 w-full" id="order-stats-grid">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.id}
            id={stat.id}
            onClick={() => onStatClick(stat.targetView, stat.targetStatus)}
            className={`group relative flex flex-col text-right justify-between p-4 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer ${
              stat.isActiveFilter ? stat.activeColorClass : stat.colorClass
            } ${stat.glowColor}`}
          >
            {/* Top Row */}
            <div className="flex items-center justify-between w-full">
              <span className={`text-xs font-black ${
                stat.isActiveFilter
                  ? isDark ? "text-white font-extrabold" : "text-slate-900 font-extrabold"
                  : isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                {stat.label}
              </span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${stat.accent}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>

            {/* Bottom Row */}
            <div className="mt-4 flex items-baseline gap-2 w-full justify-start">
              <span className={`font-mono text-2xl md:text-3xl font-extrabold tracking-tight ${
                stat.isActiveFilter
                  ? isDark ? "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "text-slate-900"
                  : isDark ? "text-white" : "text-slate-800"
              }`}>
                {stat.value}
              </span>
              <span className={`text-[10px] font-black ${isDark ? "text-slate-500" : "text-slate-400"}`}>הזמנות</span>
            </div>

            {/* Subtle glow border */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: stat.accent.split(" ")[1] }} />
          </button>
        );
      })}
    </div>
  );
}
