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
  
  // Split by common separators: newlines, commas, semicolons
  const lines = text.split(/[\n,;]+/).map(line => line.trim()).filter(Boolean);
  
  return lines.map(line => {
    // Try to match standard format: e.g. "5 יח' x צמנט פורטלנד (1001)"
    // Or "5 x cement"
    // Regex matches quantity optionally followed by יח' or units, then an optional 'x' or 'X' or 'כפול' or '*', then the product name and optional SKU in parenthesis
    
    // First, extract quantity from the beginning
    const qtyRegex = /^(\d+)\s*(?:יח'|יחידות|יחידה)?\s*(?:x|X|\*|-)?\s*(.+)$/;
    const qtyMatch = line.match(qtyRegex);
    
    let quantity = 1;
    let nameAndSku = line;
    
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      nameAndSku = qtyMatch[2].trim();
    }
    
    // Now extract SKU if inside parenthesis at the end, e.g. "צמנט פורטלנד (1001)" or "חול (מק\"ט 2002)"
    const skuRegex = /\((?:מק"ט|מקט)?\s*(\w+)\)$/;
    const skuMatch = nameAndSku.match(skuRegex);
    
    let name = nameAndSku;
    let sku = "";
    
    if (skuMatch) {
      sku = skuMatch[1];
      // remove the parenthesis part from the name
      name = nameAndSku.replace(/\s*\((?:מק"ט|מקט)?\s*\w+\)$/, "").trim();
    }
    
    return {
      quantity,
      name: name || "מוצר כללי",
      sku: sku || undefined
    };
  });
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
