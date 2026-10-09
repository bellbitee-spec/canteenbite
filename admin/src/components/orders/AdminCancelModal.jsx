import React, { useState } from "react";

const AdminCancelModal = ({
  order,
  isOpen,
  onClose,
  onConfirm,
  submitting,
  error,
}) => {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  if (!isOpen || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setLocalError("Please provide a reason for cancelling this order.");
      return;
    }
    setLocalError("");
    onConfirm(order.id || order._id, reason.trim());
  };

  const handleClose = () => {
    setReason("");
    setLocalError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Cancel Order #{order.orderNumber || (order.id || order._id).slice(-6)}
              </h3>
              <p className="text-xs text-slate-400">
                This will void the order and restore product stock
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {(error || localError) && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cancellation Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setLocalError("");
              }}
              placeholder="e.g. Kitchen out of ingredients, closing early, equipment failure"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-hidden focus:border-rose-500 transition resize-none placeholder:text-slate-600"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required by kitchen protocol and shown to the student.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{submitting ? "Cancelling..." : "Confirm Cancellation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminCancelModal;
