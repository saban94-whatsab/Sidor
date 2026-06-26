import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import OrderStats from "./components/OrderStats";
import OrderDashboard from "./components/OrderDashboard";
import OrderCard from "./components/OrderCard";
import OrderFormModal from "./components/OrderFormModal";
import ReportModal from "./components/ReportModal";
import NoteModal from "./components/NoteModal";
import { INITIAL_ORDERS } from "./data";
import { Order, OrderStatus, parseItemsText, getFormattedTimestamp } from "./types";
import { Search, Filter, Calendar, RefreshCw, Upload, Download, Info, Check, Trash2, ArrowUpDown } from "lucide-react";

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

  // 1. Load orders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("sabanos_orders");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading orders from localStorage:", e);
    }
    // Fallback to initial orders
    setOrders(INITIAL_ORDERS);
    localStorage.setItem("sabanos_orders", JSON.stringify(INITIAL_ORDERS));
  }, []);

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16 antialiased relative overflow-hidden" dir="rtl">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />

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
        
        {/* Floating Notification Panel */}
        {notification && (
          <div className="fixed top-24 left-4 z-50 animate-fade-in-down flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-2xl backdrop-blur-md max-w-md">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <Check className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-slate-100">{notification.message}</p>
          </div>
        )}

        {/* Top Analytics Stats Grid */}
        <OrderStats orders={orders} />

        {/* Analytics Dashboard Visualizer Component */}
        <OrderDashboard orders={orders} />

        {/* Filter Controls Row */}
        <div className="w-full flex flex-col gap-4 p-4 md:p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40 backdrop-blur-sm relative overflow-hidden z-10">
          {/* Filter Panel Top Highlight line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search and Tabs */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1">
              
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  id="search-orders"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-xl pl-4 pr-11 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-700 transition-all text-right"
                  placeholder="חפש לפי שם לקוח או מספר הזמנה..."
                />
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-950 border border-slate-850 p-1 rounded-xl overflow-x-auto gap-0.5">
                {["הכל", "ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"].map((tab) => (
                  <button
                    key={tab}
                    id={`tab-${tab}`}
                    onClick={() => setSelectedStatusTab(tab)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedStatusTab === tab
                        ? "bg-slate-900 text-cyan-400 border border-slate-800/80 shadow-inner"
                        : "text-slate-400 hover:text-slate-200"
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
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 p-1 rounded-xl">
                <Calendar className="h-3.5 w-3.5 text-cyan-400 mx-1.5" />
                <button
                  onClick={() => setSelectedDateFilter("הכל")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDateFilter === "הכל"
                      ? "bg-slate-900 text-slate-200"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  הכל
                </button>
                <button
                  onClick={() => setSelectedDateFilter("היום")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDateFilter === "היום"
                      ? "bg-slate-900 text-slate-200"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  היום
                </button>
                <button
                  onClick={() => setSelectedDateFilter("מחר")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDateFilter === "מחר"
                      ? "bg-slate-900 text-slate-200"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  מחר
                </button>
                <button
                  onClick={() => {
                    setSelectedDateFilter("מותאם");
                    if (!customDate) setCustomDate(todayStr);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedDateFilter === "מותאם"
                      ? "bg-slate-900 text-slate-200"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  תאריך...
                </button>
              </div>

              {/* Custom Date Input */}
              {selectedDateFilter === "מותאם" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                />
              )}

              {/* Reset filter indicators */}
              {(searchQuery || selectedStatusTab !== "הכל" || selectedDateFilter !== "הכל") && (
                <button
                  onClick={clearAllFilters}
                  className="p-2 rounded-xl border border-slate-850 hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="נקה את כל הסינונים"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}

            </div>

          </div>

          {/* CSV File Import/Export Actions Tray */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-900/60">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Info className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
              <span>ייבוא/ייצוא קבצי CSV במבנה Google Sheets (תאריך, מספר הזמנה, שם לקוח, כתובת, איש קשר, מוצרים, סטטוס)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemoData}
                className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-300 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all cursor-pointer"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-cyan-500" />
                <span>ייבא Google Sheet / CSV</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-teal-500" />
                <span>ייצא ל-CSV</span>
              </button>
            </div>
          </div>

          {/* Bulk Actions Panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3.5 border-t border-slate-900/60 text-right">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
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
                  <span className="font-mono text-cyan-400 font-extrabold bg-cyan-950/40 border border-cyan-500/15 px-1.5 py-0.2 rounded font-sans">
                    {selectedOrderIds.length}
                  </span>
                  <span>הזמנות</span>
                </div>
              )}
            </div>

            {selectedOrderIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">עדכון סטטוס קבוצתי:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח"] as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 hover:text-cyan-400 transition-all cursor-pointer font-sans"
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden md:block" />

                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 rounded-lg transition-all cursor-pointer font-sans"
                  title="מחק את כל ההזמנות שנבחרו"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>מחק נבחרים</span>
                </button>

                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-300 transition-colors cursor-pointer font-sans"
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
          
          <div className="text-xs font-bold text-slate-400">
            <span>נמצאו </span>
            <span className="font-mono text-cyan-400 font-extrabold bg-cyan-950/40 border border-cyan-500/15 px-1.5 py-0.2 rounded">
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
                sortBy === "date" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
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
                sortBy === "number" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>מספר הזמנה</span>
              {sortBy === "number" && (
                <span className="text-[9px] font-mono">{sortOrder === "asc" ? "▲" : "▼"}</span>
              )}
            </button>
          </div>

        </div>

        {/* Orders Responsive Cards Grid */}
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-slate-850 bg-slate-900/10 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-slate-500 mb-3.5">
              <Filter className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-300">לא נמצאו הזמנות המקיימות את תנאי הסינון</p>
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
              />
            ))}
          </div>
        )}

      </main>

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
