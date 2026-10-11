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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-md bg-white border border-[#EBD4DC] rounded-3xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#352431] tracking-tight">
                Cancel Order #{order.orderNumber || (order.id || order._id).slice(-6)}
              </h3>
              <p className="text-xs text-[#735A67]">
                This will void the order and restore product stock
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-[#735A67] hover:text-[#352431] p-1 rounded-lg hover:bg-[#FBE7EE] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {(error || localError) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#352431] mb-1.5">
              Cancellation Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setLocalError("");
              }}
              placeholder="e.g. Kitchen out of ingredients, closing early, equipment failure"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] text-sm focus:outline-hidden focus:border-[#C94F78] transition resize-none placeholder:text-[#927681]"
              autoFocus
            />
            <p className="text-[11px] text-[#735A67] mt-1">
              Required by kitchen protocol and shown to the student.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[#EBD4DC] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] text-xs font-bold transition cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
