import React, { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { X, Copy, Check, MessageSquare, Clipboard, ExternalLink, Calendar, Filter } from "lucide-react";

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  theme?: "light" | "dark";
}

export default function WhatsAppSummaryModal({
  isOpen,
  onClose,
  orders,
  theme = "dark"
}: WhatsAppSummaryModalProps) {
  const isDark = theme === "dark";
  const [scope, setScope] = useState<"today" | "all">("today");
  const [copied, setCopied] = useState(false);

  // Helper to get relative date string (YYYY-MM-DD)
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getTodayDateString();

  // Get matching unshipped orders
  const getUnshippedOrders = () => {
    return orders.filter(order => {
      // Must not be sent/shipped
      const isUnshipped = order.status !== "נשלח";
      
      if (scope === "today") {
        // Must be scheduled for today
        return isUnshipped && order.date === todayStr;
      }
      
      // Return all unshipped orders (all dates)
      return isUnshipped;
    });
  };

  const filteredOrders = getUnshippedOrders();

  // Generate the formatted WhatsApp message text
  const generateMessageText = () => {
    const d = new Date();
    const formattedDate = d.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    let text = `🟢 *סיכום הזמנות יומי לטיפול - ${formattedDate}* 🟢\n`;
    text += `*סטטוס:* טרם נשלחו (נכון להיום)\n`;
    text += `*סה"כ הזמנות:* ${filteredOrders.length}\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;

    if (filteredOrders.length === 0) {
      text += `אין הזמנות פתוחות לטיפול לטווח שנבחר. 🎉\n`;
    } else {
      filteredOrders.forEach((order, index) => {
        text += `📦 *[${index + 1}] הזמנה #${order.orderNumber}*\n`;
        text += `👤 *לקוח:* ${order.customerName}\n`;
        text += `📍 *כתובת:* ${order.deliveryAddress}\n`;
        text += `📞 *איש קשר:* ${order.contactPerson || "לא צוין"}\n`;
        text += `🛠️ *סטטוס נוכחי:* ${order.status}\n`;
        if (order.deadlineTime) {
          const timeStr = order.deadlineTime.includes("T") 
            ? order.deadlineTime.split("T")[1].substring(0, 5) 
            : order.deadlineTime;
          text += `⏰ *שעת יעד:* ${timeStr}\n`;
        }
        text += `🛒 *פריטים להכנה:*\n`;
        
        order.parsedItems.forEach(item => {
          const skuPart = item.sku ? ` [${item.sku}]` : "";
          text += `  - ${item.quantity} יח' x ${item.name}${skuPart}\n`;
        });

        if (order.notes) {
          text += `📝 *הערות:* ${order.notes}\n`;
        }
        
        text += `\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `🚀 נשלח ממסוף הניהול SabanOS`;
    return text;
  };

  const messageText = generateMessageText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement("textarea");
      textArea.value = messageText;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSendWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl border p-5 md:p-6 shadow-2xl overflow-hidden text-right transition-all ${
          isDark 
            ? "border-slate-800 bg-slate-900 text-slate-100" 
            : "border-slate-200 bg-white text-slate-800"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent pointer-events-none" />

        {/* Header */}
        <div className={`flex items-center justify-between pb-4 border-b mb-4 ${isDark ? "border-slate-800" : "border-slate-150"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl border shrink-0 ${
              isDark 
                ? "bg-emerald-950/40 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]" 
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}>
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm md:text-base">ייצוא סיכום יומי ל-WhatsApp</h3>
              <p className={`text-[10px] md:text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                ייצוא מרוכז ומסודר של כל ההזמנות הפעילות שטרם נשלחו לצורך שיתוף מהיר.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-all cursor-pointer ${
              isDark ? "text-slate-500 hover:text-slate-300 hover:bg-slate-850" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scope selector */}
        <div className="mb-4">
          <label className={`block text-xs font-black mb-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            בחירת טווח הזמנות לסיכום:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setScope("today")}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                scope === "today"
                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  : isDark
                    ? "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Calendar className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>הזמנות של היום ({todayStr})</span>
            </button>

            <button
              onClick={() => setScope("all")}
              className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                scope === "all"
                  ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  : isDark
                    ? "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Filter className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>כל ההזמנות שטרם נשלחו ({orders.filter(o => o.status !== "נשלח").length})</span>
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-black ${isDark ? "text-slate-400" : "text-slate-600"}`}>תצוגה מקדימה של ההודעה:</span>
            <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              {filteredOrders.length} הזמנות נבחרו
            </span>
          </div>
          
          <div className="relative">
            <textarea
              readOnly
              value={messageText}
              rows={10}
              className={`w-full rounded-xl border px-3.5 py-3 text-xs font-sans placeholder-slate-600 focus:outline-none transition-all resize-none text-right font-medium leading-relaxed overflow-y-auto ${
                isDark 
                  ? "border-slate-800 bg-slate-950 text-slate-200" 
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            />
            {/* Ambient indicator */}
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 opacity-70">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-500 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                מעוצב ל-WhatsApp
              </span>
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t ${
          isDark ? "border-slate-800" : "border-slate-150"
        }`}>
          <div className={`text-[11px] font-medium text-right self-start sm:self-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            💡 ההודעה מותאמת ישירות עם הדגשות כוכביות (*) וקווים מפרידים לשליחה קריאה.
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              סגור
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-all active:scale-[0.98] cursor-pointer ${
                copied
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : isDark
                    ? "bg-slate-850 hover:bg-slate-800 border-slate-700 text-slate-100"
                    : "bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm"
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "הועתק!" : "העתק הודעה"}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={filteredOrders.length === 0}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed rounded-xl shadow-lg hover:shadow-emerald-950/20 transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" />
              <span>פתח ב-WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
