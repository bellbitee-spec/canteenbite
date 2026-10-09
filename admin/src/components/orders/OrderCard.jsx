import React from "react";
import OrderStatusBadge from "./OrderStatusBadge";

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSecs = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));

    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  } catch (_) {
    return "";
  }
};

const formatExpectedTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (_) {
    return null;
  }
};

const OrderCard = ({
  order,
  onStatusChange,
  onCancelClick,
  onViewDetails,
  loadingAction = false,
}) => {
  if (!order) return null;

  const orderId = order.id || order._id;
  const status = (order.orderStatus || "PENDING").toUpperCase();
  const paymentMethod = (order.paymentMethod || "CASH").toUpperCase();
  const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
  const isPaid = paymentStatus === "PAID";
  const isOnlineUnpaid = paymentMethod === "ONLINE" && !isPaid;
  const isDelayed = status === "DELAYED";
  const isReady = status === "READY";

  const expectedTimeStr = formatExpectedTime(order.expectedReadyAt);

  return (
    <div
      onClick={() => onViewDetails(order)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer p-4 bg-slate-900/90 hover:bg-slate-900 flex flex-col gap-3 shadow-md ${
        isDelayed
          ? "border-rose-500/60 ring-1 ring-rose-500/20 bg-rose-950/10"
          : isReady
          ? "border-emerald-500/50 bg-emerald-950/10"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {/* Top Header: Order Number, Time placed, & Details Link */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-white tracking-tight">
              #{order.orderNumber || orderId.slice(-6)}
            </span>
            {isDelayed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                Late
              </span>
            )}
            {isReady && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white">
                Ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span>{formatTimeAgo(order.createdAt)}</span>
            {order.user?.name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px] text-slate-300">
                  {order.user.name}
                </span>
              </>
            )}
          </div>
        </div>

        <OrderStatusBadge status={status} size="sm" />
      </div>

      {/* Items list summary */}
      <div className="space-y-1.5 flex-1 min-h-[48px]">
        {(order.items || []).map((item, idx) => (
          <div
            key={item.id || item._id || idx}
            className="flex items-center justify-between text-xs text-slate-200"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-indigo-400 min-w-[20px]">
                {item.quantity}×
              </span>
              <span className="truncate">{item.name}</span>
            </span>
            <span className="text-slate-400 font-mono ml-2">
              ₹{item.subtotal || item.unitPrice * item.quantity}
            </span>
          </div>
        ))}

        {/* Special Kitchen Notes Banner */}
        {order.notes && order.notes.trim() && (
          <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-1.5">
            <span className="text-sm leading-none">📝</span>
            <span className="italic font-medium">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Payment & Expected Time Info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide border ${
              isPaid
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isOnlineUnpaid
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            {paymentMethod}: {isPaid ? "PAID" : "PENDING"}
          </span>
          <span className="font-mono font-bold text-slate-200">
            ₹{order.totalAmount}
          </span>
        </div>

        {expectedTimeStr && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>⏱️</span>
            <span>{expectedTimeStr}</span>
          </div>
        )}
      </div>

      {/* Action Buttons Section */}
      <div
        className="pt-2 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "PENDING" && (
          <button
            type="button"
            disabled={loadingAction || isOnlineUnpaid}
            onClick={() => onStatusChange(orderId, "CONFIRMED")}
            title={
              isOnlineUnpaid
                ? "Cannot confirm online order before payment is completed"
                : "Confirm order for kitchen prep"
            }
            className="flex-1 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            <span>{isOnlineUnpaid ? "Awaiting Pay" : "Accept & Confirm"}</span>
          </button>
        )}

        {status === "CONFIRMED" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => onStatusChange(orderId, "PREPARING")}
            className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span>🍳 Start Prep</span>
          </button>
        )}

        {status === "PREPARING" && (
          <>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "DELAYED")}
              className="py-1.5 px-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-bold text-xs transition disabled:opacity-50"
              title="Mark order as delayed"
            >
              ⚠️ Delayed
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "READY")}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span>🔔 Mark Ready</span>
            </button>
          </>
        )}

        {status === "DELAYED" && (
          <>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "PREPARING")}
              className="py-1.5 px-2.5 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 font-bold text-xs transition disabled:opacity-50"
            >
              Resume Prep
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "READY")}
              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <span>🔔 Mark Ready</span>
            </button>
          </>
        )}

        {status === "READY" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => onStatusChange(orderId, "COMPLETED")}
            className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span>✅ Complete & Hand Over</span>
          </button>
        )}

        {/* Cancel button available on all active statuses */}
        {status !== "COMPLETED" && status !== "CANCELLED" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => onCancelClick(order)}
            title="Cancel order"
            className="p-1.5 rounded-xl border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
