import { Order, OrderStatus, STATUS_OPTIONS } from "../types";
import { Calendar, Hash, User, MapPin, Phone, FileText, Edit, Trash2, ExternalLink, Tag, MessageSquare } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onAddNote: (orderId: string) => void;
  isSelected?: boolean;
  onSelectChange?: (orderId: string, isSelected: boolean) => void;
  key?: string;
}

export default function OrderCard({
  order,
  onStatusChange,
  onEdit,
  onDelete,
  onAddNote,
  isSelected = false,
  onSelectChange
}: OrderCardProps) {
  
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

  return (
    <div
      id={`order-card-${order.id}`}
      className={`relative flex flex-col justify-between rounded-2xl border ${
        isSelected
          ? "border-cyan-500/60 bg-gradient-to-br from-slate-900/80 to-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          : "border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/40"
      } p-5 md:p-6 transition-all duration-300 ease-out shadow-xl ${config.border} hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 hover:shadow-slate-950/60 group overflow-hidden`}
    >
      {/* Top linear highlight line */}
      <div className={`absolute top-0 left-0 right-0 h-[1.5px] ${
        isSelected ? "bg-gradient-to-r from-transparent via-cyan-400 to-transparent" : "bg-gradient-to-r from-transparent via-cyan-500/35 to-transparent"
      } rounded-t-2xl pointer-events-none`} />

      {/* Background radial glow */}
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${config.glow} blur-2xl opacity-40 pointer-events-none`} />

      {/* Card Header: Order # and Status Selection */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-800/50 relative z-10">
        <div className="flex items-center gap-3">
          {onSelectChange && (
            <div className="flex items-center justify-center pt-0.5">
              <input
                type="checkbox"
                id={`checkbox-${order.id}`}
                checked={isSelected}
                onChange={(e) => onSelectChange(order.id, e.target.checked)}
                className="h-4.5 w-4.5 rounded-lg border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-slate-900 transition-all cursor-pointer accent-cyan-500"
              />
            </div>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-slate-850">
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
            className={`appearance-none rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all shadow-md focus:outline-none focus:ring-1 focus:ring-slate-700 pl-8 pr-3 text-right cursor-pointer ${config.badge}`}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status} className="bg-slate-950 text-slate-200 py-1 font-sans">
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

      {/* Card Body: Customer details & Address */}
      <div className="py-4 flex flex-col gap-3.5 relative z-10 text-right">
        {/* Customer name */}
        <div className="flex items-start gap-2.5">
          <User className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-1">לקוח</span>
            <span className="text-sm font-bold text-slate-100">{order.customerName}</span>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-slate-500 mt-1 shrink-0" />
          <div className="flex flex-col w-full">
            <span className="text-[10px] text-slate-500 font-semibold leading-none mb-1">כתובת אספקה</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-300 font-medium leading-normal">{order.deliveryAddress}</span>
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
            <span className="text-xs text-slate-300 font-medium">{order.contactPerson}</span>
          </div>
        </div>
      </div>

      {/* Card Products Area */}
      <div className="mt-1 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/50 relative z-10 text-right">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900 mb-2">
          <Tag className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[11px] font-bold text-slate-400">מוצרים להכנה:</span>
        </div>
        <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
          {order.parsedItems.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-900/20 last:border-b-0">
              {/* Product Sku on left */}
              {item.sku ? (
                <span className="font-mono text-[10px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-850">
                  {item.sku}
                </span>
              ) : (
                <span />
              )}
              {/* Product name & quantity on right */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-200 font-medium">{item.name}</span>
                <span className="font-mono text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-500/15 px-1.5 py-0.2 rounded">
                  {item.quantity} יח'
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Notes / Special Instructions */}
      {order.notes && (
        <div className="mt-3.5 flex items-start gap-2 text-right p-2.5 rounded-xl border border-amber-500/10 bg-amber-500/5 relative z-10">
          <FileText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">הערה מיוחדת:</span>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">{order.notes}</p>
          </div>
        </div>
      )}

      {/* Card Actions: Edit, Note & Delete */}
      <div className="mt-5 pt-3 border-t border-slate-800/40 flex items-center justify-between relative z-10">
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
