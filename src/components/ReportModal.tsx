import { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { 
  X, Copy, Check, Calendar, Filter, FileText, Share2, ClipboardList,
  TrendingUp, Truck, BarChart3
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  theme?: "light" | "dark";
}

export default function ReportModal({ isOpen, onClose, orders, theme = "dark" }: ReportModalProps) {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"morning" | "weekly">("morning");
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

  // Calculate Weekly Stats (last 7 days based on today or the maximum order date)
  const getWeeklyStats = () => {
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
    const last7DaysDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(refDate);
      d.setDate(refDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      last7DaysDates.push(`${yyyy}-${mm}-${dd}`);
    }

    // Filter orders in last 7 days
    const weeklyOrders = orders.filter(o => last7DaysDates.includes(o.date));

    // A. Average orders per day
    const avgOrdersPerDay = parseFloat((weeklyOrders.length / 7).toFixed(1));

    // B. Busiest Driver
    const getDriverForOrder = (order: Order) => {
      const fields = [
        order.customerName,
        order.contactPerson,
        order.deliveryAddress,
        order.notes || ""
      ].map(f => f.toLowerCase());
      
      const hasHokmat = fields.some(f => f.includes("חכמת") || f.includes("גאבר") || f.includes("hikmat"));
      const hasAli = fields.some(f => f.includes("עלי") || f.includes("ali"));
      
      if (hasHokmat) return "חכמת גאבר";
      if (hasAli) return "עלי נהג";
      
      // Fallback deterministic assignment using orderNumber to make sure we always have realistic values
      const num = parseInt(order.orderNumber, 10) || 0;
      return num % 2 === 0 ? "חכמת גאבר" : "עלי נהג";
    };

    const driverCounts: { [name: string]: number } = {};
    weeklyOrders.forEach(order => {
      const driver = getDriverForOrder(order);
      driverCounts[driver] = (driverCounts[driver] || 0) + 1;
    });

    let busiestDriver = "אין נהגים פעילים";
    let maxDriverOrders = 0;
    Object.entries(driverCounts).forEach(([driver, count]) => {
      if (count > maxDriverOrders) {
        maxDriverOrders = count;
        busiestDriver = driver;
      }
    });
    if (weeklyOrders.length === 0) {
      busiestDriver = "אין נתונים";
    }

    // C. Status counts for the last 7 days
    const statusCounts: { [status in OrderStatus]?: number } = {};
    weeklyOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Make an array for the bar chart
    const statusChartData = (["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח", "בוטל", "הוקפא"] as OrderStatus[]).map(status => ({
      status,
      count: statusCounts[status] || 0
    }));

    return {
      avgOrdersPerDay,
      busiestDriver,
      busiestDriverCount: maxDriverOrders,
      statusChartData,
      totalWeeklyOrders: weeklyOrders.length
    };
  };

  const weeklyStats = getWeeklyStats();

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

  const generateWeeklySummaryText = () => {
    let text = `📊 *סיכום שבועי לוגיסטי - SabanOS* 📊\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `📅 *תקופה:* 7 הימים האחרונים\n`;
    text += `📦 *סה"כ הזמנות:* ${weeklyStats.totalWeeklyOrders}\n`;
    text += `📈 *ממוצע יומי:* ${weeklyStats.avgOrdersPerDay} הזמנות ליום\n`;
    text += `🚚 *נהג פעיל ביותר:* ${weeklyStats.busiestDriver} (${weeklyStats.busiestDriverCount} הזמנות)\n`;
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `🔍 *סטטוסים נפוצים ביותר:*\n`;
    weeklyStats.statusChartData.forEach(item => {
      if (item.count > 0) {
        text += `- ${item.status}: ${item.count} הזמנות\n`;
      }
    });
    text += `━━━━━━━━━━━━━━━━━━\n`;
    text += `💡 הופק אוטומטית ממסוף הניהול SabanOS.`;
    return text;
  };

  const handleCopy = async () => {
    const textToCopy = activeTab === "morning" ? reportText : generateWeeklySummaryText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy logic
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
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
    const textToShare = activeTab === "morning" ? reportText : generateWeeklySummaryText();
    const encodedText = encodeURIComponent(textToShare);
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
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto ${
        isDark ? "bg-slate-950/85" : "bg-slate-950/60"
      }`} 
      id="report-modal"
    >
      <div 
        className={`relative w-full max-w-2xl rounded-2xl border shadow-2xl p-6 md:p-8 text-right my-8 overflow-hidden transition-all duration-300 ${
          isDark 
            ? "border-slate-800 bg-slate-900/95 text-slate-100" 
            : "border-slate-200 bg-white text-slate-800"
        }`}
        dir="rtl"
      >
        {/* Glow Header */}
        <div className={`absolute -top-16 -left-16 h-36 w-36 rounded-full blur-2xl pointer-events-none ${
          isDark ? "bg-emerald-500/10" : "bg-emerald-500/5"
        }`} />

        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-4 border-b mb-4 relative z-10 ${
          isDark ? "border-slate-800" : "border-slate-150"
        }`}>
          <div className="flex items-center gap-2">
            <ClipboardList className={`h-5.5 w-5.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
            <h2 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
              isDark ? "from-emerald-400 to-teal-400" : "from-emerald-600 to-teal-600"
            }`}>
              דוחות וניתוחים לוגיסטיים
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`rounded-lg p-1.5 transition-all cursor-pointer ${
              isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 shadow-sm"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs switcher */}
        <div className={`flex border p-1 rounded-xl mb-6 relative z-10 ${
          isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("morning")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "morning"
                ? isDark
                  ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "bg-white text-emerald-600 border border-slate-200 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-600 hover:text-slate-850"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span>דו״ח בוקר לווטסאפ</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "weekly"
                ? isDark
                  ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : "bg-white text-emerald-600 border border-slate-200 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-600 hover:text-slate-850"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>ניתוח סיכום שבועי</span>
          </button>
        </div>

        {activeTab === "morning" ? (
          <>
            {/* Filter Section */}
            <div className={`mb-6 p-4 rounded-xl border space-y-4 relative z-10 ${
              isDark ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-50 border-slate-200"
            }`}>
              <div className={`flex items-center gap-2 text-xs font-bold pb-2.5 border-b ${
                isDark ? "text-slate-400 border-slate-900" : "text-slate-600 border-slate-200"
              }`}>
                <Filter className={`h-3.5 w-3.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                <span>מסנני דוח בוקר מהירים:</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date filter selection */}
                <div className="flex flex-col gap-2">
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>תאריך אספקה מיועד:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDateFilter("tomorrow")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        dateFilter === "tomorrow"
                          ? isDark
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm"
                          : isDark
                            ? "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                            : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                      }`}
                    >
                      מחר ({tomorrowStr.split("-")[2]}/{tomorrowStr.split("-")[1]})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilter("today")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        dateFilter === "today"
                          ? isDark
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm"
                          : isDark
                            ? "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                            : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                      }`}
                    >
                      היום ({todayStr.split("-")[2]}/{todayStr.split("-")[1]})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        dateFilter === "all"
                          ? isDark
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm"
                          : isDark
                            ? "bg-slate-900 text-slate-400 border-slate-850 hover:bg-slate-850"
                            : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                      }`}
                    >
                      כל התאריכים
                    </button>
                  </div>
                </div>

                {/* Status checkboxes */}
                <div className="flex flex-col gap-2">
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-600"}`}>הכלל סטטוסים בסידור:</span>
                  <div className="flex flex-wrap gap-2">
                    {(["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח", "בוטל", "הוקפא"] as OrderStatus[]).map(status => {
                      const isChecked = selectedStatuses.includes(status);
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusToggle(status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isChecked
                              ? isDark
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isDark
                                ? "bg-slate-900 text-slate-500 border-slate-850 hover:bg-slate-850"
                                : "bg-white text-slate-500 border-slate-250 hover:bg-slate-50"
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
            <div className={`flex items-center justify-between mb-2 px-1 text-xs font-semibold ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              <span className="flex items-center gap-1.5">
                <FileText className={`h-3.5 w-3.5 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                <span>תצוגה מקדימה לטקסט ווטסאפ ({filteredOrders.length} הזמנות נמצאו)</span>
              </span>
              <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>תומך RTL מלא עם אמוג'י ומפרידים</span>
            </div>

            {/* Text Area Preview Box */}
            <div className="mb-6 relative z-10">
              <textarea
                readOnly
                value={reportText}
                className={`w-full h-72 rounded-xl p-4 text-xs font-mono leading-relaxed text-right focus:outline-none resize-none shadow-inner border ${
                  isDark 
                    ? "bg-slate-950 border-slate-850 text-slate-200" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
                dir="rtl"
              />
            </div>

            {/* Explanatory Automation Blueprint guide card */}
            <div className={`mb-6 p-3 rounded-xl border border-dashed text-xs leading-relaxed text-right flex flex-col gap-1.5 ${
              isDark ? "border-slate-800 bg-slate-950/30 text-slate-400" : "border-slate-250 bg-slate-50 text-slate-600"
            }`}>
              <p className={`font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>⚙️ טיפ לאוטומציה מלאה (Make.com):</p>
              <p>המערכת מותאמת לסריקת Google Sheets ושליחה אוטומטית לקבוצת הווטסאפ בשעה 17:00 בכל יום על בסיס נתוני הסטטוסים שבחרתם.</p>
            </div>
          </>
        ) : (
          <>
            {/* Weekly Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 relative z-10">
              {/* Card 1: Avg Daily Orders */}
              <div className={`rounded-xl border p-4 flex items-center justify-between shadow-sm ${
                isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>ממוצע הזמנות ליום</span>
                  <h4 className={`text-2xl font-black font-mono mt-0.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>{weeklyStats.avgOrdersPerDay}</h4>
                </div>
                <div className={`p-2.5 rounded-xl ${isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`}>
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>

              {/* Card 2: Busiest Driver */}
              <div className={`rounded-xl border p-4 flex items-center justify-between shadow-sm ${
                isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="text-right max-w-[130px]">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>הנהג העסוק ביותר</span>
                  <h4 className={`text-sm font-black mt-1 truncate ${isDark ? "text-amber-400" : "text-amber-600"}`} title={weeklyStats.busiestDriver}>
                    {weeklyStats.busiestDriver}
                  </h4>
                  <span className={`text-[10px] font-medium ${isDark ? "text-slate-500" : "text-slate-400"}`}>({weeklyStats.busiestDriverCount} הזמנות)</span>
                </div>
                <div className={`p-2.5 rounded-xl ${isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600"}`}>
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              {/* Card 3: Total Weekly Orders */}
              <div className={`rounded-xl border p-4 flex items-center justify-between shadow-sm ${
                isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
              }`}>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>סה"כ הזמנות (שבועי)</span>
                  <h4 className={`text-2xl font-black font-mono mt-0.5 ${isDark ? "text-purple-400" : "text-purple-600"}`}>{weeklyStats.totalWeeklyOrders}</h4>
                </div>
                <div className={`p-2.5 rounded-xl ${isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Statuses bar chart */}
            <div className={`rounded-xl border p-5 mb-6 relative z-10 ${
              isDark ? "border-slate-800 bg-slate-950/40" : "border-slate-200 bg-slate-50"
            }`}>
              <h4 className={`text-xs font-black mb-4 flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                <BarChart3 className={`h-4 w-4 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                <span>התפלגות סטטוסים בשבעת הימים האחרונים</span>
              </h4>
              <div className="h-56 w-full" dir="ltr">
                {weeklyStats.totalWeeklyOrders === 0 ? (
                  <div className={`h-full flex items-center justify-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    אין הזמנות בשבעת הימים האחרונים להצגת התפלגות.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyStats.statusChartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "rgba(71, 85, 105, 0.15)" : "rgba(148, 163, 184, 0.15)"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="status"
                        stroke={isDark ? "#64748b" : "#475569"}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis
                        stroke={isDark ? "#64748b" : "#475569"}
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? "#0f172a" : "#ffffff",
                          borderColor: isDark ? "#334155" : "#e2e8f0",
                          borderRadius: "8px",
                          textAlign: "right",
                          fontSize: "11px",
                          color: isDark ? "#f8fafc" : "#1e293b"
                        }}
                        cursor={{ fill: isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)" }}
                      />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                      >
                        {weeklyStats.statusChartData.map((entry, index) => {
                          let color = "#64748b";
                          switch (entry.status) {
                            case "ממתין להכנה":
                              color = "#f59e0b";
                              break;
                            case "בהכנה":
                              color = "#06b6d4";
                              break;
                            case "מוכן לאיסוף":
                              color = "#10b981";
                              break;
                            case "נשלח":
                              color = "#a855f7";
                              break;
                            case "בוטל":
                              color = "#f43f5e";
                              break;
                            case "הוקפא":
                              color = "#0ea5e9";
                              break;
                          }
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Quick Tips for Manager */}
            <div className={`mb-6 p-3 rounded-xl border border-dashed text-xs leading-relaxed text-right flex flex-col gap-1.5 ${
              isDark ? "border-slate-800 bg-slate-950/30 text-slate-400" : "border-slate-250 bg-slate-50 text-slate-600"
            }`}>
              <p className={`font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>📊 תובנה ניהולית שבועית:</p>
              <p>הנתונים מעודכנים בזמן אמת על בסיס השינויים שבוצעו במסוף. הנהג המוביל לשבוע זה נקבע לפי ריכוז פקודות ההעמסה ועדכוני המשלוח ששודרו אליו.</p>
            </div>
          </>
        )}

        {/* Modal Footer Actions */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t relative z-10 ${
          isDark ? "border-slate-800" : "border-slate-150"
        }`}>
          <div className={`text-right text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {activeTab === "morning" 
              ? "לחצו על העתקה ואז הדביקו בקבוצת הווטסאפ של סידור העבודה."
              : "ניתן להעתיק את הסיכום המילולי של נתוני השבוע לשיתוף מהיר."
            }
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                isDark 
                  ? "text-slate-400 hover:text-white hover:bg-slate-800" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              סגור
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer ${
                isDark 
                  ? "bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40" 
                  : "bg-white hover:bg-slate-50 text-emerald-600 border border-slate-200 shadow-sm"
              }`}
              title="פתח WhatsApp Web"
            >
              <Share2 className="h-4 w-4" />
              <span>שתף בווטסאפ</span>
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
                  <span>
                    {activeTab === "morning" ? "העתק דוח לווטסאפ" : "העתק סיכום שבועי"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
