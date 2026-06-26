import { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { X, Copy, Check, Calendar, Filter, FileText, Share2, ClipboardList } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export default function ReportModal({ isOpen, onClose, orders }: ReportModalProps) {
  // Report date filter: "tomorrow" (default), "today", or "all-pending"
  const [dateFilter, setDateFilter] = useState<"tomorrow" | "today" | "all">("tomorrow");
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([
    "ממתין להכנה",
    "בהכנה"
  ]);
  const [copied, setCopied] = useState(false);

  // Helper to get relative date string (YYYY-MM-DD)
  const getRelativeDateString = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = getRelativeDateString(0);
  const tomorrowStr = getRelativeDateString(1);

  // Filter orders based on the selection
  const getFilteredOrders = () => {
    return orders.filter(order => {
      // 1. Status Filter
      const matchesStatus = selectedStatuses.includes(order.status);
      
      // 2. Date Filter
      let matchesDate = false;
      if (dateFilter === "tomorrow") {
        matchesDate = order.date === tomorrowStr;
      } else if (dateFilter === "today") {
        matchesDate = order.date === todayStr;
      } else {
        // "all" dates
        matchesDate = true;
      }

      return matchesStatus && matchesDate;
    });
  };

  const filteredOrders = getFilteredOrders();

  // Generate the formatted report text
  const generateReportText = () => {
    let text = "☀️ *דו״ח בוקר ריכוז הזמנות - סבן חומרי בניין* ☀️\n";
    text += "━━━━━━━━━━━━━━━━━━\n";

    if (filteredOrders.length === 0) {
      text += "אין הזמנות מתוכננות לסטטוס ולתאריך שנבחרו.\n";
      text += "━━━━━━━━━━━━━━━━━━\n";
    } else {
      filteredOrders.forEach(order => {
        text += `📦 *הזמנה #${order.orderNumber}*\n`;
        text += `👤 *לקוח:* ${order.customerName}\n`;
        text += `📍 *כתובת אספקה:* ${order.deliveryAddress}\n`;
        text += `🛒 *מוצרים:*\n`;
        
        order.parsedItems.forEach(item => {
          const skuPart = item.sku ? ` (${item.sku})` : "";
          text += `- ${item.quantity} יח' x ${item.name}${skuPart}\n`;
        });
        
        if (order.notes) {
          text += `📝 *הערה:* ${order.notes}\n`;
        }
        
        text += "━━━━━━━━━━━━━━━━━━\n";
      });
    }

    text += "💡 הופק אוטומטית ממערכת SabanOS. עבודה נעימה!";
    return text;
  };

  const reportText = generateReportText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy logic
      const textArea = document.createElement("textarea");
      textArea.value = reportText;
      textArea.style.position = "fixed"; // Avoid scrolling to bottom
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(reportText);
    const url = `https://web.whatsapp.com/send?text=${encodedText}`;
    window.open(url, "_blank");
  };

  const handleStatusToggle = (status: OrderStatus) => {
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length > 1) {
        setSelectedStatuses(selectedStatuses.filter(s => s !== status));
      }
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" id="report-modal">
      <div 
        className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 md:p-8 text-right my-8 overflow-hidden"
        dir="rtl"
      >
        {/* Glow Header */}
        <div className="absolute -top-16 -left-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5.5 w-5.5 text-emerald-400" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              מחולל דוח בוקר לווטסאפ (RTL)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 pb-2.5 border-b border-slate-900">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>מסנני דוח בוקר מהירים:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date filter selection */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">תאריך אספקה מיועד:</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDateFilter("tomorrow")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    dateFilter === "tomorrow"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                      : "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                  }`}
                >
                  מחר ({tomorrowStr.split("-")[2]}/{tomorrowStr.split("-")[1]})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter("today")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    dateFilter === "today"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                      : "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                  }`}
                >
                  היום ({todayStr.split("-")[2]}/{todayStr.split("-")[1]})
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    dateFilter === "all"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                      : "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                  }`}
                >
                  כל התאריכים
                </button>
              </div>
            </div>

            {/* Status checkboxes */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">הכלל סטטוסים בסידור:</span>
              <div className="flex flex-wrap gap-2">
                {(["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"] as OrderStatus[]).map(status => {
                  const isChecked = selectedStatuses.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusToggle(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-900 text-slate-500 border-slate-850 hover:bg-slate-850"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Header */}
        <div className="flex items-center justify-between mb-2 px-1 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>תצוגה מקדימה לטקסט ווטסאפ ({filteredOrders.length} הזמנות נמצאו)</span>
          </span>
          <span className="text-[10px] text-slate-500">תומך RTL מלא עם אמוג'י ומפרידים</span>
        </div>

        {/* Text Area Preview Box */}
        <div className="mb-6 relative z-10">
          <textarea
            readOnly
            value={reportText}
            className="w-full h-80 bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed text-right focus:outline-none resize-none shadow-inner"
            dir="rtl"
          />
        </div>

        {/* Explanatory Automation Blueprint guide card */}
        <div className="mb-6 p-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 text-xs text-slate-400 leading-relaxed text-right flex flex-col gap-1.5">
          <p className="font-bold text-slate-300">⚙️ טיפ לאוטומציה מלאה (Make.com):</p>
          <p>המערכת מותאמת לסריקת Google Sheets ושליחה אוטומטית לקבוצת הווטסאפ בשעה 17:00 בכל יום על בסיס נתוני הסטטוסים שבחרתם.</p>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800 relative z-10">
          <div className="text-right text-xs text-slate-400">
            לחצו על העתקה ואז הדביקו בקבוצת הווטסאפ של סידור העבודה.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              סגור
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 px-4 py-2 text-sm font-bold transition-all cursor-pointer"
              title="פתח WhatsApp Web"
            >
              <Share2 className="h-4 w-4" />
              <span>שלח לווטסאפ</span>
            </button>

            <button
              type="button"
              id="btn-copy-report-text"
              onClick={handleCopy}
              className={`flex items-center gap-2 rounded-xl text-white px-5 py-2 text-sm font-bold shadow-lg transition-all active:scale-[0.98] cursor-pointer ${
                copied
                  ? "bg-emerald-500 border border-emerald-400"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/20"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>הועתק ללוח!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>העתק דוח לווטסאפ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
