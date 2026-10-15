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
  onRecordPayment,
  onUpdatePreparationTime,
  loadingAction = false,
}) => {
  if (!order) return null;

  const orderId = order.id || order._id;
  const status = (order.orderStatus || "PENDING").toUpperCase();
  const paymentMethod = (order.paymentMethod || "CASH").toUpperCase();
  const isCashOrCod = paymentMethod === "COD" || paymentMethod === "CASH";
  const displayPaymentMethod = isCashOrCod ? "COD" : paymentMethod;
  const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
  const isPaid = paymentStatus === "PAID";
  const isOnlineUnpaid = paymentMethod === "ONLINE" && !isPaid;
  const isDelayed = status === "DELAYED";
  const isReady = status === "READY";
  const isActive = status !== "COMPLETED" && status !== "CANCELLED";

  const targetTime = order.estimatedReadyAt || order.expectedReadyAt;
  const remainingMinutes = targetTime
    ? Math.round((new Date(targetTime).getTime() - Date.now()) / 60000)
    : null;
  const expectedTimeStr = formatExpectedTime(targetTime);

  return (
    <div
      onClick={() => onViewDetails(order)}
      className={`group relative rounded-2xl border transition-all duration-200 cursor-pointer p-4 bg-white flex flex-col gap-3 shadow-[0_2px_12px_rgba(53,36,49,0.03)] hover:shadow-sakura-card ${
        isDelayed
          ? "border-rose-400/80 bg-rose-50/20 ring-1 ring-rose-400/30"
          : isReady
          ? "border-emerald-400/80 bg-emerald-50/20 ring-1 ring-emerald-400/30"
          : "border-[#EBD4DC] hover:border-[#C94F78]/50"
      }`}
    >
      {/* Top Header: Order Number, Time placed, & Details Link */}
      <div className="flex items-start justify-between gap-2 border-b border-[#EBD4DC]/80 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-base text-[#352431] tracking-tight">
              {order.orderNumber || `#${orderId.slice(-6)}`}
            </span>
            {isDelayed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                Late
              </span>
            )}
            {isReady && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#5F9A68] text-white">
                Ready
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-[#735A67]">
            <span className="font-semibold">{formatTimeAgo(order.createdAt)}</span>
            {order.user?.name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px] font-semibold text-[#352431]">
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
            className="flex items-center justify-between text-xs text-[#352431]"
          >
            <span className="flex items-center gap-1.5 truncate">
              <span className="font-black text-[#C94F78] min-w-[20px]">
                {item.quantity}×
              </span>
              <span className="truncate font-medium">{item.name}</span>
            </span>
            <span className="text-[#735A67] font-mono font-semibold ml-2">
              ₹{item.subtotal || item.unitPrice * item.quantity}
            </span>
          </div>
        ))}

        {/* Special Kitchen Notes Banner */}
        {order.notes && order.notes.trim() && (
          <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-1.5">
            <span className="text-sm leading-none">📝</span>
            <span className="italic font-medium">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Payment & Expected Time Info */}
      <div className="flex items-center justify-between pt-2 border-t border-[#EBD4DC]/80 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
              isPaid
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : isOnlineUnpaid
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {displayPaymentMethod}: {isPaid ? "PAID" : "UNPAID"}
          </span>
          <span className="font-mono font-black text-[#352431]">
            ₹{order.totalAmount}
          </span>
          {!isPaid && isCashOrCod && onRecordPayment && status !== "CANCELLED" && (
            <button
              type="button"
              disabled={loadingAction}
              onClick={(e) => {
                e.stopPropagation();
                onRecordPayment(orderId, "PAID");
              }}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition cursor-pointer"
              title="Collect Cash & Mark Paid"
            >
              💵 Collect
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {expectedTimeStr && (
            <div className="text-[11px] font-semibold text-[#735A67] flex items-center gap-1">
              <span>⏱️</span>
              <span>{expectedTimeStr}</span>
            </div>
          )}
          {remainingMinutes !== null && isActive && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                remainingMinutes <= 0
                  ? "bg-rose-100 text-rose-800"
                  : remainingMinutes <= 5
                  ? "bg-amber-100 text-amber-800"
                  : "bg-[#FBE7EE] text-[#C94F78]"
              }`}
            >
              {remainingMinutes <= 0 ? "Late" : `${remainingMinutes}m left`}
            </span>
          )}
          {isActive && onUpdatePreparationTime && (
            <button
              type="button"
              disabled={loadingAction}
              onClick={(e) => {
                e.stopPropagation();
                onUpdatePreparationTime(orderId, { adjustmentMinutes: 5 });
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBE7EE] hover:bg-[#F2BAC9] text-[#C94F78] border border-[#EBD4DC] transition cursor-pointer"
              title="Add 5 minutes prep time"
            >
              +5m
            </button>
          )}
        </div>
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
            className="flex-1 py-2 px-3 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer active:scale-98"
          >
            <span>{isOnlineUnpaid ? "Awaiting Pay" : "Accept & Confirm"}</span>
          </button>
        )}

        {status === "CONFIRMED" && (
          <button
            type="button"
            disabled={loadingAction}
            onClick={() => onStatusChange(orderId, "PREPARING")}
            className="flex-1 py-2 px-3 rounded-xl bg-[#352431] hover:bg-[#4a3345] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer active:scale-98"
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
              className="py-2 px-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
              title="Mark order as delayed"
            >
              ⚠️ Delayed
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "READY")}
              className="flex-1 py-2 px-3 rounded-xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer active:scale-98"
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
              className="py-2 px-2.5 rounded-xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#C94F78] hover:bg-[#FBE7EE]/80 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              Resume Prep
            </button>
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => onStatusChange(orderId, "READY")}
              className="flex-1 py-2 px-3 rounded-xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer active:scale-98"
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
            className="flex-1 py-2 px-3 rounded-xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer active:scale-98"
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
            className="p-2 rounded-xl border border-[#EBD4DC] hover:border-rose-300 text-[#735A67] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
