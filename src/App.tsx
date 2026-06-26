import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import OrderStats from "./components/OrderStats";
import OrderDashboard from "./components/OrderDashboard";
import OrderCard from "./components/OrderCard";
import OrderFormModal from "./components/OrderFormModal";
import ReportModal from "./components/ReportModal";
import NoteModal from "./components/NoteModal";
import { INITIAL_ORDERS } from "./data";
import { Order, OrderStatus, parseItemsText, getFormattedTimestamp, mapCsvToOrders } from "./types";
import { playNotificationSound } from "./utils/audio";
import { Search, Filter, Calendar, RefreshCw, Upload, Download, Info, Check, Trash2, ArrowUpDown, Shield, Wifi, WifiOff, Moon, Sun, Settings, Link } from "lucide-react";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("הכל");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("הכל");
  const [customDate, setCustomDate] = useState("");
  
  // Bulk Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [noteOrder, setNoteOrder] = useState<Order | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<"date" | "number">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // PWA & Google Sheets States
  // ----------------------------------------------------
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("sabanos_theme") as "dark" | "light") || "dark";
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem("sabanos_sheet_url") || "";
  });
  const [showSettings, setShowSettings] = useState(false);

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

  // Network offline/online listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showNotification("המכשיר חזר למצב מקוון! סנכרון פעיל.", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification("עברת למצב אופליין. המערכת תציג נתונים שמורים.", "info");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync with Google Sheet
  const fetchDataFromSheet = async (customUrl?: string) => {
    const urlToFetch = customUrl !== undefined ? customUrl : sheetUrl;
    if (!urlToFetch) {
      showNotification("אנא הגדר קישור לגוגל שיטס בהגדרות המערכת", "info");
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      if (!navigator.onLine) {
        throw new Error("אין חיבור רשת. לא ניתן לסנכרן עם גוגל שיטס כעת.");
      }

      let targetUrl = urlToFetch.trim();
      // Auto-convert shareable view link to published CSV link
      if (targetUrl.includes("docs.google.com/spreadsheets") && !targetUrl.includes("output=csv")) {
        const match = targetUrl.match(/\/d\/([^\/]+)/);
        if (match && match[1]) {
          targetUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/pub?output=csv`;
        }
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error("נכשל בטעינת הקובץ. אנא וודא שהגיליון פורסם לרשת כקובץ CSV.");
      }

      const csvText = await res.text();
      const sheetOrders = mapCsvToOrders(csvText);

      if (sheetOrders.length === 0) {
        throw new Error("לא נמצאו הזמנות תקינות. וודא ששמות העמודות בגיליון תואמים למבוקש.");
      }

      // Check for new orders to play hardware chime
      const stored = localStorage.getItem("sabanos_orders");
      const currentOrdersList = stored ? JSON.parse(stored) : [];
      if (Array.isArray(currentOrdersList) && currentOrdersList.length > 0) {
        const existingNumbers = new Set(currentOrdersList.map((o: any) => o.orderNumber));
        const hasNewOrder = sheetOrders.some(o => !existingNumbers.has(o.orderNumber));
        if (hasNewOrder) {
          playNotificationSound();
          showNotification("סונכרן בהצלחה! התקבלו הזמנות חדשות בסידור.", "success");
        } else {
          showNotification("סונכרן בהצלחה! אין הזמנות חדשות.", "success");
        }
      } else {
        playNotificationSound();
        showNotification("סינכרון ראשוני מגוגל שיטס הושלם בהצלחה!", "success");
      }

      updateOrdersState(sheetOrders);
    } catch (err: any) {
      console.error("Fetch sheet error:", err);
      setFetchError(err.message || "שגיאה בגישה לגוגל שיטס");
      showNotification("שגיאת סנכרון: " + (err.message || ""), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Load from localStorage and auto-sync
  useEffect(() => {
    let initialLoaded = false;
    try {
      const stored = localStorage.getItem("sabanos_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          initialLoaded = true;
        }
      }
    } catch (e) {
      console.error("Error loading orders from localStorage:", e);
    }

    if (!initialLoaded) {
      setOrders(INITIAL_ORDERS);
      localStorage.setItem("sabanos_orders", JSON.stringify(INITIAL_ORDERS));
    }

    // Auto-sync on startup if URL is configured
    const savedUrl = localStorage.getItem("sabanos_sheet_url") || "";
    if (savedUrl && navigator.onLine) {
      fetchDataFromSheet(savedUrl);
    }
  }, []);

  // Toggle theme helper
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("sabanos_theme", nextTheme);
    showNotification(`המערכת הועברה למצב ${nextTheme === "dark" ? "כהה" : "בהיר"}`, "info");
  };

  // Save Sheet URL setting
  const handleSaveSheetUrl = (newUrl: string) => {
    setSheetUrl(newUrl);
    localStorage.setItem("sabanos_sheet_url", newUrl);
    setShowSettings(false);
    showNotification("כתובת הגיליון נשמרה בהצלחה. מתחיל סנכרון...", "success");
    fetchDataFromSheet(newUrl);
  };

  // Show auto-dismissing notifications
  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Helper to update state and localStorage
  const updateOrdersState = (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem("sabanos_orders", JSON.stringify(newOrders));
  };

  // 2. Status Change
  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = orders.map(order => {
      if (order.id === orderId) {
        if (order.status !== newStatus) {
          const newLogEntry = {
            status: newStatus,
            timestamp: getFormattedTimestamp()
          };
          const existingLog = order.statusLog || [];
          return {
            ...order,
            status: newStatus,
            statusLog: [...existingLog, newLogEntry]
          };
        }
      }
      return order;
    });
    updateOrdersState(updated);
    showNotification(`הסטטוס עודכן בהצלחה ל"${newStatus}"`, "success");
  };

  // 3. Add or Edit Order Submission
  const handleOrderFormSubmit = (orderData: Omit<Order, "id" | "parsedItems"> & { id?: string }) => {
    if (orderData.id) {
      // Editing Mode
      const updated = orders.map(order => {
        if (order.id === orderData.id) {
          const hasStatusChanged = order.status !== orderData.status;
          const newLogEntry = hasStatusChanged ? {
            status: orderData.status,
            timestamp: getFormattedTimestamp()
          } : null;
          
          const existingLog = order.statusLog || [];
          const statusLog = newLogEntry ? [...existingLog, newLogEntry] : existingLog;

          return {
            ...order,
            date: orderData.date,
            orderNumber: orderData.orderNumber,
            customerName: orderData.customerName,
            deliveryAddress: orderData.deliveryAddress,
            contactPerson: orderData.contactPerson,
            items: orderData.items,
            parsedItems: parseItemsText(orderData.items),
            status: orderData.status,
            notes: orderData.notes,
            statusLog
          };
        }
        return order;
      });
      updateOrdersState(updated);
      showNotification(`הזמנה #${orderData.orderNumber} עודכנה בהצלחה`, "success");
    } else {
      // Create Mode
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        date: orderData.date,
        orderNumber: orderData.orderNumber,
        customerName: orderData.customerName,
        deliveryAddress: orderData.deliveryAddress,
        contactPerson: orderData.contactPerson,
        items: orderData.items,
        parsedItems: parseItemsText(orderData.items),
        status: orderData.status,
        notes: orderData.notes,
        statusLog: [
          {
            status: orderData.status,
            timestamp: getFormattedTimestamp()
          }
        ]
      };
      updateOrdersState([newOrder, ...orders]);
      showNotification(`הזמנה #${orderData.orderNumber} נוספה לסידור`, "success");
    }
    setEditingOrder(null);
  };

  // 4. Delete Order
  const handleDeleteOrder = (orderId: string) => {
    const orderToDelete = orders.find(o => o.id === orderId);
    if (!orderToDelete) return;

    if (window.confirm(`האם אתה בטוח שברצונך למחוק את הזמנה #${orderToDelete.orderNumber}?`)) {
      const updated = orders.filter(o => o.id !== orderId);
      updateOrdersState(updated);
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId)); // Clean deleted from selection
      showNotification(`הזמנה #${orderToDelete.orderNumber} נמחקה`, "info");
    }
  };

  // 4b. Note Modal Actions
  const handleOpenNoteModal = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setNoteOrder(order);
    }
  };

  const handleSaveNote = (noteText: string) => {
    if (!noteOrder) return;
    const updated = orders.map(order => {
      if (order.id === noteOrder.id) {
        return { ...order, notes: noteText };
      }
      return order;
    });
    updateOrdersState(updated);
    showNotification(`הערה להזמנה #${noteOrder.orderNumber} עודכנה בהצלחה`, "success");
    setNoteOrder(null);
  };

  const handleSelectOrder = (orderId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  // Reset to initial demo orders
  const handleResetDemoData = () => {
    if (window.confirm("האם ברצונך לאפס את הנתונים לנתוני ההדגמה הראשוניים? כל השינויים שביצעת יימחקו.")) {
      updateOrdersState(INITIAL_ORDERS);
      showNotification("הנתונים אופסו לנתוני ההדגמה", "info");
    }
  };

  // CSV Export logic matching the requested Google Sheets structure:
  // Date, Order Number, Customer Name, Delivery Address, Contact Person, Items, Status
  const handleExportCSV = () => {
    try {
      const headers = ["Date", "Order Number", "Customer Name", "Delivery Address", "Contact Person", "Items", "Status"];
      const rows = orders.map(o => [
        o.date,
        o.orderNumber,
        o.customerName,
        o.deliveryAddress,
        o.contactPerson,
        o.items.replace(/"/g, '""'), // escape double quotes for CSV safety
        o.status
      ]);

      // Wrap in double quotes and join with commas
      const csvContent = "\uFEFF" + [ // BOM for Excel RTL support
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SabanOS_Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification("קובץ CSV יוצא בהצלחה", "success");
    } catch (e) {
      console.error(e);
      showNotification("ייצוא קובץ נכשל", "error");
    }
  };

  // CSV Import logic matching the Google Sheets structure
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) return;

        // Split by lines, filtering empty ones
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) {
          showNotification("הקובץ ריק או לא תקין", "error");
          return;
        }

        const newImportedOrders: Order[] = [];
        // Regex to parse CSV lines with quoted values safely
        const csvParserRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        // Start from row 1 (skipping headers)
        for (let i = 1; i < lines.length; i++) {
          const rawRow = lines[i];
          const rawCells = rawRow.split(csvParserRegex);
          
          if (rawCells.length < 7) continue;

          // Clean up outer quotes and escaped characters
          const cells = rawCells.map(cell => {
            let cleaned = cell.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
              cleaned = cleaned.substring(1, cleaned.length - 1);
            }
            return cleaned.replace(/""/g, '"');
          });

          const [csvDate, csvOrderNum, csvCustName, csvAddr, csvContact, csvItems, csvStatus] = cells;

          // Verify if fields are valid before importing
          if (!csvOrderNum || !csvCustName || !csvItems) continue;

          // Map to correct status option or default to "ממתין להכנה"
          let finalStatus: OrderStatus = "ממתין להכנה";
          if (["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"].includes(csvStatus)) {
            finalStatus = csvStatus as OrderStatus;
          }

          newImportedOrders.push({
            id: `imported-${Date.now()}-${i}`,
            date: csvDate || getRelativeDateString(1),
            orderNumber: csvOrderNum,
            customerName: csvCustName,
            deliveryAddress: csvAddr || "לא צוינה כתובת",
            contactPerson: csvContact || "לא צוין איש קשר",
            items: csvItems,
            parsedItems: parseItemsText(csvItems),
            status: finalStatus
          });
        }

        if (newImportedOrders.length === 0) {
          showNotification("לא נמצאו הזמנות תקינות לייבוא בקובץ", "error");
        } else {
          const merged = [...newImportedOrders, ...orders];
          updateOrdersState(merged);
          showNotification(`ייבוא הושלם! ${newImportedOrders.length} הזמנות נוספו לסידור`, "success");
        }
      } catch (err) {
        console.error(err);
        showNotification("שגיאה בניתוח קובץ ה-CSV", "error");
      }
      // Reset input value
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Filter application
  const filteredOrders = orders.filter(order => {
    // 1. Search Query Filter (Customer Name or Order Number)
    const matchSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber.includes(searchQuery);

    // 2. Status Tab Filter
    const matchStatus = selectedStatusTab === "הכל" || order.status === selectedStatusTab;

    // 3. Date Filter
    let matchDate = true;
    if (selectedDateFilter === "היום") {
      matchDate = order.date === todayStr;
    } else if (selectedDateFilter === "מחר") {
      matchDate = order.date === tomorrowStr;
    } else if (selectedDateFilter === "מותאם") {
      matchDate = order.date === customDate;
    }

    return matchSearch && matchStatus && matchDate;
  });

  // Sorting logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "date") {
      comparison = a.date.localeCompare(b.date);
    } else if (sortBy === "number") {
      comparison = a.orderNumber.localeCompare(b.orderNumber);
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleSort = (type: "date" | "number") => {
    if (sortBy === type) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(type);
      setSortOrder("desc"); // Default to desc for dates, asc for others
    }
  };

  // Bulk Actions & Selections (placed below sortedOrders to prevent hoisting issues)
  const handleSelectAllFiltered = (checked: boolean) => {
    if (checked) {
      const allFilteredIds = sortedOrders.map(o => o.id);
      setSelectedOrderIds(allFilteredIds);
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleBulkStatusChange = (newStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    const timestamp = getFormattedTimestamp();
    const updated = orders.map(order => {
      if (selectedOrderIds.includes(order.id)) {
        if (order.status !== newStatus) {
          const existingLog = order.statusLog || [];
          return {
            ...order,
            status: newStatus,
            statusLog: [...existingLog, { status: newStatus, timestamp }]
          };
        }
      }
      return order;
    });
    updateOrdersState(updated);
    showNotification(`הסטטוס של ${selectedOrderIds.length} הזמנות עודכן בהצלחה ל"${newStatus}"`, "success");
    setSelectedOrderIds([]); // Reset selection
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.length === 0) return;
    if (window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedOrderIds.length} הזמנות נבחרות?`)) {
      const updated = orders.filter(order => !selectedOrderIds.includes(order.id));
      updateOrdersState(updated);
      setSelectedOrderIds([]); // Reset selection
      showNotification(`${selectedOrderIds.length} הזמנות נמחקו מהסידור`, "info");
    }
  };

  const isAllFilteredSelected = sortedOrders.length > 0 && sortedOrders.every(o => selectedOrderIds.includes(o.id));
  const isSomeFilteredSelected = sortedOrders.length > 0 && sortedOrders.some(o => selectedOrderIds.includes(o.id)) && !isAllFilteredSelected;

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedStatusTab("הכל");
    setSelectedDateFilter("הכל");
    setCustomDate("");
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col font-sans pb-24 antialiased relative overflow-hidden transition-colors duration-500 ${
      isDark ? "bg-[#090d16] text-slate-100" : "bg-[#f8fafc] text-slate-800"
    }`} dir="rtl">
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="w-full bg-amber-600 text-white text-center py-2 px-4 text-xs font-bold z-40 flex items-center justify-center gap-2 relative shadow-lg">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span>המערכת פועלת כעת במצב אופליין (מקומי). חלק מהתכונות וסנכרון הגיליונות מושבתים זמנית.</span>
        </div>
      )}

      {/* Ambient Background Glows */}
      {isDark && (
        <>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
        </>
      )}

      {/* Header */}
      <Header
        onOpenReportModal={() => setIsReportOpen(true)}
        onOpenAddOrderModal={() => {
          setEditingOrder(null);
          setIsFormOpen(true);
        }}
      />

      {/* Main Content Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 relative z-10">
        
        {/* Floating Notification Toast */}
        {notification && (
          <div className={`fixed top-24 left-4 z-50 animate-fade-in-down flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md max-w-md ${
            isDark ? "border-slate-800 bg-slate-900/90 text-slate-100" : "border-slate-200 bg-white/95 text-slate-800"
          }`}>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold">{notification.message}</p>
          </div>
        )}

        {/* Top Analytics Stats Grid */}
        <OrderStats orders={orders} theme={theme} />

        {/* Analytics Dashboard Visualizer Component */}
        <OrderDashboard orders={orders} theme={theme} />

        {/* Filter Controls Row */}
        <div className={`w-full flex flex-col gap-4 p-4 md:p-5 rounded-2xl border backdrop-blur-sm relative overflow-hidden z-10 transition-all ${
          isDark 
            ? "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40" 
            : "border-slate-200/80 bg-white shadow-sm text-slate-800"
        }`}>
          {/* Filter Panel Top Highlight line */}
          {isDark && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent pointer-events-none" />
          )}
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search and Tabs */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className={`absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                <input
                  type="text"
                  id="search-orders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border rounded-xl pl-4 pr-11 py-2.5 text-xs focus:outline-none focus:ring-1 transition-all text-right ${
                    isDark
                      ? "bg-slate-950 border-slate-850 focus:border-cyan-500 text-white placeholder-slate-500 focus:ring-slate-700"
                      : "bg-slate-50 border-slate-200 focus:border-cyan-600 text-slate-800 placeholder-slate-400 focus:ring-slate-200"
                  }`}
                  placeholder="חפש לפי שם לקוח או מספר הזמנה..."
                />
              </div>

              {/* Status Tabs */}
              <div className={`flex border p-1 rounded-xl overflow-x-auto gap-0.5 ${
                isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
              }`}>
                {["הכל", "ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"].map((tab) => (
                  <button
                    key={tab}
                    id={`tab-${tab}`}
                    onClick={() => setSelectedStatusTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedStatusTab === tab
                        ? isDark
                          ? "bg-slate-900 text-cyan-400 border border-slate-800/80 shadow-inner"
                          : "bg-white text-cyan-600 border border-slate-200 shadow-sm"
                        : isDark
                          ? "text-slate-400 hover:text-slate-200"
                          : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab === "הכל" ? "כל הסטטוסים" : tab}
                  </button>
                ))}
              </div>

            </div>

            {/* Quick Date Filters & CSV Options */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Date Filters */}
              <div className={`flex items-center gap-1.5 border p-1 rounded-xl ${
                isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
              }`}>
                <Calendar className={`h-3.5 w-3.5 mx-1.5 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                {["הכל", "היום", "מחר", "מותאם"].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      if (val === "מותאם") {
                        setSelectedDateFilter("מותאם");
                        if (!customDate) setCustomDate(todayStr);
                      } else {
                        setSelectedDateFilter(val);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      (val === "מותאם" ? selectedDateFilter === "מותאם" : selectedDateFilter === val)
                        ? isDark
                          ? "bg-slate-900 text-slate-200"
                          : "bg-white text-slate-700 shadow-sm"
                        : isDark
                          ? "text-slate-500 hover:text-slate-300"
                          : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {val === "מותאם" ? "תאריך..." : val}
                  </button>
                ))}
              </div>

              {/* Custom Date Input */}
              {selectedDateFilter === "מותאם" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className={`border rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                    isDark ? "bg-slate-950 border-slate-850 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              )}

              {/* Reset filter indicators */}
              {(searchQuery || selectedStatusTab !== "הכל" || selectedDateFilter !== "הכל") && (
                <button
                  onClick={clearAllFilters}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    isDark
                      ? "border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-slate-200"
                      : "border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                  }`}
                  title="נקה את כל הסינונים"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}

            </div>

          </div>

          {/* CSV File Import/Export Actions Tray */}
          <div className={`flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t ${isDark ? "border-slate-900/60" : "border-slate-100"}`}>
            <div className={`flex items-center gap-1 text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              <Info className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-cyan-500" : "text-cyan-600"}`} />
              <span>ייבוא/ייצוא קבצי CSV במבנה Google Sheets (תאריך קליטה, מספר הזמנה, שם לקוח, כתובת אספקה, איש קשר, פריטים, סטטוס ווצאפ)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemoData}
                className={`px-3 py-1.5 text-[11px] font-bold border rounded-xl transition-all cursor-pointer ${
                  isDark
                    ? "text-slate-500 hover:text-slate-300 bg-slate-950 hover:bg-slate-900 border-slate-850"
                    : "text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                }`}
              >
                איפוס נתוני הדגמה
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
                id="csv-file-input"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-xl transition-all cursor-pointer ${
                  isDark
                    ? "text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border-slate-850"
                    : "text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-cyan-500" />
                <span>ייבא Google Sheet / CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-xl transition-all cursor-pointer ${
                  isDark
                    ? "text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border-slate-850"
                    : "text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                }`}
              >
                <Download className="h-3.5 w-3.5 text-teal-500" />
                <span>ייצא ל-CSV</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3.5 border-t text-right ${isDark ? "border-slate-900/60" : "border-slate-100"}`}>
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-2 text-xs font-bold cursor-pointer ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = isSomeFilteredSelected;
                    }
                  }}
                  onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 accent-cyan-500 cursor-pointer"
                />
                <span>בחר הכל ({sortedOrders.length})</span>
              </label>

              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>•</span>
                  <span>נבחרו</span>
                  <span className={`font-mono font-extrabold px-1.5 py-0.2 rounded font-sans ${isDark ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/15" : "text-cyan-600 bg-cyan-50 border border-cyan-200"}`}>
                    {selectedOrderIds.length}
                  </span>
                  <span>הזמנות</span>
                </div>
              )}
            </div>

            {selectedOrderIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>עדכון סטטוס קבוצתי:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"] as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer font-sans ${
                        isDark
                          ? "border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-cyan-400 text-slate-300"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:text-cyan-600 text-slate-700 shadow-sm"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className={`h-4 w-[1px] mx-1 hidden md:block ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />

                <button
                  onClick={handleBulkDelete}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer font-sans ${
                    isDark
                      ? "text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/30"
                      : "text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                  }`}
                  title="מחק את כל ההזמנות שנבחרו"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>מחק נבחרים</span>
                </button>

                <button
                  onClick={() => setSelectedOrderIds([])}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer font-sans ${
                    isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-750"
                  }`}
                >
                  בטל בחירה
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>💡 בחר תיבות סימון על גבי כרטיסי ההזמנה לביצוע פעולות קבוצתיות</span>
              </div>
            )}
          </div>

        </div>

        {/* Sorting and Summary Info Header */}
        <div className="flex items-center justify-between px-1">
          
          <div className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span>נמצאו </span>
            <span className={`font-mono font-extrabold px-1.5 py-0.2 rounded ${
              isDark ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/15" : "text-cyan-600 bg-cyan-50 border border-cyan-200"
            }`}>
              {sortedOrders.length}
            </span>
            <span> הזמנות תואמות</span>
          </div>

          {/* Sort Buttons */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-medium">מיין לפי:</span>
            
            <button
              onClick={() => toggleSort("date")}
              className={`flex items-center gap-1 font-bold cursor-pointer ${
                sortBy === "date" 
                  ? isDark ? "text-cyan-400" : "text-cyan-600" 
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>תאריך מיועד</span>
              {sortBy === "date" && (
                <span className="text-[9px] font-mono">{sortOrder === "asc" ? "▲" : "▼"}</span>
              )}
            </button>

            <button
              onClick={() => toggleSort("number")}
              className={`flex items-center gap-1 font-bold cursor-pointer ${
                sortBy === "number" 
                  ? isDark ? "text-cyan-400" : "text-cyan-600" 
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>מספר הזמנה</span>
              {sortBy === "number" && (
                <span className="text-[9px] font-mono">{sortOrder === "asc" ? "▲" : "▼"}</span>
              )}
            </button>
          </div>

        </div>

        {/* Loading and Error States during Fetch */}
        {isLoading && orders.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-20 rounded-2xl border ${
            isDark ? "bg-slate-900/20 border-slate-850" : "bg-white border-slate-200 shadow-sm"
          } text-center`}>
            <div className="relative flex h-16 w-16 items-center justify-center mb-4">
              <div className="absolute h-12 w-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              <RefreshCw className="h-6 w-6 text-cyan-500 animate-spin" />
            </div>
            <h3 className={`text-base font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>טוען נתונים מגוגל שיטס...</h3>
            <p className="text-xs text-slate-500 mt-1">אנא המתן בזמן שהמערכת מושכת את הזמנות 'לוג_הזמנות_מערכת'</p>
          </div>
        ) : fetchError && orders.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border text-center max-w-md mx-auto ${
            isDark ? "bg-slate-900/20 border-slate-850 text-slate-200" : "bg-white border-slate-200 shadow-sm text-slate-700"
          }`}>
            <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 mb-4 animate-bounce">
              <Info className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold">סנכרון הנתונים נכשל</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{fetchError}</p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => fetchDataFromSheet()}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
              >
                נסה שוב
              </button>
              <button
                onClick={() => {
                  updateOrdersState(INITIAL_ORDERS);
                  setFetchError(null);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl border ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                טען נתוני הדגמה
              </button>
            </div>
          </div>
        ) : (
          /* Orders Responsive Cards Grid */
          sortedOrders.length === 0 ? (
            <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center ${
              isDark ? "border-slate-850 bg-slate-900/10" : "border-slate-200 bg-white shadow-sm"
            }`}>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center border text-slate-500 mb-3.5 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-250"
              }`}>
                <Filter className="h-5 w-5" />
              </div>
              <p className={`text-sm font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>לא נמצאו הזמנות המקיימות את תנאי הסינון</p>
              <p className="text-xs text-slate-500 mt-1">נסה לשנות את מילות החיפוש או להסיר מסנני תאריך וסטטוס</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="orders-grid">
              {sortedOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={handleStatusChange}
                  onEdit={(o) => {
                    setEditingOrder(o);
                    setIsFormOpen(true);
                  }}
                  onDelete={handleDeleteOrder}
                  onAddNote={handleOpenNoteModal}
                  isSelected={selectedOrderIds.includes(order.id)}
                  onSelectChange={handleSelectOrder}
                  theme={theme}
                />
              ))}
            </div>
          )
        )}

      </main>

      {/* כפתור חכם - Smart Floating Action Button Console */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-end gap-3" id="floating-action-console">
        {/* Sync Status / Offline Indicator Mini-badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xl text-[10px] font-bold backdrop-blur-md transition-all duration-300 ${
          isOnline 
            ? isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
            : "bg-amber-500/10 border-amber-500/25 text-amber-400"
        }`}>
          <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span>{isOnline ? "מחובר (Online)" : "אופליין (Offline)"}</span>
        </div>

        <div className="flex gap-2.5">
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isDark 
                ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white" 
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
            title="הגדרות גוגל שיטס"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Sync Button */}
          <button
            onClick={() => fetchDataFromSheet()}
            disabled={isLoading}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isDark 
                ? "bg-slate-900 border-slate-800 text-cyan-400 hover:text-cyan-300" 
                : "bg-white border-slate-200 text-cyan-600 hover:text-cyan-500"
            }`}
            title="סנכרן כעת"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Smart Theme Switcher FAB */}
          <button
            onClick={toggleTheme}
            className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
              isDark 
                ? "bg-slate-900 border-slate-800 text-amber-400 hover:text-amber-300" 
                : "bg-white border-slate-200 text-amber-600 hover:text-amber-500"
            }`}
            title={isDark ? "עבור למצב בהיר" : "עבור למצב כהה"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Google Sheets Sync Guide Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-right" dir="rtl" id="settings-modal">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-colors duration-300 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Link className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">הגדרת סנכרון גוגל שיטס</h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>חיבור ישיר לגיליון 'לוג_הזמנות_מערכת'</p>
              </div>
            </div>
            
            <div className={`text-xs mb-4 leading-relaxed p-3.5 rounded-xl border ${
              isDark ? "bg-slate-950/50 border-slate-850 text-slate-400" : "bg-slate-50 border-slate-250 text-slate-600"
            }`}>
              <span className="font-bold block mb-1 text-cyan-500">מדריך פרסום מהיר:</span>
              על מנת שהמערכת תוכל לקרוא את הנתונים שלך, פעל לפי השלבים הבאים בגוגל שיטס:
              <ol className="list-decimal list-inside space-y-1 mt-1.5 font-sans">
                <li>פתח את גיליון ההזמנות שלך</li>
                <li>לחץ בתפריט העליון על: <strong className="text-cyan-600">קובץ (File)</strong></li>
                <li>בחר ב: <strong className="text-cyan-600">שיתוף (Share)</strong> ← <strong className="text-cyan-600">פרסם באינטרנט (Publish to web)</strong></li>
                <li>שנה את הבחירה מ-"כל המסמך" לגיליון: <strong className="text-cyan-600">לוג_הזמנות_מערכת</strong></li>
                <li>שנה את סוג הקובץ מ-"דף אינטרנט" ל-<strong className="text-cyan-600">ערכים מופרדים בפסיקים (CSV.)</strong></li>
                <li>לחץ על כפתור <strong className="text-cyan-600">פרסם (Publish)</strong> והעתק את הקישור שנוצר!</li>
              </ol>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>הדבק כאן את קישור ה-CSV המפורסם:</label>
                <input
                  type="text"
                  className={`w-full text-xs p-3 rounded-xl border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark 
                      ? "bg-slate-950 border-slate-850 text-white" 
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  defaultValue={sheetUrl}
                  id="sheet-url-input"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const val = (document.getElementById("sheet-url-input") as HTMLInputElement)?.value || "";
                    handleSaveSheetUrl(val);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/15"
                >
                  שמור וסנכרן
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-xl border cursor-pointer ${
                    isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals Containers */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        orders={orders}
      />

      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={handleOrderFormSubmit}
        editingOrder={editingOrder}
      />

      <NoteModal
        isOpen={noteOrder !== null}
        onClose={() => setNoteOrder(null)}
        orderNumber={noteOrder?.orderNumber || ""}
        initialNote={noteOrder?.notes || ""}
        onSave={handleSaveNote}
      />

    </div>
  );
}
