import React from "react";
import { X, Calendar, Clock, ArrowLeft, CheckCircle2, Play, Hourglass, Send, Activity, ShieldAlert } from "lucide-react";
import { Order, OrderStatus } from "../types";
import { motion } from "motion/react";

interface OrderStatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  theme?: "dark" | "light";
}

export default function OrderStatusHistoryModal({
  isOpen,
  onClose,
  order,
  theme = "dark"
}: OrderStatusHistoryModalProps) {
  if (!isOpen || !order) return null;

  const isDark = theme === "dark";

  // Default initial status entry if log is missing
  const logEntries = order.statusLog && order.statusLog.length > 0 
    ? order.statusLog 
    : [
        {
          status: "ממתין להכנה" as OrderStatus,
          timestamp: `${order.date.split("-").reverse().join("/")}, 00:00:00`
        }
      ];

  // Helper to match icons and colors for statuses
  const getStatusDisplayConfig = (status: OrderStatus) => {
    switch (status) {
      case "ממתין להכנה":
        return {
          icon: <Hourglass className="h-4.5 w-4.5" />,
          bgColor: isDark ? "bg-amber-500/10" : "bg-amber-50",
          borderColor: isDark ? "border-amber-500/30" : "border-amber-250",
          textColor: "text-amber-500",
          dotColor: "bg-amber-500",
          glowColor: "shadow-[0_0_10px_rgba(245,158,11,0.5)]",
          description: "ההזמנה נקלטה במערכת וממתינה להתחלת הכנה"
        };
      case "בהכנה":
        return {
          icon: <Play className="h-4.5 w-4.5" />,
          bgColor: isDark ? "bg-cyan-500/10" : "bg-cyan-50",
          borderColor: isDark ? "border-cyan-500/30" : "border-cyan-250",
          textColor: "text-cyan-400",
          dotColor: "bg-cyan-400",
          glowColor: "shadow-[0_0_10px_rgba(34,211,238,0.5)]",
          description: "ההזמנה בטיפול פעיל במחלקת ההכנה"
        };
      case "מוכן לאיסוף":
        return {
          icon: <CheckCircle2 className="h-4.5 w-4.5" />,
          bgColor: isDark ? "bg-emerald-500/10" : "bg-emerald-50",
          borderColor: isDark ? "border-emerald-500/30" : "border-emerald-250",
          textColor: "text-emerald-400",
          dotColor: "bg-emerald-400",
          glowColor: "shadow-[0_0_10px_rgba(16,185,129,0.5)]",
          description: "ההכנה הושלמה בהצלחה וההזמנה ממתינה לשילוח"
        };
      case "נשלח":
        return {
          icon: <Send className="h-4.5 w-4.5" />,
          bgColor: isDark ? "bg-purple-500/10" : "bg-purple-50",
          borderColor: isDark ? "border-purple-500/30" : "border-purple-250",
          textColor: "text-purple-400",
          dotColor: "bg-purple-500",
          glowColor: "shadow-[0_0_10px_rgba(168,85,247,0.5)]",
          description: "ההזמנה נמסרה לנהג ויצאה לדרך אל היעד"
        };
      default:
        return {
          icon: <Activity className="h-4.5 w-4.5" />,
          bgColor: isDark ? "bg-slate-500/10" : "bg-slate-50",
          borderColor: isDark ? "border-slate-500/30" : "border-slate-250",
          textColor: "text-slate-400",
          dotColor: "bg-slate-400",
          glowColor: "shadow-none",
          description: "סטטוס השתנה"
        };
    }
  };

  // Safe time-diff calculator between successive state changes
  const getTimeDiffText = (currentIdx: number) => {
    if (currentIdx === 0) return null;
    try {
      const parseHeLocaleDate = (str: string) => {
        // Formats: "26.06.2026, 01:58:02" or "26/06/2026, 01:58:02" or "2026-06-26 01:58:02"
        const clean = str.replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
        const parts = clean.split(' ');
        if (parts.length >= 2) {
          const dateParts = parts[0].includes('/') ? parts[0].split('/') : parts[0].split('-');
          const timeParts = parts[1].split(':');
          
          let day, month, year;
          if (dateParts[0].length === 4) {
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]) - 1;
            day = parseInt(dateParts[2]);
          } else {
            day = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]) - 1;
            year = parseInt(dateParts[2]);
          }
          
          const hour = parseInt(timeParts[0]);
          const minute = parseInt(timeParts[1]);
          const second = timeParts[2] ? parseInt(timeParts[2]) : 0;
          
          return new Date(year, month, day, hour, minute, second);
        }
        return new Date(str);
      };

      const prevTime = parseHeLocaleDate(logEntries[currentIdx - 1].timestamp);
      const currTime = parseHeLocaleDate(logEntries[currentIdx].timestamp);

      if (isNaN(prevTime.getTime()) || isNaN(currTime.getTime())) return null;

      const diffMs = currTime.getTime() - prevTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "פחות מדקה";
      if (diffMins < 60) return `לאחר ${diffMins} דק'`;
      
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (mins === 0) return `לאחר ${hours} שעות`;
      return `לאחר ${hours} שעות ו-${mins} דק'`;
    } catch {
      return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" 
      dir="rtl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl overflow-hidden text-right flex flex-col max-h-[85vh] ${
          isDark 
            ? "border-slate-800 bg-slate-900 text-slate-100" 
            : "border-slate-200 bg-white text-slate-850"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-4 border-b mb-6 ${isDark ? "border-slate-800" : "border-slate-150"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
              isDark ? "bg-cyan-950/80 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            }`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm md:text-base">היסטוריית סטטוסים מלאה</h3>
              <p className={`text-[11px] font-mono mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                הזמנה #{order.orderNumber} • {order.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-all cursor-pointer ${
              isDark ? "text-slate-500 hover:text-slate-300 hover:bg-slate-850" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto pr-1.5 pl-0.5 space-y-4 max-h-[50vh]">
          {logEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2.5">
              <ShieldAlert className="h-8 w-8 text-slate-500" />
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>אין היסטוריית סטטוסים מוקלטת להזמנה זו</p>
            </div>
          ) : (
            <div className="relative border-r border-dashed mr-4 md:mr-6 py-2 space-y-8 border-slate-700/60">
              {logEntries.map((entry, idx) => {
                const config = getStatusDisplayConfig(entry.status);
                const timeDiff = getTimeDiffText(idx);
                const isLatest = idx === logEntries.length - 1;

                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.3 }}
                    className="relative mr-8"
                  >
                    {/* Circle Dot on the Timeline Line */}
                    <div className={`absolute -right-[41px] top-1.5 h-6 w-6 rounded-full border-2 flex items-center justify-center z-10 transition-all ${
                      isDark ? "bg-slate-900" : "bg-white"
                    } ${config.borderColor}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${config.dotColor} ${isLatest ? `${config.glowColor} animate-ping absolute` : ""}`} />
                      <span className={`h-2 w-2 rounded-full ${config.dotColor} relative z-10`} />
                    </div>

                    {/* Timeline Entry Card */}
                    <div className={`rounded-xl border p-4 shadow-md relative overflow-hidden transition-all duration-300 hover:scale-[1.01] ${
                      isLatest 
                        ? isDark 
                          ? `${config.bgColor} ${config.borderColor} shadow-[0_0_15px_rgba(6,182,212,0.04)]`
                          : "bg-cyan-50/40 border-cyan-200"
                        : isDark
                          ? "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                          : "bg-slate-50/50 border-slate-150 hover:border-slate-200"
                    }`}>
                      {/* Left vertical border strip for the latest status */}
                      {isLatest && (
                        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${config.dotColor}`} />
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-2 pb-2 border-b border-dashed border-slate-800/30">
                        {/* Status Label & Icon Badge */}
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
                            {config.icon}
                          </div>
                          <span className={`text-xs font-black ${config.textColor}`}>
                            {entry.status}
                          </span>
                          {isLatest && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold animate-pulse">
                              נוכחי
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono self-start md:self-auto">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>{entry.timestamp}</span>
                        </div>
                      </div>

                      {/* Description & Duration Info */}
                      <div className="space-y-2">
                        <p className={`text-xs font-medium leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          {config.description}
                        </p>
                        
                        {timeDiff && (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isDark ? "bg-slate-900/80 text-cyan-400" : "bg-slate-100 text-cyan-700"
                          }`}>
                            <ArrowLeft className="h-2.5 w-2.5 transform rotate-180" />
                            <span>{timeDiff}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`mt-6 pt-4 border-t flex justify-end gap-3 ${isDark ? "border-slate-800" : "border-slate-150"}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer ${
              isDark 
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            סגור
          </button>
        </div>
      </motion.div>
    </div>
  );
}
