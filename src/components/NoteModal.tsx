import React, { useState, useEffect } from "react";
import { X, FileText, MessageSquare, Check } from "lucide-react";

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  initialNote: string;
  onSave: (note: string) => void;
}

export default function NoteModal({
  isOpen,
  onClose,
  orderNumber,
  initialNote,
  onSave
}: NoteModalProps) {
  const [noteText, setNoteText] = useState(initialNote);

  useEffect(() => {
    if (isOpen) {
      setNoteText(initialNote);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(noteText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div 
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/45 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5 text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/80 border border-cyan-500/20 text-cyan-400">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">הוספת הערה להזמנה</h3>
              <p className="text-[11px] text-slate-400 font-mono">הזמנה #{orderNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-850 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="note-textarea" className="block text-xs font-bold text-slate-400 mb-2">
              תוכן ההערה (זמני):
            </label>
            <textarea
              id="note-textarea"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="רשום הערה קצרה, למשל: 'איסוף דחוף', 'להשאיר מאחורי הגדר', 'חסר במלאי'..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none text-right"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>שמור הערה</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
