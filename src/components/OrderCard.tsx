import { useState, useEffect } from "react";
import { Order, OrderStatus, STATUS_OPTIONS } from "../types";
import { Calendar, Hash, User, MapPin, Phone, FileText, Edit, Trash2, ExternalLink, Tag, MessageSquare, Clock, Bell } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onAddNote: (orderId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (orderId: string, isSelected: boolean) => void;
  theme?: "dark" | "light";
  key?: string;
  onSendLoadingCommand?: (order: Order) => void;
  onSendDeliveryUpdate?: (order: Order) => void;
  onViewHistory?: (order: Order) => void;
}

export default function OrderCard({
  order,
  onStatusChange,
  onEdit,
  onDelete,
  onAddNote,
  isSelected = false,
  onSelectChange,
  theme = "dark",
  onSendLoadingCommand,
  onSendDeliveryUpdate,
  onViewHistory
}: OrderCardProps) {
  const [prevStatus, setPrevStatus] = useState<OrderStatus>(order.status);
  const [isFlashing, setIsFlashing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

  useEffect(() => {
    if (order.status !== prevStatus) {
      setIsFlashing(true);
      setPrevStatus(order.status);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 1500); // Animation highlight lasts 1.5s
      return () => clearTimeout(timer);
    }
  }, [order.status, prevStatus]);

  useEffect(() => {
    if (order.deadlineTime && order.status !== "נשלח") {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000); // update every second for live countdown precision
      return () => clearInterval(interval);
    }
  }, [order.status, order.deadlineTime]);

  // Calculation for "בהכנה" preparation timer progress bar
  const getPrepTimerInfo = () => {
    if (order.status !== "בהכנה" || !order.deadlineTime) return null;

    try {
      const deadlineMs = new Date(order.deadlineTime).getTime();
      if (isNaN(deadlineMs)) return null;

      // Find start time of preparation
      const prepLog = order.statusLog?.find(entry => entry.status === "בהכנה");
      let startMs = prepLog ? new Date(prepLog.timestamp).getTime() : null;

      // If no prep status log, use the first log entry or fallback to 45 mins before deadline
      if (!startMs || isNaN(startMs)) {
        const firstLog = order.statusLog?.[0];
        const firstLogMs = firstLog ? new Date(firstLog.timestamp).getTime() : null;
        startMs = firstLogMs && !isNaN(firstLogMs) ? firstLogMs : deadlineMs - 45 * 60 * 1000;
      }

      // Ensure start is before deadline to avoid division issues
      if (startMs >= deadlineMs) {
        startMs = deadlineMs - 45 * 60 * 1000; // default 45 minutes prep
      }

      const nowMs = currentTime.getTime();
      const totalDuration = deadlineMs - startMs;
      const elapsed = nowMs - startMs;
      const remainingMs = deadlineMs - nowMs;

      // Calculate percentage: 0% is start of prep, 100% is deadline.
      // So percentage of elapsed preparation is: (elapsed / totalDuration) * 100
      let progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

      const isOverdue = remainingMs < 0;
      const absoluteRemainingMs = Math.abs(remainingMs);
      
      // Detailed time breakdown
      const totalSeconds = Math.floor(absoluteRemainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Color scheme based on status
      let colorClass = "bg-gradient-to-r from-emerald-500 to-cyan-500";
      let textClass = "text-cyan-400";
      let ringGlow = "shadow-[0_0_10px_rgba(6,182,212,0.3)]";
      let labelText = "בזמן";

      const reminderMins = order.reminderMinutes ?? 30;
      const isUrgent = remainingMs <= reminderMins * 60 * 1000;

      if (isOverdue) {
        colorClass = "bg-gradient-to-r from-rose-600 to-red-500 animate-pulse";
        textClass = "text-rose-500 font-extrabold";
        ringGlow = "shadow-[0_0_12px_rgba(239,68,68,0.5)]";
        labelText = "חריגת זמן!";
        progressPercent = 100; // full red bar when overdue
      } else if (isUrgent) {
        colorClass = "bg-gradient-to-r from-amber-500 to-orange-500";
        textClass = "text-amber-500 font-bold";
        ringGlow = "shadow-[0_0_10px_rgba(245,158,11,0.35)]";
        labelText = "לחץ זמן";
      }

      return {
        progressPercent,
        hours,
        minutes,
        seconds,
        isOverdue,
        colorClass,
        textClass,
        ringGlow,
        labelText,
        remainingMs
      };
    } catch (e) {
      console.error("Error calculating prep timer:", e);
      return null;
    }
  };

  const prepTimer = getPrepTimerInfo();

  const getFlashClass = () => {
    if (!isFlashing) return "scale-100";
    switch (order.status) {
      case "ממתין להכנה":
        return "ring-4 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105 rotate-1 animate-pulse bg-amber-500/20 text-amber-300";
      case "בהכנה":
        return "ring-4 ring-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-105 -rotate-1 animate-pulse bg-cyan-500/20 text-cyan-300";
      case "מוכן לאיסוף":
        return "ring-4 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-105 rotate-1 animate-pulse bg-emerald-500/20 text-emerald-300";
      case "נשלח":
        return "ring-4 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105 -rotate-1 animate-pulse bg-purple-500/20 text-purple-300";
      case "בוטל":
        return "ring-4 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-105 rotate-1 animate-pulse bg-rose-500/20 text-rose-300";
      case "הוקפא":
        return "ring-4 ring-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.6)] scale-105 -rotate-1 animate-pulse bg-sky-500/20 text-sky-300";
      default:
        return "scale-105 animate-pulse";
    }
  };
  
  // Custom classes depending on status
  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case "ממתין להכנה":
        return {
          badge: "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
          border: "border-slate-800 hover:border-amber-500/40",
          glow: "from-amber-500/5 to-transparent",
          accentText: "text-amber-400"
        };
      case "בהכנה":
        return {
          badge: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]",
          border: "border-slate-800 hover:border-cyan-500/40",
          glow: "from-cyan-500/5 to-transparent",
          accentText: "text-cyan-400"
        };
      case "מוכן לאיסוף":
        return {
          badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
          border: "border-slate-800 hover:border-emerald-500/40",
          glow: "from-emerald-500/5 to-transparent",
          accentText: "text-emerald-400"
        };
      case "נשלח":
        return {
          badge: "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]",
          border: "border-slate-800 hover:border-purple-500/40",
          glow: "from-purple-500/5 to-transparent",
          accentText: "text-purple-400"
        };
      case "בוטל":
        return {
          badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
          border: "border-slate-800 hover:border-rose-500/40",
          glow: "from-rose-500/5 to-transparent",
          accentText: "text-rose-400"
        };
      case "הוקפא":
        return {
          badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.15)]",
          border: "border-slate-800 hover:border-sky-500/40",
          glow: "from-sky-500/5 to-transparent",
          accentText: "text-sky-400"
        };
    }
  };

  const config = getStatusConfig(order.status);

  // Helper to format date nicely
  const formatDateHebrew = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Deadline & Reminder Calculations
  const getDeadlineState = () => {
    if (!order.deadlineTime) return null;
    
    try {
      const deadlineDate = new Date(order.deadlineTime);
      if (isNaN(deadlineDate.getTime())) return null;
      
      const now = currentTime;
      const diffMs = deadlineDate.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const isPast = diffMs < 0;
      const absoluteMs = Math.abs(diffMs);
      const reminderMinutes = order.reminderMinutes ?? 30;
      const isUrgent = diffMs <= reminderMinutes * 60 * 1000; // Trigger warning when within reminder window
      
      const totalSeconds = Math.floor(absoluteMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      let countdownStr = "";
      if (hours > 0) {
        countdownStr += `${String(hours).padStart(2, '0')}:`;
      }
      countdownStr += `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      let timeText = "";
      if (isPast) {
        if (hours > 0) {
          timeText = `איחור של ${hours} ש' ו-${minutes} דק'`;
        } else {
          timeText = `איחור של ${minutes} דק'`;
        }
      } else {
        if (hours > 0) {
          timeText = `בעוד ${hours} ש' ו-${minutes} דק'`;
        } else {
          timeText = `בעוד ${minutes} דק'`;
        }
      }

      // Format target time nicely as HH:mm
      const targetTimeStr = order.deadlineTime.includes("T") 
        ? order.deadlineTime.split("T")[1].substring(0, 5) 
        : order.deadlineTime;

      return {
        isPast,
        isUrgent,
        timeText,
        countdownStr,
        targetTimeStr,
        diffMins,
        hours,
        minutes,
        seconds
      };
    } catch {
      return null;
    }
  };

  const deadlineState = order.status !== "נשלח" ? getDeadlineState() : null;

  return (
    <div
      id={`order-card-${order.id}`}
      className={`relative flex flex-col justify-between rounded-2xl border ${
        theme === "light"
          ? isSelected
            ? "border-cyan-500 bg-cyan-50/30 shadow-[0_4px_15px_rgba(6,182,212,0.1)]"
            : "border-slate-200/80 bg-white"
          : isSelected
            ? "border-cyan-500/60 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40"
      } p-5 md:p-6 transition-all duration-300 ease-out shadow-xl ${config.border} hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 ${theme === "dark" ? "hover:shadow-slate-950/60" : "hover:shadow-slate-200/50"} group overflow-hidden`}
    >
      {/* Top linear highlight line */}
      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${
        isSelected ? "bg-gradient-to-r from-transparent via-cyan-400 to-transparent" : "bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
      } rounded-t-2xl pointer-events-none`} />

      {/* Background radial glow */}
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${config.glow} blur-2xl opacity-40 pointer-events-none`} />

      {/* Card Header: Order # and Status Selection */}
      <div className={`flex items-start justify-between gap-3 pb-4 border-b ${theme === "dark" ? "border-slate-800/50" : "border-slate-100"} relative z-10`}>
        <div className="flex items-center gap-3">
          {onSelectChange && (
            <div className="flex items-center justify-center pt-0.5">
              <input
                type="checkbox"
                id={`checkbox-${order.id}`}
                checked={isSelected}
                onChange={(e) => onSelectChange(order.id, e.target.checked)}
                className={`h-4.5 w-4.5 rounded-lg text-cyan-500 focus:ring-cyan-500/30 transition-all cursor-pointer accent-cyan-500 ${
                  theme === "dark" ? "border-slate-700 bg-slate-950 focus:ring-offset-slate-900" : "border-slate-300 bg-white"
                }`}
              />
            </div>
          )}
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${theme === "dark" ? "bg-slate-950 border border-slate-850" : "bg-slate-50 border border-slate-200"}`}>
            <Hash className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex flex-col text-right">
            <span className="font-mono text-base font-bold text-cyan-400 tracking-wide">
              #{order.orderNumber}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Calendar className="h-3 w-3" />
              <span className="font-mono">{formatDateHebrew(order.date)}</span>
            </div>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="relative">
          <select
            id={`status-select-${order.id}`}
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            className={`appearance-none rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all duration-500 ease-out shadow-md focus:outline-none focus:ring-1 focus:ring-slate-400 pl-8 pr-3 text-right cursor-pointer ${config.badge} ${
              theme === "dark" ? "border-slate-800" : "border-slate-200"
            } ${getFlashClass()}`}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status} className={`${theme === "dark" ? "bg-slate-950 text-slate-200" : "bg-white text-slate-800"} py-1 font-sans`}>
                {status}
              </option>
            ))}
          </select>
          {/* Custom arrow indicator */}
          <div className="absolute top-1/2 left-2.5 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Deadline Alert Banner or Preparation Live Progress Timer */}
      {order.status === "בהכנה" && prepTimer ? (
        <div 
          id={`prep-timer-container-${order.id}`}
          className={`mt-3 p-3 rounded-xl border relative z-10 overflow-hidden transition-all duration-350 ${
            theme === "dark" 
              ? prepTimer.isOverdue 
                ? "border-rose-500/35 bg-rose-950/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                : "border-slate-800 bg-slate-950/40"
              : prepTimer.isOverdue
                ? "border-rose-300 bg-rose-50/50 text-rose-700"
                : "border-slate-200 bg-slate-50/80"
          }`}
          dir="rtl"
        >
          {/* Subtle background flashing overlay when overdue */}
          {prepTimer.isOverdue && (
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none animate-pulse" />
          )}

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`flex h-2 w-2 rounded-full ${prepTimer.isOverdue ? "bg-rose-500 animate-pulse" : "bg-cyan-400 animate-pulse"}`} />
              <span className={`text-[11px] font-extrabold ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                זמן הכנה שנותר:
              </span>
            </div>
            
            {/* Live digital countdown timer */}
            <div className={`font-mono text-xs font-black tracking-wider flex items-center gap-0.5 ${prepTimer.textClass}`}>
              <span>{prepTimer.isOverdue ? "-" : ""}</span>
              {prepTimer.hours > 0 && (
                <>
                  <span>{String(prepTimer.hours).padStart(2, '0')}</span>
                  <span className="animate-pulse">:</span>
                </>
              )}
              <span>{String(prepTimer.minutes).padStart(2, '0')}</span>
              <span className="animate-pulse">:</span>
              <span>{String(prepTimer.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] font-sans font-medium mr-1 opacity-85">
                ({prepTimer.labelText})
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className={`w-full h-2 rounded-full overflow-hidden relative ${
            theme === "dark" ? "bg-slate-900" : "bg-slate-200"
          }`}>
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${prepTimer.colorClass} ${prepTimer.ringGlow}`}
              style={{ width: `${prepTimer.progressPercent}%` }}
            />
          </div>

          {/* Time markers and percentage labels */}
          <div className="flex justify-between items-center mt-1.5 text-[9px] font-bold text-slate-500 font-sans">
            <span>התחלת הכנה</span>
            <span className={prepTimer.isOverdue ? "text-rose-500 animate-pulse font-black" : "text-slate-400"}>
              {prepTimer.isOverdue ? "חריגה מהדדליין!" : `${Math.round(100 - prepTimer.progressPercent)}% נותר`}
            </span>
            <span>יעד: {order.deadlineTime.includes("T") ? order.deadlineTime.split("T")[1].substring(0, 5) : order.deadlineTime}</span>
          </div>
        </div>
      ) : (
        deadlineState && (
          <div id={`order-deadline-alert-${order.id}`} className={`mt-3 p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10 transition-all ${
            deadlineState.isPast
              ? "border-rose-500/35 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse"
              : deadlineState.isUrgent
                ? "border-amber-500/35 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                : theme === "dark" 
                  ? "border-slate-800 bg-slate-950/40 text-slate-300" 
                  : "border-slate-200 bg-slate-50 text-slate-600"
          }`}>
            {/* Right side: Alert light and text description */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  deadlineState.isPast ? "bg-rose-500" : deadlineState.isUrgent ? "bg-amber-400" : "bg-cyan-400"
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  deadlineState.isPast ? "bg-rose-500" : deadlineState.isUrgent ? "bg-amber-500" : "bg-cyan-400"
                }`} />
              </div>
              <div className="flex items-center gap-1.5">
                {deadlineState.isUrgent && <Bell className="h-3.5 w-3.5 text-amber-500 animate-bounce shrink-0" />}
                <span className="text-xs font-extrabold text-right leading-none">{deadlineState.timeText}</span>
              </div>
            </div>

            {/* Left side: Live Countdown Timer & Target Time */}
            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/10">
              {/* Countdown Ticking numbers */}
              <div className={`font-mono text-xs font-black tracking-wider flex items-center gap-0.5 px-2 py-0.5 rounded border ${
                deadlineState.isPast
                  ? "bg-rose-950/30 border-rose-500/20 text-rose-400"
                  : deadlineState.isUrgent
                    ? "bg-amber-950/30 border-amber-500/20 text-amber-400"
                    : theme === "dark"
                      ? "bg-slate-900 border-slate-800 text-cyan-400"
                      : "bg-white border-slate-200 text-cyan-600"
              }`}>
                <span>{deadlineState.isPast ? "-" : ""}</span>
                <span>{deadlineState.countdownStr}</span>
              </div>

              {/* Target timestamp */}
              <div className="flex items-center gap-1 text-[11px] opacity-90 shrink-0 font-medium">
                <Clock className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                <span className="font-sans">יעד: {deadlineState.targetTimeStr}</span>
              </div>
            </div>
          </div>
        )
      )}

      {/* Card Body: Customer details & Address */}
      <div className="py-4 flex flex-col gap-3.5 relative z-10 text-right">
        {/* Customer name */}
        <div className="flex items-start gap-2.5">
          <User className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-1">לקוח</span>
            <span className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}>{order.customerName}</span>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col w-full">
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-1">כתובת אספקה</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium leading-normal ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{order.deliveryAddress}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                title="נווט ב-Google Maps"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Contact Person */}
        <div className="flex items-start gap-2.5">
          <Phone className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-1">איש קשר וטלפון</span>
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>{order.contactPerson}</span>
          </div>
        </div>
      </div>

      {/* Card Products Area */}
      <div className={`mt-1 p-3.5 rounded-xl relative z-10 text-right border ${
        theme === "dark" ? "bg-slate-950/60 border-slate-800/50" : "bg-slate-50/50 border-slate-150"
      }`}>
        <div className={`flex items-center justify-between pb-2 border-b mb-2 ${theme === "dark" ? "border-slate-900" : "border-slate-150"}`}>
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-400">מוצרים להכנה:</span>
          </div>
          {order.parsedItems.length > 3 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
              theme === "dark" ? "text-slate-400 bg-slate-900" : "text-slate-500 bg-slate-100"
            }`}>
              {order.parsedItems.length} פריטים
            </span>
          )}
        </div>
        
        <ul className={`space-y-1.5 overflow-y-auto pr-0.5 transition-all duration-300 ${
          isItemsExpanded ? "max-h-[350px]" : "max-h-[140px]"
        }`}>
          {(isItemsExpanded ? order.parsedItems : order.parsedItems.slice(0, 3)).map((item, idx) => (
            <li key={idx} className={`flex items-center justify-between text-xs py-1 border-b last:border-b-0 ${
              theme === "dark" ? "border-slate-900/20" : "border-slate-100"
            }`}>
              {/* Product Sku on left */}
              {item.sku ? (
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  theme === "dark" ? "bg-slate-900 text-slate-500 border-slate-850" : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {item.sku}
                </span>
              ) : (
                <span />
              )}
              {/* Product name & quantity on right */}
              <div className="flex items-center gap-1.5 max-w-[70%]">
                <span className={`font-medium truncate ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`} title={item.name}>{item.name}</span>
                <span className={`font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                  theme === "dark" ? "text-cyan-400 bg-cyan-950/40 border-cyan-500/15" : "text-cyan-600 bg-cyan-50 border-cyan-200/50"
                }`}>
                  {item.quantity} יח'
                </span>
              </div>
            </li>
          ))}
        </ul>

        {order.parsedItems.length > 3 && (
          <div className="mt-2.5 pt-2 border-t border-slate-900/10 dark:border-slate-900 flex justify-center">
            <button
              id={`btn-expand-items-${order.id}`}
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className={`text-[10px] md:text-[11px] font-black flex items-center gap-1.5 py-1 px-3 rounded-lg border transition-all active:scale-[0.97] cursor-pointer ${
                theme === "dark"
                  ? "bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-cyan-400 hover:text-cyan-300"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-cyan-600 hover:text-cyan-700 shadow-sm"
              }`}
            >
              <span>{isItemsExpanded ? "הצג פחות" : `הצג הכל (${order.parsedItems.length})`}</span>
              <span className={`transition-transform duration-200 inline-block ${isItemsExpanded ? "rotate-180" : ""}`}>▼</span>
            </button>
          </div>
        )}
      </div>

      {/* Notes / Special Instructions */}
      {order.notes && (
        <div className={`mt-3.5 flex items-start gap-2 text-right p-2.5 rounded-xl border relative z-10 ${
          theme === "dark" ? "border-amber-500/10 bg-amber-500/5" : "border-amber-500/20 bg-amber-500/5"
        }`}>
          <FileText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">הערה מיוחדת:</span>
            <p className={`text-xs leading-relaxed font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>{order.notes}</p>
          </div>
        </div>
      )}

      {/* WhatsApp Smart Actions OR Restore Button if Archived */}
      {order.status === "נשלח" ? (
        <div className={`mt-4 pt-3.5 border-t flex relative z-10 ${
          theme === "dark" ? "border-slate-800/40" : "border-slate-150"
        }`}>
          <button
            id={`btn-restore-${order.id}`}
            onClick={() => onStatusChange(order.id, "ממתין להכנה")}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md border ${
              theme === "dark"
                ? "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] hover:border-purple-500/50"
                : "bg-purple-50 hover:bg-purple-100/80 border-purple-200 text-purple-700 shadow-sm"
            }`}
          >
            <span>🔄</span>
            <span>החזר ללוח פעיל</span>
          </button>
        </div>
      ) : (
        <div className={`mt-4 pt-3.5 border-t grid grid-cols-2 gap-3.5 relative z-10 ${
          theme === "dark" ? "border-slate-800/40" : "border-slate-150"
        }`}>
          <button
            id={`btn-loading-cmd-${order.id}`}
            onClick={() => onSendLoadingCommand?.(order)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md border ${
              theme === "dark"
                ? "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/25 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.1)] hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] hover:border-sky-500/40"
                : "bg-sky-50 hover:bg-sky-100/80 border-sky-200 text-sky-700 shadow-sm"
            }`}
            title="שלח פקודת העמסה לנהג בווצאפ"
          >
            <span className="text-sm">🚚</span>
            <span>פקודת העמסה</span>
          </button>

          <button
            id={`btn-delivery-update-${order.id}`}
            onClick={() => onSendDeliveryUpdate?.(order)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md border ${
              theme === "dark"
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/40"
                : "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-700 shadow-sm"
            }`}
            title="שלח עדכון אספקה ללקוח בווצאפ"
          >
            <span className="text-sm">📍</span>
            <span>עדכון אספקה</span>
          </button>
        </div>
      )}

      {/* Card Actions: Edit, Note & Delete */}
      <div className={`mt-5 pt-3 border-t flex items-center justify-between relative z-10 ${
        theme === "dark" ? "border-slate-800/40" : "border-slate-150"
      }`}>
        <button
          id={`btn-delete-${order.id}`}
          onClick={() => onDelete(order.id)}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>מחק</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            id={`btn-history-${order.id}`}
            onClick={() => onViewHistory?.(order)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
            title="הצג היסטוריית שינויי סטטוס"
          >
            <Clock className="h-3.5 w-3.5 text-purple-500" />
            <span>היסטוריה</span>
          </button>

          <button
            id={`btn-add-note-${order.id}`}
            onClick={() => onAddNote(order.id)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
            <span>{order.notes ? "ערוך הערה" : "הוסף הערה"}</span>
          </button>

          <button
            id={`btn-edit-${order.id}`}
            onClick={() => onEdit(order)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 text-cyan-500" />
            <span>ערוך פרטים</span>
          </button>
        </div>
      </div>
    </div>
  );
}
