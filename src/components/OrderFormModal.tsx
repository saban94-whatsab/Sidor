import React, { useState, useEffect } from "react";
import { Order, OrderStatus, STATUS_OPTIONS } from "../types";
import { X, Save, FileText, Calendar, Hash, User, MapPin, Phone, HelpCircle, History } from "lucide-react";

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: Omit<Order, "id" | "parsedItems"> & { id?: string }) => void;
  editingOrder?: Order | null;
}

export default function OrderFormModal({ isOpen, onClose, onSubmit, editingOrder }: OrderFormModalProps) {
  const [date, setDate] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [items, setItems] = useState("");
  const [status, setStatus] = useState<OrderStatus>("ממתין להכנה");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // When editingOrder changes, fill the form
  useEffect(() => {
    if (editingOrder) {
      setDate(editingOrder.date);
      setOrderNumber(editingOrder.orderNumber);
      setCustomerName(editingOrder.customerName);
      setDeliveryAddress(editingOrder.deliveryAddress);
      setContactPerson(editingOrder.contactPerson);
      setItems(editingOrder.items);
      setStatus(editingOrder.status);
      setNotes(editingOrder.notes || "");
    } else {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
      
      // Auto-generate a random 7 digit order number
      setOrderNumber(String(Math.floor(1000000 + Math.random() * 9000000)));
      
      setCustomerName("");
      setDeliveryAddress("");
      setContactPerson("");
      setItems("");
      setStatus("ממתין להכנה");
      setNotes("");
    }
    setErrors({});
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!date) tempErrors.date = "חובה לבחור תאריך";
    if (!orderNumber.trim()) tempErrors.orderNumber = "חובה להזין מספר הזמנה";
    if (!customerName.trim()) tempErrors.customerName = "חובה להזין שם לקוח";
    if (!deliveryAddress.trim()) tempErrors.deliveryAddress = "חובה להזין כתובת אספקה";
    if (!contactPerson.trim()) tempErrors.contactPerson = "חובה להזין איש קשר וטלפון";
    if (!items.trim()) tempErrors.items = "חובה להזין מוצרים";
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: editingOrder?.id,
      date,
      orderNumber,
      customerName,
      deliveryAddress,
      contactPerson,
      items,
      status,
      notes: notes.trim() || undefined
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto" id="order-form-modal">
      <div 
        className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl p-6 md:p-8 text-right overflow-hidden my-8"
        dir="rtl"
      >
        {/* Glow Header */}
        <div className="absolute -top-16 -left-16 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6 relative z-10">
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            {editingOrder ? `עריכת הזמנה #${editingOrder.orderNumber}` : "הוספת הזמנה חדשה לסידור"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFormSubmit} className="space-y-5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Order Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-cyan-400" />
                <span>מספר הזמנה:</span>
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className={`w-full bg-slate-950 border ${errors.orderNumber ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none transition-all`}
                placeholder="למשל: 6213836"
              />
              {errors.orderNumber && <span className="text-[11px] text-red-400 font-semibold">{errors.orderNumber}</span>}
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                <span>תאריך מיועד:</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full bg-slate-950 border ${errors.date ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none transition-all`}
              />
              {errors.date && <span className="text-[11px] text-red-400 font-semibold">{errors.date}</span>}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Customer Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-cyan-400" />
                <span>שם הלקוח / חברה:</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full bg-slate-950 border ${errors.customerName ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-all`}
                placeholder="למשל: ישראל ישראלי בע''מ"
              />
              {errors.customerName && <span className="text-[11px] text-red-400 font-semibold">{errors.customerName}</span>}
            </div>

            {/* Contact Person */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-cyan-400" />
                <span>איש קשר וטלפון:</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className={`w-full bg-slate-950 border ${errors.contactPerson ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-all`}
                placeholder="למשל: משה (052-1234567)"
              />
              {errors.contactPerson && <span className="text-[11px] text-red-400 font-semibold">{errors.contactPerson}</span>}
            </div>

          </div>

          {/* Delivery Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span>כתובת אספקה מלאה:</span>
            </label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className={`w-full bg-slate-950 border ${errors.deliveryAddress ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-all`}
              placeholder="למשל: הרצל 45, ראשון לציון"
            />
            {errors.deliveryAddress && <span className="text-[11px] text-red-400 font-semibold">{errors.deliveryAddress}</span>}
          </div>

          {/* Items textarea */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                <span>פירוט מוצרים (שורה לכל מוצר):</span>
              </label>
              <div className="group relative flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-400 cursor-help">
                <HelpCircle className="h-3 w-3" />
                <span>הסבר פורמט</span>
                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-950 border border-slate-800 rounded-xl text-right text-xs leading-relaxed hidden group-hover:block shadow-2xl z-25 text-slate-300">
                  נא להזין מוצרים בפורמט:<br />
                  <strong className="text-cyan-400 font-mono">כמות יח' x שם מוצר (מק"ט)</strong><br />
                  למשל:<br />
                  <code className="text-slate-400 block mt-1 font-mono">5 יח' x מלט פורטלנד (1001)</code>
                  <code className="text-slate-400 block font-mono">10 יח' x בלוק בטון 20 (2044)</code>
                </div>
              </div>
            </div>
            <textarea
              value={items}
              onChange={(e) => setItems(e.target.value)}
              rows={4}
              className={`w-full bg-slate-950 border ${errors.items ? 'border-red-500' : 'border-slate-800 focus:border-cyan-500'} rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono transition-all`}
              placeholder="5 יח' x מלט פורטלנד (1001)&#10;10 יח' x בלוק בטון 20 (2044)"
            />
            {errors.items && <span className="text-[11px] text-red-400 font-semibold">{errors.items}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">סטטוס הזמנה:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption} className="bg-slate-950 text-slate-200">
                    {statusOption}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">הערות מיוחדות / דגשים לפריקה:</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-all"
                placeholder="דחוף לפרוק עם מנוף..."
              />
            </div>
          </div>

          {/* Audit Log (Only when editing and log exists) */}
          {editingOrder && (
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 mt-2">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800/40 text-right">
                <History className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">היסטוריית שינויי סטטוס (Audit Log)</span>
              </div>
              
              {editingOrder.statusLog && editingOrder.statusLog.length > 0 ? (
                <div className="max-h-24 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {editingOrder.statusLog.map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50" />
                        <span>הסטטוס עודכן ל: <strong className="text-slate-200">{log.status}</strong></span>
                      </div>
                      <span className="font-mono text-slate-500 text-left">{log.timestamp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic text-right">
                  אין תיעוד לשינויי סטטוס קודמים עבור הזמנה זו.
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-cyan-500/10 border border-cyan-400/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{editingOrder ? "שמור שינויים" : "צור הזמנה חדשה"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
