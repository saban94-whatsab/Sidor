export type OrderStatus = "ממתין להכנה" | "בהכנה" | "מוכן לאיסוף" | "נשלח";

export interface OrderItem {
  quantity: number;
  name: string;
  sku?: string;
}

export interface StatusLogEntry {
  status: OrderStatus;
  timestamp: string;
}

export interface Order {
  id: string;
  date: string; // Format: YYYY-MM-DD
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  contactPerson: string;
  items: string; // Raw text representing items
  parsedItems: OrderItem[]; // Parsed items list
  status: OrderStatus;
  notes?: string;
  statusLog?: StatusLogEntry[];
}

export const STATUS_OPTIONS: OrderStatus[] = [
  "ממתין להכנה",
  "בהכנה",
  "מוכן לאיסוף",
  "נשלח"
];

// Helper to parse raw items string to structured OrderItem array
export function parseItemsText(text: string): OrderItem[] {
  if (!text) return [];
  
  // Split by common separators: newlines, commas, semicolons, or literal '\n' characters in CSV text
  const lines = text.split(/[\n\r]+|\\n/).map(line => line.trim()).filter(Boolean);
  
  return lines.map(line => {
    // 1. Try matching: [SKU] Name - כמות: QTY
    // E.g. "[11511] סומסום שק גדול - כמות: 6" or "[11511] סומסום שק גדול"
    const bracketRegex = /^\[([^\]]+)\]\s*(.+?)(?:\s*-\s*כמות:\s*(\d+))?$/;
    const bracketMatch = line.match(bracketRegex);
    
    if (bracketMatch) {
      const sku = bracketMatch[1].trim();
      let name = bracketMatch[2].trim();
      let quantity = bracketMatch[3] ? parseInt(bracketMatch[3], 10) : 1;
      
      // Clean up optional trailing "- כמות: " if not caught by regex due to spacing
      if (name.includes("- כמות:")) {
        const parts = name.split("- כמות:");
        name = parts[0].trim();
        const qtyStr = parts[1]?.trim();
        if (qtyStr && !isNaN(parseInt(qtyStr, 10))) {
          quantity = parseInt(qtyStr, 10);
        }
      }
      
      return {
        quantity,
        name: name || "מוצר כללי",
        sku
      };
    }
    
    // 2. Try matching: "5 יח' x צמנט פורטלנד (1001)"
    const qtyRegex = /^(\d+)\s*(?:יח'|יחידות|יחידה)?\s*(?:x|X|\*|-)?\s*(.+)$/;
    const qtyMatch = line.match(qtyRegex);
    
    let quantity = 1;
    let nameAndSku = line;
    
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      nameAndSku = qtyMatch[2].trim();
    }
    
    // Extract SKU if inside parenthesis at the end
    const skuRegex = /\((?:מק"ט|מקט)?\s*(\w+)\)$/;
    const skuMatch = nameAndSku.match(skuRegex);
    
    let name = nameAndSku;
    let sku = "";
    
    if (skuMatch) {
      sku = skuMatch[1];
      name = nameAndSku.replace(/\s*\((?:מק"ט|מקט)?\s*\w+\)$/, "").trim();
    }
    
    return {
      quantity,
      name: name || "מוצר כללי",
      sku: sku || undefined
    };
  });
}

// Custom lightweight robust CSV parser
export function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = "";

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentValue.trim());
      currentValue = "";
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n
      }
      row.push(currentValue.trim());
      lines.push(row);
      row = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  if (currentValue || row.length > 0) {
    row.push(currentValue.trim());
    lines.push(row);
  }
  return lines;
}

// Mapper to convert Hebrew Google Sheet columns directly into Order types
export function mapCsvToOrders(csvText: string): Order[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];
  
  // Clean headers
  const headers = rows[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  // Exact Hebrew headers requested
  const dateIdx = headers.indexOf('תאריך קליטה');
  const orderNumIdx = headers.indexOf('מספר הזמנה');
  const customerNameIdx = headers.indexOf('שם לקוח');
  const addressIdx = headers.indexOf('כתובת אספקה');
  const contactIdx = headers.indexOf('איש קשר');
  const itemsIdx = headers.indexOf('פריטים');
  const statusIdx = headers.indexOf('סטטוס ווצאפ');
  
  // Fallback indices if exact matching fails due to encoding or space issues
  const getIdx = (headerName: string, fallback: number) => {
    const idx = headers.findIndex(h => h.includes(headerName));
    return idx !== -1 ? idx : fallback;
  };
  
  const finalDateIdx = dateIdx !== -1 ? dateIdx : getIdx('תאריך', 0);
  const finalOrderNumIdx = orderNumIdx !== -1 ? orderNumIdx : getIdx('הזמנה', 1);
  const finalCustomerIdx = customerNameIdx !== -1 ? customerNameIdx : getIdx('לקוח', 2);
  const finalAddressIdx = addressIdx !== -1 ? addressIdx : getIdx('כתובת', 3);
  const finalContactIdx = contactIdx !== -1 ? contactIdx : getIdx('קשר', 4);
  const finalItemsIdx = itemsIdx !== -1 ? itemsIdx : getIdx('פריטים', 5);
  const finalStatusIdx = statusIdx !== -1 ? statusIdx : getIdx('סטטוס', 6);
  
  const parsedOrders: Order[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty lines or headers
    if (row.length < 2 || !row[finalOrderNumIdx]) continue;
    
    const rawDate = row[finalDateIdx] || "";
    let formattedDate = rawDate;
    
    // Parse date safely (supports DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD, etc.)
    const dRegex = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/;
    const dMatch = rawDate.match(dRegex);
    if (dMatch) {
      let day = dMatch[1].padStart(2, '0');
      let month = dMatch[2].padStart(2, '0');
      let year = dMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      formattedDate = `${year}-${month}-${day}`;
    } else {
      const yyyymmdd = /^\d{4}-\d{2}-\d{2}$/;
      if (!yyyymmdd.test(rawDate)) {
        const dObj = new Date(rawDate);
        if (!isNaN(dObj.getTime())) {
          formattedDate = dObj.toISOString().split('T')[0];
        } else {
          formattedDate = new Date().toISOString().split('T')[0];
        }
      }
    }
    
    // Map status from WhatsApp column safely
    const rawStatus = (row[finalStatusIdx] || "").trim();
    let status: OrderStatus = "ממתין להכנה";
    if (rawStatus.includes("נשלח") || rawStatus.includes("שלח") || rawStatus.includes("Sent") || rawStatus.includes("שולח") || rawStatus.includes("בוצע")) {
      status = "נשלח";
    } else if (rawStatus.includes("מוכן") || rawStatus.includes("Ready") || rawStatus.includes("איסוף")) {
      status = "מוכן לאיסוף";
    } else if (rawStatus.includes("בהכנה") || rawStatus.includes("הכנה") || rawStatus.includes("Preparing") || rawStatus.includes("עבודה")) {
      status = "בהכנה";
    } else if (rawStatus.includes("ממתין") || rawStatus.includes("Pending") || rawStatus.includes("חדש") || rawStatus.includes("טרם")) {
      status = "ממתין להכנה";
    }
    
    const rawItems = row[finalItemsIdx] || "";
    const cleanOrderNumber = row[finalOrderNumIdx].trim().replace(/^["']|["']$/g, '');
    
    parsedOrders.push({
      id: `sheet-${cleanOrderNumber}-${i}`,
      date: formattedDate,
      orderNumber: cleanOrderNumber,
      customerName: (row[finalCustomerIdx] || "לקוח כללי").trim().replace(/^["']|["']$/g, ''),
      deliveryAddress: (row[finalAddressIdx] || "לא צוינה כתובת").trim().replace(/^["']|["']$/g, ''),
      contactPerson: (row[finalContactIdx] || "").trim().replace(/^["']|["']$/g, ''),
      items: rawItems,
      parsedItems: parseItemsText(rawItems),
      status: status,
      notes: "",
      statusLog: [
        {
          status: status,
          timestamp: getFormattedTimestamp()
        }
      ]
    });
  }
  
  return parsedOrders;
}

export function getFormattedTimestamp(): string {
  const now = new Date();
  return now.toLocaleString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
