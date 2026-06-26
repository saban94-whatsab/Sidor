import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Header from "./components/Header";
import OrderStats from "./components/OrderStats";
import OrderDashboard from "./components/OrderDashboard";
import DailyVolumeChart from "./components/DailyVolumeChart";
import OrderCard from "./components/OrderCard";
import OrderFormModal from "./components/OrderFormModal";
import ReportModal from "./components/ReportModal";
import NoteModal from "./components/NoteModal";
import OrderStatusHistoryModal from "./components/OrderStatusHistoryModal";
import WhatsAppSummaryModal from "./components/WhatsAppSummaryModal";
import { INITIAL_ORDERS } from "./data";
import { Order, OrderStatus, parseItemsText, getFormattedTimestamp, mapCsvToOrders } from "./types";
import { playNotificationSound } from "./utils/audio";
import { Search, Filter, Calendar, RefreshCw, Upload, Download, Info, Check, Trash2, ArrowUpDown, Shield, Wifi, WifiOff, Moon, Sun, Settings, Link, Clock, Maximize2, Minimize2, Package, Plus, MessageCircle } from "lucide-react";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  
  // ----------------------------------------------------
  // WhatsApp Smart Routing & Audit Log States
  // ----------------------------------------------------
  const [auditLogs, setAuditLogs] = useState<{
    id: string;
    timestamp: string;
    orderNumber: string;
    customerName: string;
    action: string;
    recipient: string;
  }[]>(() => {
    try {
      const stored = localStorage.getItem("sabanos_audit_logs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [whatsappSelectorData, setWhatsappSelectorData] = useState<{
    order: Order;
    type: "loading" | "delivery";
    customerPhone: string;
    selectedRecipientType: "customer" | "driver_hikmat" | "driver_ali" | "custom";
    customPhone: string;
  } | null>(null);

  const addAuditLog = (orderNumber: string, customerName: string, action: string, recipient: string) => {
    const newEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: getFormattedTimestamp(),
      orderNumber,
      customerName,
      action,
      recipient
    };
    const updated = [newEntry, ...auditLogs].slice(0, 100);
    setAuditLogs(updated);
    localStorage.setItem("sabanos_audit_logs", JSON.stringify(updated));
  };

  const extractPhone = (text: string): string => {
    if (!text) return "";
    const cleaned = text.replace(/[-\s]/g, "");
    const match = cleaned.match(/(?:\+972|0)?5\d{8}/);
    if (match) {
      let num = match[0];
      if (num.startsWith("0")) {
        num = "972" + num.slice(1);
      } else if (!num.startsWith("+") && !num.startsWith("972")) {
        num = "972" + num;
      }
      return num.startsWith("+") ? num : "+" + num;
    }
    return "";
  };

  const generateLoadingText = (order: Order) => {
    const sep = "━━━━━━━━━━━━━━━━━━";
    let text = `*פקודת העמסה להזמנה #${order.orderNumber}* 🚚\n`;
    text += `${sep}\n`;
    text += `*לקוח:* ${order.customerName}\n`;
    text += `*כתובת אספקה:* ${order.deliveryAddress}\n`;
    if (order.contactPerson) {
      text += `*איש קשר:* ${order.contactPerson}\n`;
    }
    text += `${sep}\n`;
    text += `*פריטים להעמסה:*\n`;
    order.parsedItems.forEach(item => {
      const skuStr = item.sku ? `[${item.sku}] ` : "";
      text += `• ${skuStr}${item.name} - כמות: *${item.quantity}* יח'\n`;
    });
    text += `${sep}\n`;
    if (order.notes) {
      text += `*הערה מיוחדת:* ${order.notes}\n`;
      text += `${sep}\n`;
    }
    text += `תודה ועבודה בטוחה! 🏗️`;
    return text;
  };

  const generateDeliveryText = (order: Order) => {
    let text = `*עדכון אספקה להזמנה #${order.orderNumber}* 📍\n\n`;
    text += `שלום *${order.customerName}*,\n`;
    text += `ההזמנה שלך מוכנה ויצאה לדרך עם משאית מנוף! 🚚💨\n\n`;
    text += `*כתובת למשלוח:* ${order.deliveryAddress}\n\n`;
    text += `*פירוט הפריטים במשלוח:*\n`;
    order.parsedItems.forEach(item => {
      text += `• ${item.name} - כמות: ${item.quantity} יח'\n`;
    });
    text += `\nנשמח לעמוד לשירותך,\n`;
    text += `סבנוס חומרי בניין בע"מ 🏗️`;
    return text;
  };

  const getWhatsAppUrl = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, "").trim();
    const encodedText = encodeURIComponent(text);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return `https://wa.me/${cleanPhone}?text=${encodedText}`;
    } else {
      return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
  };

  const executeSendWhatsApp = (order: Order, type: "loading" | "delivery", phone: string, recipientName: string) => {
    const text = type === "loading" ? generateLoadingText(order) : generateDeliveryText(order);
    const url = getWhatsAppUrl(phone, text);
    const targetStatus: OrderStatus = type === "loading" ? "בהכנה" : "נשלח";
    const timestamp = getFormattedTimestamp();

    const updated = orders.map(o => {
      if (o.id === order.id) {
        const existingLog = o.statusLog || [];
        return {
          ...o,
          status: targetStatus,
          statusLog: [...existingLog, { status: targetStatus, timestamp }]
        };
      }
      return o;
    });
    updateOrdersState(updated);

    const actionText = type === "loading"
      ? "שלח פקודת העמסה (בהכנה)"
      : "שלח עדכון אספקה (נשלח)";
    addAuditLog(order.orderNumber, order.customerName, actionText, `${recipientName} (${phone})`);
    showNotification(`ההודעה מוכנה למשלוח בווצאפ! סטטוס ההזמנה עודכן ל"${targetStatus}"`, "success");
    window.open(url, "_blank");
  };

  const handleSendLoadingCommand = (order: Order) => {
    const fields = [order.customerName, order.contactPerson, order.deliveryAddress].map(f => f || "");
    const matchesHokmat = fields.some(f => f.includes("חכמת"));
    const matchesAli = fields.some(f => f.includes("עלי"));

    if (matchesHokmat) {
      executeSendWhatsApp(order, "loading", "+972532316985", "חכמת גאבר (נהג)");
    } else if (matchesAli) {
      executeSendWhatsApp(order, "loading", "+972542276631", "עלי נהג (נהג)");
    } else {
      const extracted = extractPhone(order.contactPerson || "");
      setWhatsappSelectorData({
        order,
        type: "loading",
        customerPhone: extracted,
        selectedRecipientType: "driver_hikmat",
        customPhone: ""
      });
    }
  };

  const handleSendDeliveryUpdate = (order: Order) => {
    const fields = [order.customerName, order.contactPerson, order.deliveryAddress].map(f => f || "");
    const matchesHokmat = fields.some(f => f.includes("חכמת"));
    const matchesAli = fields.some(f => f.includes("עלי"));

    if (matchesHokmat) {
      executeSendWhatsApp(order, "delivery", "+972532316985", "חכמת גאבר (נהג)");
    } else if (matchesAli) {
      executeSendWhatsApp(order, "delivery", "+972542276631", "עלי נהג (נהג)");
    } else {
      const extracted = extractPhone(order.contactPerson || "");
      setWhatsappSelectorData({
        order,
        type: "delivery",
        customerPhone: extracted,
        selectedRecipientType: extracted ? "customer" : "driver_hikmat",
        customPhone: ""
      });
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("הכל");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("הכל");
  const [customDate, setCustomDate] = useState("");
  const [dashboardView, setDashboardView] = useState<"active" | "archive">("active");
  const [showDeepArchive, setShowDeepArchive] = useState(false);
  const [showCleanupPrompt, setShowCleanupPrompt] = useState(false);
  const [olderSentCount, setOlderSentCount] = useState(0);

  const handleSetDashboardView = (view: "active" | "archive") => {
    setDashboardView(view);
    if (view === "active") {
      if (selectedStatusTab === "נשלח") {
        setSelectedStatusTab("הכל");
      }
    } else {
      setSelectedStatusTab("נשלח");
    }
  };
  
  // Bulk Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // Modals state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWhatsAppSummaryOpen, setIsWhatsAppSummaryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [noteOrder, setNoteOrder] = useState<Order | null>(null);
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<"date" | "number">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep track of notified order IDs to avoid duplicate alerts
  const warnedApproachingRef = useRef<Record<string, boolean>>({});
  const warnedOverdueRef = useRef<Record<string, boolean>>({});

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
    return localStorage.getItem("sabanos_sheet_url") || "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZCXN68oVhbcihwRCNJp-XizIXXR2HLZWQrvXNJDJ74Hd0IkNY8SwSiFiFzgOAdQ0IW74fIrWPLp_y/pub?gid=0&single=true&output=csv";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

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

      const targetUrl = urlToFetch.trim();
      let csvText = "";
      let success = false;

      // 1. First, try the local API proxy (which handles CORS and parses normal URLs to CSV)
      try {
        const proxyUrl = `/api/fetch-sheet?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          csvText = await res.text();
          success = true;
        } else {
          console.warn(`Proxy fetch failed with status: ${res.status}`);
        }
      } catch (e) {
        console.warn("Proxy fetch failed, trying direct client-side fetch...", e);
      }

      // 2. Fallback: try fetching directly (works perfectly for published CSVs, which the user's URL is!)
      if (!success) {
        try {
          console.log(`Trying direct client fetch for: ${targetUrl}`);
          const res = await fetch(targetUrl);
          if (res.ok) {
            csvText = await res.text();
            success = true;
          } else {
            throw new Error(`Direct fetch status: ${res.status}`);
          }
        } catch (e: any) {
          console.error("Direct fetch failed too:", e);
          
          // Let's also check if the URL is a standard Google Sheet viewer link and can be reformatted
          let reformattedUrl = targetUrl;
          if (targetUrl.includes("docs.google.com/spreadsheets")) {
            const match = targetUrl.match(/\/d\/([^\/]+)/);
            if (match && match[1] && match[1] !== "e") {
              const spreadsheetId = match[1];
              reformattedUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
              try {
                console.log(`Trying reformatted export fetch: ${reformattedUrl}`);
                const res = await fetch(reformattedUrl);
                if (res.ok) {
                  csvText = await res.text();
                  success = true;
                }
              } catch (errExport) {
                console.error("Reformatted export fetch failed:", errExport);
              }
            }
          }
          
          if (!success) {
            throw new Error("נכשל בטעינת הקובץ. אנא וודא שהגיליון פורסם לרשת כקובץ CSV, או פתוח לצפייה לכל מי שיש לו את הקישור.");
          }
        }
      }

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

      // Merge sheetOrders with local changes to preserve fields (status, isArchived, notes, deadlines)
      const currentOrdersMap = new Map<string, Order>();
      if (Array.isArray(currentOrdersList)) {
        currentOrdersList.forEach((o: Order) => {
          if (o && o.orderNumber) {
            currentOrdersMap.set(o.orderNumber, o);
          }
        });
      }

      const mergedOrders = sheetOrders.map(sheetOrder => {
        const localOrder = currentOrdersMap.get(sheetOrder.orderNumber);
        if (localOrder) {
          return {
            ...sheetOrder,
            status: localOrder.status, // preserve local status changes
            isArchived: localOrder.isArchived || false, // preserve archived state
            notes: localOrder.notes || sheetOrder.notes,
            productImageUrl: localOrder.productImageUrl || sheetOrder.productImageUrl,
            deadlineTime: localOrder.deadlineTime || sheetOrder.deadlineTime,
            reminderMinutes: localOrder.reminderMinutes || sheetOrder.reminderMinutes,
            statusLog: localOrder.statusLog || sheetOrder.statusLog
          };
        }
        return sheetOrder;
      });

      updateOrdersState(mergedOrders);
    } catch (err: any) {
      console.error("Fetch sheet error:", err);
      setFetchError(err.message || "שגיאה בגישה לגוגל שיטס");
      showNotification("שגיאת סנכרון: " + (err.message || ""), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Load from localStorage and auto-sync with the live Google Sheet
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
      setOrders([]);
      localStorage.setItem("sabanos_orders", JSON.stringify([]));
    }

    // Always fetch latest data from live sheetUrl on startup
    const targetUrl = localStorage.getItem("sabanos_sheet_url") || "https://docs.google.com/spreadsheets/d/e/2PACX-1vTZCXN68oVhbcihwRCNJp-XizIXXR2HLZWQrvXNJDJ74Hd0IkNY8SwSiFiFzgOAdQ0IW74fIrWPLp_y/pub?gid=0&single=true&output=csv";
    if (navigator.onLine) {
      fetchDataFromSheet(targetUrl);
    } else {
      showNotification("עובד במצב אופליין - מציג נתונים שמורים בלבד", "info");
    }
  }, []);

  // 1b. Automated Daily Cleanup Check
  useEffect(() => {
    if (orders.length === 0) return;
    
    // Check if we already prompted today
    const todayStr = new Date().toISOString().split("T")[0];
    const lastPromptDate = localStorage.getItem("sabanos_last_cleanup_prompt_date");
    if (lastPromptDate === todayStr) {
      return; // already prompted today
    }

    const olderSent = getOlderSentOrders(orders);
    if (olderSent.length > 0) {
      setOlderSentCount(olderSent.length);
      setShowCleanupPrompt(true);
    }
  }, [orders]);

  // Check deadlines every 10 seconds and trigger alerts / plays sound
  useEffect(() => {
    const checkDeadlines = () => {
      const now = new Date();
      orders.forEach(order => {
        if (!order.deadlineTime || order.status === "נשלח") return;
        
        try {
          const deadlineDate = new Date(order.deadlineTime);
          if (isNaN(deadlineDate.getTime())) return;
          
          const diffMs = deadlineDate.getTime() - now.getTime();
          const diffMins = Math.round(diffMs / 60000);
          const reminderMinutes = order.reminderMinutes ?? 30;
          
          // 1. Overdue Alert
          if (diffMins <= 0) {
            if (!warnedOverdueRef.current[order.id]) {
              warnedOverdueRef.current[order.id] = true;
              showNotification(`⚠️ דחוף: פג תוקף זמן היעד של הזמנה #${order.orderNumber} (${order.customerName})`, "error");
              playNotificationSound();
            }
          }
          // 2. Approaching Alert
          else if (diffMins <= reminderMinutes) {
            if (!warnedApproachingRef.current[order.id]) {
              warnedApproachingRef.current[order.id] = true;
              showNotification(`⏰ התראה: הזמנה #${order.orderNumber} מתקרבת לזמן היעד (${diffMins} דקות נותרו!)`, "info");
              playNotificationSound();
            }
          }
        } catch (e) {
          console.error("Error checking deadline:", e);
        }
      });
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 10000);
    return () => clearInterval(interval);
  }, [orders]);

  // Keyboard Shortcuts (Alt+N: Add order, Alt+S: Sync, Alt+F: Toggle full-screen)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in inputs or textareas
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === "input" || 
        activeTag === "textarea" || 
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }

      if (event.altKey) {
        // Alt + N: New Order
        if (event.code === "KeyN" || event.key.toLowerCase() === "n" || event.key === "מ") {
          event.preventDefault();
          setEditingOrder(null);
          setIsFormOpen(true);
          showNotification("קיצור דרך: פתיחת טופס הזמנה חדשה", "info");
        }
        // Alt + S: Sync
        else if (event.code === "KeyS" || event.key.toLowerCase() === "s" || event.key === "ד") {
          event.preventDefault();
          fetchDataFromSheet();
          showNotification("קיצור דרך: התחלת סנכרון נתונים", "info");
        }
        // Alt + F: Fullscreen Toggle
        else if (event.code === "KeyF" || event.key.toLowerCase() === "f" || event.key === "כ") {
          event.preventDefault();
          setIsFullScreen(prev => {
            const next = !prev;
            showNotification(next ? "קיצור דרך: כניסה למצב מסך מלא" : "קיצור דרך: יציאה ממצב מסך מלא", "info");
            return next;
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fetchDataFromSheet, isFullScreen]);

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
            isArchived: newStatus === "נשלח" ? order.isArchived : false,
            statusLog: [...existingLog, newLogEntry]
          };
        }
      }
      return order;
    });
    updateOrdersState(updated);
    showNotification(`הסטטוס עודכן בהצלחה ל"${newStatus}"`, "success");
  };

  // Archive / Unarchive toggle
  const handleToggleArchive = (orderId: string) => {
    const updated = orders.map(order => {
      if (order.id === orderId) {
        const nextArchived = !order.isArchived;
        return {
          ...order,
          isArchived: nextArchived
        };
      }
      return order;
    });
    updateOrdersState(updated);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const msg = !order.isArchived ? "ההזמנה הועברה לארכיון עמוק בהצלחה!" : "ההזמנה הוחזרה לרשימה בהצלחה!";
      showNotification(msg, "success");
    }
  };

  // Helper to find sent orders older than 7 days
  const getOlderSentOrders = (ordersList: Order[]) => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    return ordersList.filter(order => {
      if (order.status !== "נשלח" || order.isArchived) return false;
      const orderDate = new Date(order.date);
      return !isNaN(orderDate.getTime()) && orderDate < cutoff;
    });
  };

  // Archive all matching old orders
  const handleArchiveOlderOrders = () => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);

    const updated = orders.map(order => {
      if (order.status === "נשלח" && !order.isArchived) {
        const orderDate = new Date(order.date);
        if (!isNaN(orderDate.getTime()) && orderDate < cutoff) {
          return {
            ...order,
            isArchived: true
          };
        }
      }
      return order;
    });

    updateOrdersState(updated);
    
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("sabanos_last_cleanup_prompt_date", todayStr);
    
    showNotification(`🧹 ${olderSentCount} הזמנות הועברו לארכיון העמוק בהצלחה!`, "success");
    setShowCleanupPrompt(false);
  };

  const handleDismissCleanupPrompt = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("sabanos_last_cleanup_prompt_date", todayStr);
    setShowCleanupPrompt(false);
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
            productImageUrl: orderData.productImageUrl,
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
        productImageUrl: orderData.productImageUrl,
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
          if (["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח", "בוטל", "הוקפא"].includes(csvStatus)) {
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

    // 2. Active/Archive view segmentation filter
    const matchView = dashboardView === "active"
      ? (order.status !== "נשלח" && !order.isArchived)
      : (order.status === "נשלח" && (showDeepArchive || !order.isArchived));

    // 3. Status Tab Filter (only applies in Active view)
    const matchStatus = dashboardView === "archive"
      ? true
      : (selectedStatusTab === "הכל" || order.status === selectedStatusTab);

    // 4. Date Filter
    let matchDate = true;
    if (selectedDateFilter === "היום") {
      matchDate = order.date === todayStr;
    } else if (selectedDateFilter === "מחר") {
      matchDate = order.date === tomorrowStr;
    } else if (selectedDateFilter === "מותאם") {
      matchDate = order.date === customDate;
    }

    return matchSearch && matchView && matchStatus && matchDate;
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
      {!isFullScreen ? (
        <Header
          onOpenReportModal={() => setIsReportOpen(true)}
          onOpenAddOrderModal={() => {
            setEditingOrder(null);
            setIsFormOpen(true);
          }}
          onSync={() => fetchDataFromSheet()}
          isLoading={isLoading}
          dashboardView={dashboardView}
          setDashboardView={handleSetDashboardView}
          theme={theme}
        />
      ) : (
        <header className={`sticky top-0 z-40 w-full h-14 border-b flex items-center justify-between px-4 md:px-8 transition-all ${
          isDark 
            ? "border-cyan-500/30 bg-slate-900/90 backdrop-blur-xl" 
            : "border-slate-250 bg-white/95 shadow-sm"
        }`} id="fullscreen-header">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-[0_0_15px_rgba(34,211,238,0.25)] shrink-0">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className={`text-xs md:text-sm font-black ${isDark ? "text-white" : "text-slate-800"}`}>מצב מסוף משרד/מחסן</span>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold text-cyan-400 border border-cyan-500/20">פעיל</span>
              </div>
            </div>
          </div>

          {/* Active vs. Archive View Tab Switcher for Fullscreen */}
          <div className={`flex border p-0.5 rounded-lg shrink-0 ${
            isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
          }`} id="fullscreen-view-switcher">
            <button
              id="fs-btn-view-active"
              onClick={() => handleSetDashboardView("active")}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                dashboardView === "active"
                  ? isDark
                    ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
                    : "bg-white text-cyan-600 border border-slate-250 shadow-sm"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>📋</span>
              <span>הזמנות פעילות</span>
            </button>
            <button
              id="fs-btn-view-archive"
              onClick={() => handleSetDashboardView("archive")}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                dashboardView === "archive"
                  ? isDark
                    ? "bg-slate-900 text-cyan-400 border border-slate-800 shadow-md"
                    : "bg-white text-cyan-600 border border-slate-250 shadow-sm"
                  : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>🗄️</span>
              <span>ארכיון היסטוריה</span>
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Clock */}
            <div className={`hidden md:flex items-center gap-1.5 text-xs font-mono font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <Clock className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
              <span>{liveTime.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
            </div>

            {/* Quick Actions in Fullscreen */}
            <div className="flex items-center gap-2">
              <button
                id="fs-btn-add-order"
                onClick={() => {
                  setEditingOrder(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 text-[11px] font-bold transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>הזמנה חדשה</span>
              </button>

              <button
                id="fs-btn-sync"
                onClick={() => fetchDataFromSheet()}
                disabled={isLoading}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all active:scale-[0.98] cursor-pointer ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <RefreshCw className={`h-3 w-3 text-cyan-500 ${isLoading ? "animate-spin" : ""}`} />
                <span>סנכרון</span>
              </button>

              <button
                id="fs-btn-exit"
                onClick={() => setIsFullScreen(false)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 px-3 py-1.5 text-[11px] font-extrabold transition-all active:scale-[0.98] cursor-pointer"
              >
                <Minimize2 className="h-3 w-3" />
                <span>מסך רגיל</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Dashboard Layout */}
      <main className={`flex-1 w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 relative z-10 transition-all ${
        isFullScreen ? "max-w-none" : "max-w-7xl"
      }`}>
        
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

        {/* Automated Cleanup Banner */}
        {showCleanupPrompt && olderSentCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="cleanup-alert-banner"
            className={`w-full p-4 md:p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden z-20 transition-all ${
              isDark 
                ? "border-purple-500/35 bg-gradient-to-r from-purple-950/20 via-slate-900/95 to-slate-900/95 shadow-[0_0_30px_rgba(168,85,247,0.1)]" 
                : "border-purple-200 bg-purple-50/95 shadow-md text-slate-800"
            }`}
            dir="rtl"
          >
            <div className="absolute top-0 right-0 h-[3px] w-full bg-gradient-to-l from-purple-500 via-pink-500 to-transparent pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 text-right">
                <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-purple-500/10 text-purple-400">🧹</span>
                <div>
                  <h3 className="text-sm font-black text-purple-400">משימת ניקוי יומית מומלצת</h3>
                  <p className={`text-xs mt-1.5 leading-relaxed font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    נמצאו <span className="text-purple-500 font-black text-sm px-1 underline">{olderSentCount}</span> הזמנות שנשלחו לפני יותר מ-7 ימים.
                    העברה לארכיון עמוק תשמור על לוח המעקב וארכיון ההיסטוריה שלך מהיר, נקי וממוקד.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                <button
                  id="btn-cleanup-approve"
                  onClick={handleArchiveOlderOrders}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  כן, העבר לארכיון עמוק
                </button>
                <button
                  id="btn-cleanup-dismiss"
                  onClick={handleDismissCleanupPrompt}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isDark 
                      ? "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850" 
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  לא כעת
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Top Analytics Stats Grid, Charts, and Deadline Center (Hidden in Fullscreen) */}
        {!isFullScreen && (
          <>
            <OrderStats 
              orders={orders} 
              theme={theme} 
              activeView={dashboardView} 
              selectedStatusTab={selectedStatusTab} 
              onStatClick={(view, statusTab) => {
                handleSetDashboardView(view);
                setSelectedStatusTab(statusTab);
              }} 
            />

            {/* Analytics Dashboard Visualizer Component */}
            <OrderDashboard orders={orders} theme={theme} />

            {/* 7-Day Daily Volume Chart Component */}
            <DailyVolumeChart orders={orders} theme={theme} />

            {/* Deadlines Alert Center */}
            {(() => {
              const urgentOrOverdueOrders = orders.filter(order => {
                if (!order.deadlineTime || order.status === "נשלח") return false;
                try {
                  const deadlineDate = new Date(order.deadlineTime);
                  if (isNaN(deadlineDate.getTime())) return false;
                  const diffMs = deadlineDate.getTime() - new Date().getTime();
                  const diffMins = Math.round(diffMs / 60000);
                  const reminderMinutes = order.reminderMinutes ?? 30;
                  return diffMins <= reminderMinutes;
                } catch {
                  return false;
                }
              });

              if (urgentOrOverdueOrders.length === 0) return null;

              return (
                <motion.div 
                  id="deadlines-alert-center" 
                  animate={{
                    borderColor: isDark 
                      ? ["rgba(244, 63, 94, 0.2)", "rgba(244, 63, 94, 0.45)", "rgba(244, 63, 94, 0.2)"] 
                      : ["rgba(244, 63, 94, 0.15)", "rgba(244, 63, 94, 0.35)", "rgba(244, 63, 94, 0.15)"],
                    boxShadow: isDark
                      ? [
                          "0 0 15px rgba(244, 63, 94, 0.03)",
                          "0 0 25px rgba(244, 63, 94, 0.12)",
                          "0 0 15px rgba(244, 63, 94, 0.03)"
                        ]
                      : [
                          "0 0 10px rgba(244, 63, 94, 0.02)",
                          "0 0 18px rgba(244, 63, 94, 0.08)",
                          "0 0 10px rgba(244, 63, 94, 0.02)"
                        ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={`w-full p-4 md:p-5 rounded-2xl border backdrop-blur-sm relative overflow-hidden z-10 transition-all ${
                    isDark 
                      ? "bg-gradient-to-br from-slate-900/80 to-rose-950/10" 
                      : "bg-rose-50/50 text-slate-800"
                  }`} 
                  dir="rtl"
                >
                  <div className="absolute top-0 right-0 h-[2px] w-full bg-gradient-to-l from-rose-500 via-amber-500 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-3 mb-3 text-right">
                    <span className="text-xl animate-bounce">🚨</span>
                    <div>
                      <h3 className="text-sm font-bold text-rose-500">מרכז התראות: דדליינים דחופים</h3>
                      <p className="text-[11px] text-slate-400">ההזמנות הבאות קרובות לשעת היעד או עברו אותה. אנא ודא אספקה מיידית!</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {urgentOrOverdueOrders.map(order => {
                      const deadlineDate = new Date(order.deadlineTime!);
                      const diffMins = Math.round((deadlineDate.getTime() - new Date().getTime()) / 60000);
                      const isPast = diffMins < 0;
                      const absoluteMins = Math.abs(diffMins);
                      const timeStr = order.deadlineTime!.includes("T") ? order.deadlineTime!.split("T")[1].substring(0, 5) : order.deadlineTime!;

                      let diffText = "";
                      if (isPast) {
                        const h = Math.floor(absoluteMins / 60);
                        const m = absoluteMins % 60;
                        diffText = h > 0 ? `באיחור של ${h} ש' ו-${m} דק'` : `באיחור של ${m} דק'`;
                      } else {
                        const h = Math.floor(absoluteMins / 60);
                        const m = absoluteMins % 60;
                        diffText = h > 0 ? `נותרו עוד ${h} ש' ו-${m} דק'` : `נותרו עוד ${m} דק'`;
                      }

                      // Calculate visual progress
                      const deadlineMs = deadlineDate.getTime();
                      const nowMs = new Date().getTime();
                      
                      // Find start of preparation or fallback to 45 mins estimated window before deadline
                      const prepLog = order.statusLog?.find(entry => entry.status === "בהכנה");
                      let startMs = prepLog ? new Date(prepLog.timestamp).getTime() : null;

                      if (!startMs || isNaN(startMs)) {
                        const firstLog = order.statusLog?.[0];
                        const firstLogMs = firstLog ? new Date(firstLog.timestamp).getTime() : null;
                        startMs = firstLogMs && !isNaN(firstLogMs) ? firstLogMs : deadlineMs - 45 * 60 * 1000;
                      }

                      if (startMs >= deadlineMs) {
                        startMs = deadlineMs - 45 * 60 * 1000;
                      }

                      const totalDuration = deadlineMs - startMs;
                      const remainingMs = deadlineMs - nowMs;
                      let timeLeftPercent = totalDuration > 0 ? (remainingMs / totalDuration) * 100 : 0;
                      timeLeftPercent = Math.min(Math.max(timeLeftPercent, 0), 100);

                      return (
                        <motion.div 
                          key={order.id}
                          onClick={() => {
                            const el = document.getElementById(`order-card-${order.id}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('ring-2', 'ring-rose-500', 'ring-offset-2');
                              setTimeout(() => el.classList.remove('ring-2', 'ring-rose-500', 'ring-offset-2'), 4000);
                            }
                          }}
                          animate={{
                            scale: [1, 1.01, 1],
                            borderColor: isPast
                              ? isDark ? ["rgba(239, 68, 68, 0.3)", "rgba(239, 68, 68, 0.55)", "rgba(239, 68, 68, 0.3)"] : ["rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 0.45)", "rgba(239, 68, 68, 0.2)"]
                              : isDark ? ["rgba(245, 158, 11, 0.3)", "rgba(245, 158, 11, 0.55)", "rgba(245, 158, 11, 0.3)"] : ["rgba(245, 158, 11, 0.2)", "rgba(245, 158, 11, 0.45)", "rgba(245, 158, 11, 0.2)"]
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className={`flex flex-col p-3.5 rounded-xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md ${
                            isPast
                              ? isDark ? "bg-rose-950/20 text-rose-300" : "bg-rose-100/95 text-rose-850"
                              : isDark ? "bg-amber-950/20 text-amber-300" : "bg-amber-50/95 text-amber-850"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col text-right">
                              <span className="text-xs font-extrabold font-sans">#{order.orderNumber} - {order.customerName}</span>
                              <span className="text-[10px] opacity-90 mt-0.5 font-bold">{diffText}</span>
                            </div>
                            <div className="flex items-center gap-1 font-mono text-xs font-black shrink-0">
                              <Clock className="h-3.5 w-3.5 text-cyan-400" />
                              <span>{timeStr}</span>
                            </div>
                          </div>

                          {/* Progress indicator */}
                          <div className="w-full mt-3">
                            <div className="flex justify-between items-center text-[9px] font-black opacity-85 mb-1.5">
                              <span>שנותר: {Math.round(timeLeftPercent)}%</span>
                              <span>זמן מתוכנן: {Math.round(totalDuration / 60000)} דק'</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden p-[1px] ${
                              isDark ? "bg-slate-950/70" : "bg-slate-200/80"
                            }`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  isPast 
                                    ? "bg-rose-600 animate-pulse" 
                                    : timeLeftPercent <= 30 
                                      ? "bg-gradient-to-r from-red-500 to-amber-500" 
                                      : "bg-gradient-to-r from-amber-500 to-emerald-500"
                                }`} 
                                style={{ width: `${timeLeftPercent}%` }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}
          </>
        )}

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
              {dashboardView === "active" ? (
                <div className={`flex border p-1 rounded-xl overflow-x-auto gap-0.5 ${
                  isDark ? "bg-slate-950 border-slate-850" : "bg-slate-100 border-slate-200"
                }`}>
                  {["הכל", "ממתין להכנה", "בהכנה", "מוכן לאיסוף", "בוטל", "הוקפא"].map((tab) => (
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
                      {tab === "הכל" ? "כל הסטטוסים הפעילים" : tab}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className={`flex border p-2 rounded-xl text-xs font-black items-center gap-2 ${
                    isDark ? "bg-purple-950/20 border-purple-900/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.05)]" : "bg-purple-50 border-purple-100 text-purple-700"
                  }`}>
                    <span className="text-sm">🗄️</span>
                    <span>מציג הזמנות שסופקו ונשלחו לארכיון בלבד</span>
                  </div>
                  <button
                    id="toggle-deep-archive"
                    onClick={() => setShowDeepArchive(!showDeepArchive)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
                      showDeepArchive
                        ? isDark
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                          : "bg-purple-100 text-purple-800 border-purple-300 shadow-sm"
                        : isDark
                          ? "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
                    }`}
                  >
                    <span>{showDeepArchive ? "📂 הסתר ארכיון עמוק" : "📁 הצג ארכיון עמוק (ישנות מ-7 ימים)"}</span>
                  </button>
                </div>
              )}

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

              <button
                onClick={() => setIsWhatsAppSummaryOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border rounded-xl transition-all cursor-pointer ${
                  isDark
                    ? "text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border-slate-850"
                    : "text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border-slate-200 shadow-sm"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span>סיכום יומי ל-WhatsApp</span>
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
                  {(["ממתין להכנה", "בהכנה", "מוכן לאיסוף", "נשלח", "בוטל", "הוקפא"] as OrderStatus[]).map((status) => (
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pb-1">
          
          <div className="flex flex-wrap items-center gap-3">
            <div className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <span>נמצאו </span>
              <span className={`font-mono font-extrabold px-1.5 py-0.2 rounded ${
                isDark ? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/15" : "text-cyan-600 bg-cyan-50 border border-cyan-200"
              }`}>
                {sortedOrders.length}
              </span>
              <span> הזמנות תואמות</span>
            </div>

            {/* Full Screen Mode Toggle Button */}
            <button
              id="btn-toggle-fullscreen"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border shadow-sm transition-all active:scale-[0.98] cursor-pointer ${
                isFullScreen
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/15"
                  : isDark
                    ? "bg-slate-950 hover:bg-slate-900 border-slate-850 text-cyan-400 hover:text-cyan-300"
                    : "bg-white hover:bg-slate-50 border-slate-200 text-cyan-600 hover:text-cyan-700"
              }`}
              title="מצב מסך מלא למחסן ומשרד"
            >
              {isFullScreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>מסך רגיל</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>🖥️ מצב מסך מלא</span>
                </>
              )}
            </button>
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
          } text-center relative overflow-hidden`}>
            {/* Glowing cyan neon background aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
            
            <div className="relative flex h-24 w-24 items-center justify-center mb-6">
              {/* Pulsing neon outer rings */}
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
              <div className="absolute -inset-2 rounded-full border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.2)] animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin shadow-[0_0_15px_rgba(34,211,238,0.5)]" style={{ animationDuration: '0.8s' }} />
              <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
            </div>
            <h3 className={`text-lg font-bold tracking-wide ${isDark ? "text-slate-100 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "text-slate-800"}`}>
              טוען נתונים מתוך גיליון 'לוג_הזמנות_מערכת'...
            </h3>
            <p className="text-xs text-slate-500 mt-2 font-mono">אנא המתן בזמן שהמערכת מושכת ומסנכרנת את ההזמנות בזמן אמת</p>
          </div>
        ) : fetchError && orders.length === 0 ? (
          <div className={`flex flex-col items-center justify-center p-12 rounded-2xl border text-center max-w-md mx-auto ${
            isDark ? "bg-slate-900/20 border-rose-500/20 text-slate-200" : "bg-white border-rose-200 shadow-sm text-slate-700"
          }`}>
            <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/30 text-rose-500 mb-4 animate-pulse">
              <Info className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-rose-500">חיבור לגיליון 'לוג_הזמנות_מערכת' נכשל</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{fetchError}</p>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => fetchDataFromSheet()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
              >
                🔄 סנכרון נתונים חי
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
              <AnimatePresence mode="popLayout">
                {sortedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 280,
                      damping: 26,
                      opacity: { duration: 0.2 },
                      y: { duration: 0.25, delay: Math.min(index * 0.04, 0.2) }
                    }}
                    className="w-full"
                  >
                    <OrderCard
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
                      onSendLoadingCommand={handleSendLoadingCommand}
                      onSendDeliveryUpdate={handleSendDeliveryUpdate}
                      onViewHistory={(o) => setHistoryOrder(o)}
                      onToggleArchive={handleToggleArchive}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}

        {/* System Audit Log Section */}
        <div className={`mt-8 w-full p-5 md:p-6 rounded-2xl border backdrop-blur-sm relative overflow-hidden z-10 transition-all ${
          isDark 
            ? "border-slate-800/85 bg-gradient-to-br from-slate-900/40 to-slate-950/60" 
            : "border-slate-200/80 bg-white shadow-sm"
        }`}>
          {isDark && (
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent pointer-events-none" />
          )}

          <div className="flex items-center justify-between gap-3 pb-4 border-b mb-4 border-slate-800/20">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📋</span>
              <div className="text-right">
                <h3 className="font-bold text-sm tracking-wide">יומן פעולות מערכת (System Audit Log)</h3>
                <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>תיעוד שינויי סטטוס ושילוחים בזמן אמת</p>
              </div>
            </div>
            {auditLogs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("האם ברצונך למחוק את היסטוריית הפעולות?")) {
                    setAuditLogs([]);
                    localStorage.removeItem("sabanos_audit_logs");
                  }
                }}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 ${
                  isDark ? "border-slate-800 text-slate-500 bg-slate-950/40" : "border-slate-250 text-slate-455 bg-slate-50"
                }`}
              >
                נקה יומן
              </button>
            )}
          </div>

          {auditLogs.length === 0 ? (
            <div className={`text-center py-6 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              אין פעולות מוקלטות ביומן כעת. לחץ על כפתורי הווצאפ בכרטיסי ההזמנה כדי להתחיל.
            </div>
          ) : (
            <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-0.5" id="audit-log-list">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border text-right text-xs transition-all ${
                    isDark 
                      ? "bg-slate-950/50 border-slate-900/60 hover:bg-slate-950/80" 
                      : "bg-slate-50/60 border-slate-150 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-sm mt-0.5">🟢</span>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-1.5 font-bold">
                        <span className="text-cyan-400 font-mono">#{log.orderNumber}</span>
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>{log.customerName}</span>
                        <span className="text-slate-500 font-normal">|</span>
                        <span className={log.action.includes("העמסה") ? "text-sky-400" : "text-emerald-400"}>
                          {log.action}
                        </span>
                      </div>
                      <div className={`text-[10px] mt-0.5 flex items-center gap-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        <span className="font-semibold">נמען:</span>
                        <span className="font-mono bg-slate-950/20 px-1 rounded">{log.recipient}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono shrink-0 text-left ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

              {/* Keyboard Shortcuts Info Section */}
              <div className={`p-3 rounded-xl border ${
                isDark ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 border-slate-200"
              }`}>
                <span className="font-bold text-[11px] block mb-2 text-cyan-500">⌨️ קיצורי דרך במקלדת (מהירים):</span>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>הוספת הזמנה חדשה:</span>
                    <kbd className="font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded font-bold">Alt + N</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>סנכרון נתונים:</span>
                    <kbd className="font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded font-bold">Alt + S</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>מעבר למסך מלא:</span>
                    <kbd className="font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded font-bold">Alt + F</kbd>
                  </div>
                </div>
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

      <OrderStatusHistoryModal
        isOpen={historyOrder !== null}
        onClose={() => setHistoryOrder(null)}
        order={historyOrder}
        theme={theme}
      />

      <WhatsAppSummaryModal
        isOpen={isWhatsAppSummaryOpen}
        onClose={() => setIsWhatsAppSummaryOpen(false)}
        orders={orders}
        theme={theme}
      />

      {/* Contact Selector Fallback Picker Modal */}
      {whatsappSelectorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-right font-sans" dir="rtl" id="contact-selector-modal">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-colors duration-300 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center text-lg">
                💬
              </div>
              <div>
                <h3 className="font-bold text-base">בחר נמען למשלוח ווצאפ</h3>
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {whatsappSelectorData.type === "loading" ? "פקודת העמסה להזמנה" : "עדכון אספקה להזמנה"} #{whatsappSelectorData.order.orderNumber}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 mb-5">
              {/* Option 1: Customer (if phone is extracted) */}
              {whatsappSelectorData.customerPhone ? (
                <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  whatsappSelectorData.selectedRecipientType === "customer"
                    ? isDark ? "border-green-500/60 bg-green-950/15 text-green-400" : "border-green-400 bg-green-50/50 text-green-700"
                    : isDark ? "border-slate-800 bg-slate-950/55 hover:bg-slate-950" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                }`}>
                  <input
                    type="radio"
                    name="recipient-type"
                    checked={whatsappSelectorData.selectedRecipientType === "customer"}
                    onChange={() => setWhatsappSelectorData({ ...whatsappSelectorData, selectedRecipientType: "customer" })}
                    className="h-4.5 w-4.5 text-green-500 focus:ring-green-500/30 accent-green-500"
                  />
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-xs">איש קשר מההזמנה (לקוח)</span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">{whatsappSelectorData.order.contactPerson} ({whatsappSelectorData.customerPhone})</span>
                  </div>
                </label>
              ) : (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed text-right ${isDark ? "bg-slate-950/40 border-slate-900 text-slate-500" : "bg-slate-50 border-slate-150 text-slate-400"}`}>
                  ⚠️ לא זוהה מספר טלפון תקין של הלקוח בפרטי איש הקשר ("{whatsappSelectorData.order.contactPerson || "ריק"}"). תוכל להזין מספר מותאם אישית למטה או לשלוח לאחד הנהגים.
                </div>
              )}

              {/* Option 2: Hikmat (Driver) */}
              <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                whatsappSelectorData.selectedRecipientType === "driver_hikmat"
                  ? isDark ? "border-green-500/60 bg-green-950/15 text-green-400" : "border-green-400 bg-green-50/50 text-green-700"
                  : isDark ? "border-slate-800 bg-slate-950/55 hover:bg-slate-950" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
              }`}>
                <input
                  type="radio"
                  name="recipient-type"
                  checked={whatsappSelectorData.selectedRecipientType === "driver_hikmat"}
                  onChange={() => setWhatsappSelectorData({ ...whatsappSelectorData, selectedRecipientType: "driver_hikmat" })}
                  className="h-4.5 w-4.5 text-green-500 focus:ring-green-500/30 accent-green-500"
                />
                <div className="flex flex-col text-right">
                  <span className="font-bold text-xs">🚚 חכמת גאבר (נהג מורשה)</span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">+972532316985</span>
                </div>
              </label>

              {/* Option 3: Ali (Driver) */}
              <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                whatsappSelectorData.selectedRecipientType === "driver_ali"
                  ? isDark ? "border-green-500/60 bg-green-950/15 text-green-400" : "border-green-400 bg-green-50/50 text-green-700"
                  : isDark ? "border-slate-800 bg-slate-950/55 hover:bg-slate-950" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
              }`}>
                <input
                  type="radio"
                  name="recipient-type"
                  checked={whatsappSelectorData.selectedRecipientType === "driver_ali"}
                  onChange={() => setWhatsappSelectorData({ ...whatsappSelectorData, selectedRecipientType: "driver_ali" })}
                  className="h-4.5 w-4.5 text-green-500 focus:ring-green-500/30 accent-green-500"
                />
                <div className="flex flex-col text-right">
                  <span className="font-bold text-xs">🚚 עלי נהג (נהג מורשה)</span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">+972542276631</span>
                </div>
              </label>

              {/* Option 4: Custom */}
              <div className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                whatsappSelectorData.selectedRecipientType === "custom"
                  ? isDark ? "border-green-500/60 bg-green-950/15 text-green-400" : "border-green-400 bg-green-50/50 text-green-700"
                  : isDark ? "border-slate-800 bg-slate-950/55 hover:bg-slate-950" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
              }`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="recipient-type"
                    checked={whatsappSelectorData.selectedRecipientType === "custom"}
                    onChange={() => setWhatsappSelectorData({ ...whatsappSelectorData, selectedRecipientType: "custom" })}
                    className="h-4.5 w-4.5 text-green-500 focus:ring-green-500/30 accent-green-500"
                  />
                  <span className="font-bold text-xs text-right">✍️ מספר מותאם אישית</span>
                </label>
                {whatsappSelectorData.selectedRecipientType === "custom" && (
                  <input
                    type="tel"
                    dir="ltr"
                    value={whatsappSelectorData.customPhone}
                    onChange={(e) => setWhatsappSelectorData({ ...whatsappSelectorData, customPhone: e.target.value })}
                    className={`w-full text-xs font-mono p-2.5 rounded-xl border mt-1 text-left focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      isDark ? "bg-slate-950 border-slate-850 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                    placeholder="050-1234567"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  let finalPhone = "";
                  let recipientName = "";
                  
                  if (whatsappSelectorData.selectedRecipientType === "customer") {
                    finalPhone = whatsappSelectorData.customerPhone;
                    recipientName = whatsappSelectorData.order.customerName;
                  } else if (whatsappSelectorData.selectedRecipientType === "driver_hikmat") {
                    finalPhone = "+972532316985";
                    recipientName = "חכמת גאבר (נהג)";
                  } else if (whatsappSelectorData.selectedRecipientType === "driver_ali") {
                    finalPhone = "+972542276631";
                    recipientName = "עלי נהג (נהג)";
                  } else if (whatsappSelectorData.selectedRecipientType === "custom") {
                    let cleaned = whatsappSelectorData.customPhone.replace(/[-\s]/g, "");
                    if (!cleaned) {
                      showNotification("אנא הזן מספר טלפון תקין", "error");
                      return;
                    }
                    if (cleaned.startsWith("0")) {
                      cleaned = "972" + cleaned.slice(1);
                    }
                    if (!cleaned.startsWith("+") && !cleaned.startsWith("972")) {
                      cleaned = "972" + cleaned;
                    }
                    finalPhone = cleaned.startsWith("+") ? cleaned : "+" + cleaned;
                    recipientName = `מספר ידני (${finalPhone})`;
                  }

                  if (!finalPhone) {
                    showNotification("לא נבחר נמען תקין", "error");
                    return;
                  }

                  executeSendWhatsApp(whatsappSelectorData.order, whatsappSelectorData.type, finalPhone, recipientName);
                  setWhatsappSelectorData(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-green-500/15"
              >
                שגר לווצאפ 🚀
              </button>
              <button
                onClick={() => setWhatsappSelectorData(null)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-xl border cursor-pointer ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
