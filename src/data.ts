import { Order, parseItemsText } from "./types";

// Helper to format date relative to today for mock data (YYYY-MM-DD)
function getRelativeDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const MOCK_RAW_ORDERS = [
  {
    orderNumber: "6213836",
    customerName: "ישראל ישראלי - בניה ושיפוצים",
    deliveryAddress: "הרצל 45, ראשון לציון",
    contactPerson: "ישראל (052-1234567)",
    items: "5 יח' x צמנט פורטלנד (1001)\n10 יח' x בלוק בטון 20 (2044)\n2 יח' x חול קוורץ (3012)",
    status: "ממתין להכנה" as const,
    date: getRelativeDateString(1), // Tomorrow
    notes: "דחוף לבוקר מוקדם, לפרוק עם מנוף מאחורי הבניין."
  },
  {
    orderNumber: "6213837",
    customerName: "משה לוי הנדסה בע\"מ",
    deliveryAddress: "דרך נמיר 101, תל אביב",
    contactPerson: "משה (054-9876543)",
    items: "3 יח' x דבק קרמיקה פלקס (4005)\n1 יח' x מלט לבן 25 ק\"ג (1005)",
    status: "בהכנה" as const,
    date: getRelativeDateString(1), // Tomorrow
    notes: "איסוף עצמי על ידי הנהג של משה."
  },
  {
    orderNumber: "6213838",
    customerName: "א.ב. עיצוב וגבס",
    deliveryAddress: "האורגים 12, חולון",
    contactPerson: "אלי (050-5554433)",
    items: "25 יח' x לוח גבס סטנדרטי 1.2x2.6 (5010)\n4 יח' x ניצב גבס 3 מטר (5022)\n2 יח' x שפכטל אמריקאי (5100)",
    status: "מוכן לאיסוף" as const,
    date: getRelativeDateString(0), // Today
    notes: "נא לוודא שאין לוחות שבורים."
  },
  {
    orderNumber: "6213839",
    customerName: "יזמות נדל\"ן דרום",
    deliveryAddress: "שדרות טוביהו 88, באר שבע",
    contactPerson: "דני (053-1112223)",
    items: "50 יח' x בלוק איטונג 15 (2080)\n4 יח' x סיליקט 10 ק\"ג (4120)",
    status: "נשלח" as const,
    date: getRelativeDateString(-1), // Yesterday
    notes: "נמסר בהצלחה ללוגיסטיקה בשטח."
  },
  {
    orderNumber: "6213840",
    customerName: "גינון ופיתוח הגליל",
    deliveryAddress: "השיטים 2, כרמיאל",
    contactPerson: "אמיר (058-7776655)",
    items: "8 יח' x תערובת שתילה 50 ליטר (6001)\n3 יח' x טוף אדום שק גדול (6020)",
    status: "ממתין להכנה" as const,
    date: getRelativeDateString(1), // Tomorrow
    notes: "הלקוח מבקש להתקשר חצי שעה לפני ההגעה."
  },
  {
    orderNumber: "6213841",
    customerName: "ש. צבעים ועבודות גמר",
    deliveryAddress: "ביאליק 12, רמת גן",
    contactPerson: "שרון (054-3332211)",
    items: "3 יח' x סופרקריל מט לבן 18 ליטר (7010)\n1 יח' x מברשת צבע 3 אינץ' (7122)\n5 יח' x ניילון כיסוי עבה (7200)",
    status: "בהכנה" as const,
    date: getRelativeDateString(0), // Today
    notes: "לשלוח עם שליח קטנוע אם אפשר."
  }
];

export const INITIAL_ORDERS: Order[] = MOCK_RAW_ORDERS.map((o, idx) => ({
  id: `order-${idx + 1}`,
  date: o.date,
  orderNumber: o.orderNumber,
  customerName: o.customerName,
  deliveryAddress: o.deliveryAddress,
  contactPerson: o.contactPerson,
  items: o.items,
  parsedItems: parseItemsText(o.items),
  status: o.status,
  notes: o.notes
}));
