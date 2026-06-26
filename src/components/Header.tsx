import { useState, useEffect } from "react";
import { Clock, Plus, ClipboardList, Package, RefreshCw } from "lucide-react";

interface HeaderProps {
  onOpenReportModal: () => void;
  onOpenAddOrderModal: () => void;
  onSync: () => void;
  isLoading: boolean;
}

export default function Header({ onOpenReportModal, onOpenAddOrderModal, onSync, isLoading }: HeaderProps) {
  const [time, setTime] = useState<Date>(new Date());

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
    <header className="sticky top-0 z-40 w-full h-20 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl px-4 md:px-8 flex items-center transition-all" id="app-header">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* Brand Logo & Title - Sleek Interface Style */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-[0_0_20px_rgba(34,211,238,0.3)] shrink-0">
            <Package className="h-5 w-5 text-white" />
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
                Noa AI • לוגיסטיקה
              </h1>
              <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 text-[9px] font-bold text-cyan-400 border border-cyan-500/20">
                SabanOS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-none mt-1">
              מערכת ניהול הזמנות • סבן חומרי בניין
            </p>
          </div>
        </div>

        {/* Live Clock & Info */}
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          {/* Clock styled with Sleek Interface spec */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 shadow-[0_0_15px_rgba(34,211,238,0.1)] text-cyan-400 font-mono font-bold text-sm">
            <Clock className="h-4 w-4 animate-pulse text-cyan-400" />
            <span>{timeStr}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-sync-live"
              onClick={onSync}
              disabled={isLoading}
              className={`flex items-center gap-2 rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/20 hover:border-cyan-300/30 px-4 py-2 text-xs font-bold shadow-lg shadow-cyan-500/10 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${isLoading ? "animate-pulse" : ""}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-100 ${isLoading ? "animate-spin" : ""}`} />
              <span>🔄 סנכרון נתונים חי</span>
            </button>

            <button
              id="btn-add-order"
              onClick={onOpenAddOrderModal}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-800 hover:border-slate-700 px-4 py-2 text-xs font-semibold shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-cyan-400" />
              <span>הזמנה חדשה</span>
            </button>

            <button
              id="btn-generate-report"
              onClick={onOpenReportModal}
              className="relative overflow-hidden group flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 text-xs font-bold shadow-lg shadow-emerald-500/20 border border-emerald-400/20 hover:border-emerald-300/30 transition-all active:scale-[0.98] cursor-pointer neon-border-emerald"
            >
              <ClipboardList className="h-3.5 w-3.5 text-emerald-100" />
              <span>📋 הפק דוח בוקר למחר</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
