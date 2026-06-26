import { useState, useEffect } from "react";
import { Clock, Plus, ClipboardList, Package, RefreshCw, Zap } from "lucide-react";

interface HeaderProps {
  onOpenReportModal: () => void;
  onOpenAddOrderModal: () => void;
  onSync: () => void;
  isLoading: boolean;
  dashboardView: "active" | "archive";
  setDashboardView: (view: "active" | "archive") => void;
  theme?: "dark" | "light";
}

export default function Header({ 
  onOpenReportModal, 
  onOpenAddOrderModal, 
  onSync, 
  isLoading,
  dashboardView,
  setDashboardView,
  theme = "dark"
}: HeaderProps) {
  const [time, setTime] = useState<Date>(new Date());
  const isDark = theme === "dark";

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHebrewDate = (date: Date) => {
    // Format Hebrew date like: יום חמישי, 25 ביוני 2026
    const days = [
      "יום ראשון",
      "יום שני",
      "יום שלישי",
      "יום רביעי",
      "יום חמישי",
      "יום שישי",
      "שבת"
    ];
    
    const months = [
      "בינואר",
      "בפברואר",
      "במרץ",
      "באפריל",
      "במאי",
      "ביוני",
      "ביולי",
      "באוגוסט",
      "בספטמבר",
      "באוקטובר",
      "בנובמבר",
      "בדצמבר"
    ];

    const dayName = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return {
      timeStr: `${hours}:${minutes}:${seconds}`,
      dateStr: `${dayName}, ${dayOfMonth} ${monthName} ${year}`
    };
  };

  const { timeStr, dateStr } = formatHebrewDate(time);

  return (
    <header 
      className={`sticky top-0 z-40 w-full min-h-20 border-b px-4 md:px-8 py-3 flex items-center transition-all ${
        isDark 
          ? "border-slate-800 bg-slate-900/90 backdrop-blur-xl text-white shadow-2xl shadow-slate-950/25" 
          : "border-slate-200 bg-white/95 backdrop-blur-xl text-slate-800 shadow-md shadow-slate-100/10"
      }`} 
      id="app-header"
    >
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Brand Logo & Title - Sleek Interface Style */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
            <Package className="h-5 w-5 text-white" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className={`text-base md:text-lg font-black tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                Noa AI • לוגיסטיקה
              </h1>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                isDark 
                  ? "bg-cyan-950/80 text-cyan-400 border-cyan-500/20" 
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              }`}>
                SabanOS
              </span>
            </div>
            <p className={`text-xs font-medium leading-none mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              מערכת ניהול הזמנות • סבן חומרי בניין
            </p>
          </div>
        </div>

        {/* Active vs. Archive View Tab Switcher */}
        <div 
          className={`flex border p-1 rounded-xl self-start lg:self-center shrink-0 ${
            isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
          }`} 
          id="header-view-switcher"
        >
          <button
            id="btn-view-active"
            type="button"
            onClick={() => setDashboardView("active")}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              dashboardView === "active"
                ? isDark
                  ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "bg-white text-cyan-600 border border-slate-200 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>📋</span>
            <span>הזמנות פעילות</span>
          </button>
          
          <button
            id="btn-view-archive"
            type="button"
            onClick={() => setDashboardView("archive")}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              dashboardView === "archive"
                ? isDark
                  ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "bg-white text-cyan-600 border border-slate-200 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🗄️</span>
            <span>ארכיון היסטוריה</span>
          </button>
        </div>

        {/* Live Clock & Info */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {/* Clock styled with Sleek Interface spec */}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono font-bold text-sm ${
            isDark 
              ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
              : "border-cyan-200 bg-cyan-50 text-cyan-700"
          }`}>
            <Clock className="h-4 w-4 animate-pulse text-cyan-500" />
            <span>{timeStr}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-quick-actions"
              onClick={onOpenReportModal}
              className="relative overflow-hidden group flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-white px-3 py-2 text-xs font-bold shadow-lg shadow-orange-500/20 border border-orange-400/30 hover:border-orange-300/40 transition-all active:scale-[0.98] cursor-pointer"
              title="פעולות מהירות - דוח בוקר מיידי"
            >
              <Zap className="h-3.5 w-3.5 text-amber-100 animate-pulse group-hover:scale-110 duration-200" />
              <span>פעולות מהירות</span>
            </button>

            <button
              id="btn-sync-live"
              onClick={onSync}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                isDark 
                  ? "text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/20 hover:border-cyan-300/30 shadow-lg shadow-cyan-500/10" 
                  : "bg-white hover:bg-slate-50 text-cyan-600 border border-slate-200 shadow-sm"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-500 ${isLoading ? "animate-spin" : ""}`} />
              <span>סנכרון נתונים חי</span>
            </button>

            <button
              id="btn-add-order"
              onClick={onOpenAddOrderModal}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                isDark 
                  ? "bg-slate-950 hover:bg-slate-800 text-slate-100 border border-slate-850 hover:border-slate-700" 
                  : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
              }`}
            >
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
              <span>הזמנה חדשה</span>
            </button>

            <button
              id="btn-generate-report"
              onClick={onOpenReportModal}
              className="relative overflow-hidden group flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/20 hover:border-emerald-300/30 transition-all active:scale-[0.98] cursor-pointer neon-border-emerald"
            >
              <ClipboardList className="h-3.5 w-3.5 text-emerald-100" />
              <span>הפק דוח בוקר</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
