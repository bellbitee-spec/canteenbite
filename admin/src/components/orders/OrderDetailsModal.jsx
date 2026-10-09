import React from "react";
import OrderStatusBadge from "./OrderStatusBadge";

const formatDateTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (_) {
    return null;
  }
};

const OrderDetailsModal = ({
  order,
  isOpen,
  onClose,
  onStatusChange,
  onCancelClick,
  loadingAction,
  actionError,
}) => {
  if (!isOpen || !order) return null;

  const orderId = order.id || order._id;
  const status = (order.orderStatus || "PENDING").toUpperCase();
  const paymentMethod = (order.paymentMethod || "CASH").toUpperCase();
  const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
  const isPaid = paymentStatus === "PAID";
  const isOnlineUnpaid = paymentMethod === "ONLINE" && !isPaid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Order #{order.orderNumber || orderId.slice(-6)}
            </h3>
            <OrderStatusBadge status={status} size="md" />
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* Action Error / Concurrency Conflict Banner */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{actionError}</span>
            </div>
          )}

          {/* Cancellation Info if cancelled */}
          {status === "CANCELLED" && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <span>🚫 Cancelled by {order.cancelledBy || "Unknown"}</span>
                {order.cancelledAt && (
                  <span className="text-rose-400/70 font-normal">
                    ({formatDateTime(order.cancelledAt)})
                  </span>
                )}
              </div>
              {order.cancellationReason && (
                <p className="text-xs text-rose-200 mt-1 italic">
                  "{order.cancellationReason}"
                </p>
              )}
            </div>
          )}

          {/* Customer & Order Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">
                Customer Details
              </p>
              <p className="font-bold text-white">
                {order.user?.name || "Guest Student"}
              </p>
              {order.user?.email && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {order.user.email}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">
                Payment Info
              </p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{paymentMethod}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    isPaid
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Total: ₹{order.totalAmount}
              </p>
            </div>
          </div>

          {/* Special Kitchen Notes */}
          {order.notes && order.notes.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <span className="text-base leading-none">📝</span>
              <div>
                <span className="font-bold block mb-0.5">Kitchen Note:</span>
                <span className="italic">{order.notes}</span>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Items Ordered
            </h4>
            <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800">
              {(order.items || []).map((item, idx) => (
                <div
                  key={item.id || item._id || idx}
                  className="p-3.5 flex items-center justify-between text-xs bg-slate-950/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center font-mono">
                      {item.quantity}×
                    </span>
                    <div>
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        ₹{item.unitPrice} each
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white text-sm">
                    ₹{item.subtotal || item.unitPrice * item.quantity}
                  </span>
                </div>
              ))}

              <div className="p-3.5 flex items-center justify-between bg-slate-950 font-bold">
                <span className="text-slate-300">Total</span>
                <span className="text-indigo-400 font-mono text-base">
                  ₹{order.totalAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Timestamps */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Lifecycle Timestamps
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Placed At</span>
                <span className="text-slate-200 font-medium">
                  {formatDateTime(order.createdAt) || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Est. Prep Time</span>
                <span className="text-slate-200 font-medium">
                  {order.estimatedPreparationTime
                    ? `${order.estimatedPreparationTime} mins`
                    : "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Expected Ready</span>
                <span className="text-slate-200 font-medium">
                  {formatDateTime(order.expectedReadyAt) || "—"}
                </span>
              </div>

              {order.preparationStartedAt && (
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Prep Started</span>
                  <span className="text-slate-200 font-medium">
                    {formatDateTime(order.preparationStartedAt)}
                  </span>
                </div>
              )}

              {order.delayedAt && (
                <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20">
                  <span className="text-rose-400 block text-[10px]">Delayed Marked</span>
                  <span className="text-rose-200 font-medium">
                    {formatDateTime(order.delayedAt)}
                  </span>
                </div>
              )}

              {order.readyAt && (
                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <span className="text-emerald-400 block text-[10px]">Marked Ready</span>
                  <span className="text-emerald-200 font-medium">
                    {formatDateTime(order.readyAt)}
                  </span>
                </div>
              )}

              {order.completedAt && (
                <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">Completed At</span>
                  <span className="text-slate-200 font-medium">
                    {formatDateTime(order.completedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 sticky bottom-0">
          <div>
            {status !== "COMPLETED" && status !== "CANCELLED" && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onCancelClick(order)}
                className="px-3.5 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status === "PENDING" && (
              <button
                type="button"
                disabled={loadingAction || isOnlineUnpaid}
                onClick={() => onStatusChange(orderId, "CONFIRMED")}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {isOnlineUnpaid ? "Awaiting Payment" : "Accept & Confirm"}
              </button>
            )}

            {status === "CONFIRMED" && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onStatusChange(orderId, "PREPARING")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                🍳 Start Preparation
              </button>
            )}

            {status === "PREPARING" && (
              <>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "DELAYED")}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition disabled:opacity-50"
                >
                  ⚠️ Mark Delayed
                </button>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "READY")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  🔔 Mark Ready
                </button>
              </>
            )}

            {status === "DELAYED" && (
              <>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "PREPARING")}
                  className="px-3 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 text-xs font-bold transition disabled:opacity-50"
                >
                  Resume Prep
                </button>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "READY")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  🔔 Mark Ready
                </button>
              </>
            )}

            {status === "READY" && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onStatusChange(orderId, "COMPLETED")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                ✅ Complete & Hand Over
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
