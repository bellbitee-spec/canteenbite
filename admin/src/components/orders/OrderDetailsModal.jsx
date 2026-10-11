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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-white border border-[#EBD4DC] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#EBD4DC] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-[#352431] tracking-tight">
              Order #{order.orderNumber || orderId.slice(-6)}
            </h3>
            <OrderStatusBadge status={status} size="md" />
          </div>

          <button
            onClick={onClose}
            className="text-[#735A67] hover:text-[#352431] p-1.5 rounded-xl hover:bg-[#FBE7EE] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-sm">
          {/* Action Error / Concurrency Conflict Banner */}
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{actionError}</span>
            </div>
          )}

          {/* Cancellation Info if cancelled */}
          {status === "CANCELLED" && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                <span>🚫 Cancelled by {order.cancelledBy || "Unknown"}</span>
                {order.cancelledAt && (
                  <span className="text-rose-500 font-normal">
                    ({formatDateTime(order.cancelledAt)})
                  </span>
                )}
              </div>
              {order.cancellationReason && (
                <p className="text-xs text-rose-800 mt-1 italic">
                  "{order.cancellationReason}"
                </p>
              )}
            </div>
          )}

          {/* Customer & Order Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC]">
            <div>
              <p className="text-xs text-[#735A67] font-semibold mb-1">
                Customer Details
              </p>
              <p className="font-bold text-[#352431]">
                {order.user?.name || "Guest Student"}
              </p>
              {order.user?.email && (
                <p className="text-xs text-[#735A67] font-mono mt-0.5">
                  {order.user.email}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-[#735A67] font-semibold mb-1">
                Payment Info
              </p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#352431]">{paymentMethod}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                    isPaid
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
              <p className="text-xs text-[#735A67] font-mono mt-0.5">
                Total: ₹{order.totalAmount}
              </p>
            </div>
          </div>

          {/* Special Kitchen Notes */}
          {order.notes && order.notes.trim() && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <span className="text-base leading-none">📝</span>
              <div>
                <span className="font-bold block mb-0.5">Kitchen Note:</span>
                <span className="italic">{order.notes}</span>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          <div>
            <h4 className="text-xs font-bold text-[#735A67] uppercase tracking-wider mb-3">
              Items Ordered
            </h4>
            <div className="rounded-2xl border border-[#EBD4DC] overflow-hidden divide-y divide-[#EBD4DC]">
              {(order.items || []).map((item, idx) => (
                <div
                  key={item.id || item._id || idx}
                  className="p-3.5 flex items-center justify-between text-xs bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#FBE7EE] text-[#C94F78] font-bold flex items-center justify-center font-mono text-xs">
                      {item.quantity}×
                    </span>
                    <div>
                      <p className="font-bold text-[#352431]">{item.name}</p>
                      <p className="text-[11px] text-[#735A67] font-mono">
                        ₹{item.unitPrice} each
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#352431] text-sm">
                    ₹{item.subtotal || item.unitPrice * item.quantity}
                  </span>
                </div>
              ))}

              <div className="p-3.5 flex items-center justify-between bg-[#FFF9F2] font-bold">
                <span className="text-[#352431]">Total</span>
                <span className="text-[#C94F78] font-mono text-base font-bold">
                  ₹{order.totalAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline & Timestamps */}
          <div>
            <h4 className="text-xs font-bold text-[#735A67] uppercase tracking-wider mb-3">
              Lifecycle Timestamps
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC]">
                <span className="text-[#735A67] block text-[10px]">Placed At</span>
                <span className="text-[#352431] font-medium">
                  {formatDateTime(order.createdAt) || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC]">
                <span className="text-[#735A67] block text-[10px]">Est. Prep Time</span>
                <span className="text-[#352431] font-medium">
                  {order.estimatedPreparationTime
                    ? `${order.estimatedPreparationTime} mins`
                    : "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC]">
                <span className="text-[#735A67] block text-[10px]">Expected Ready</span>
                <span className="text-[#352431] font-medium">
                  {formatDateTime(order.expectedReadyAt) || "—"}
                </span>
              </div>

              {order.preparationStartedAt && (
                <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC]">
                  <span className="text-[#735A67] block text-[10px]">Prep Started</span>
                  <span className="text-[#352431] font-medium">
                    {formatDateTime(order.preparationStartedAt)}
                  </span>
                </div>
              )}

              {order.delayedAt && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-rose-600 block text-[10px]">Delayed Marked</span>
                  <span className="text-rose-800 font-medium">
                    {formatDateTime(order.delayedAt)}
                  </span>
                </div>
              )}

              {order.readyAt && (
                <div className="p-2.5 rounded-xl bg-[#5F9A68]/10 border border-[#5F9A68]/20">
                  <span className="text-[#5F9A68] block text-[10px]">Marked Ready</span>
                  <span className="text-[#352431] font-medium">
                    {formatDateTime(order.readyAt)}
                  </span>
                </div>
              )}

              {order.completedAt && (
                <div className="p-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC]">
                  <span className="text-[#735A67] block text-[10px]">Completed At</span>
                  <span className="text-[#352431] font-medium">
                    {formatDateTime(order.completedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#EBD4DC] bg-white flex flex-wrap items-center justify-between gap-3 sticky bottom-0">
          <div>
            {status !== "COMPLETED" && status !== "CANCELLED" && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onCancelClick(order)}
                className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-xs font-bold transition shadow-sakura-sm disabled:opacity-50 cursor-pointer"
              >
                {isOnlineUnpaid ? "Awaiting Payment" : "Accept & Confirm"}
              </button>
            )}

            {status === "CONFIRMED" && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => onStatusChange(orderId, "PREPARING")}
                className="px-4 py-2 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-xs font-bold transition shadow-sakura-sm disabled:opacity-50 cursor-pointer"
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
                  className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  ⚠️ Mark Delayed
                </button>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "READY")}
                  className="px-4 py-2 rounded-xl bg-[#5F9A68] hover:bg-[#4E8256] text-white text-xs font-bold transition shadow-sakura-sm disabled:opacity-50 cursor-pointer"
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
                  className="px-3 py-2 rounded-xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#C94F78] hover:bg-[#f6d5e2] text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Resume Prep
                </button>
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => onStatusChange(orderId, "READY")}
                  className="px-4 py-2 rounded-xl bg-[#5F9A68] hover:bg-[#4E8256] text-white text-xs font-bold transition shadow-sakura-sm disabled:opacity-50 cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-[#5F9A68] hover:bg-[#4E8256] text-white text-xs font-bold transition shadow-sakura-sm disabled:opacity-50 cursor-pointer"
              >
                ✅ Complete & Hand Over
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#EBD4DC] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] text-xs font-bold transition cursor-pointer"
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
