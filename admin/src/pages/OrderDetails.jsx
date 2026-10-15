import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import orderService from "../services/orderService";
import useOrderSocket from "../hooks/useOrderSocket";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import AdminCancelModal from "../components/orders/AdminCancelModal";

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

const formatTimeMMSS = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [toast, setToast] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Prep adjustment states
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getOrderById(id);
      const orderData = res.order || (res.data && res.data.order) || res;
      setOrder(orderData);
    } catch (err) {
      setError(err.message || "Failed to load order details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Socket listener for real-time synchronization
  const handleSocketOrderUpdate = useCallback(
    (updatedOrder) => {
      if (!updatedOrder) return;
      const updatedId = updatedOrder.id || updatedOrder._id;
      if (updatedId && id && updatedId.toString() === id.toString()) {
        setOrder((prev) => ({
          ...(prev || {}),
          ...updatedOrder,
          orderStatus: updatedOrder.orderStatus || updatedOrder.status || prev?.orderStatus,
        }));
      }
    },
    [id]
  );

  const { connected } = useOrderSocket(id, {
    onOrderUpdated: handleSocketOrderUpdate,
    onStatusUpdated: (data) => {
      if (data && (data.orderId === id || data.id === id)) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                orderStatus: data.orderStatus || data.status,
                ...(data.estimatedReadyAt && { estimatedReadyAt: data.estimatedReadyAt }),
                ...(data.estimatedPreparationMinutes && {
                  estimatedPreparationMinutes: data.estimatedPreparationMinutes,
                }),
              }
            : prev
        );
      }
    },
  });

  // Calculate live remaining seconds
  const status = (order?.orderStatus || "PENDING").toUpperCase();
  const isActive = status !== "COMPLETED" && status !== "CANCELLED";
  const readyTimestamp = order?.estimatedReadyAt || order?.expectedReadyAt;

  const calculateRemaining = useCallback(() => {
    if (!readyTimestamp) return 0;
    return Math.floor((new Date(readyTimestamp).getTime() - Date.now()) / 1000);
  }, [readyTimestamp]);

  const [remainingSecs, setRemainingSecs] = useState(calculateRemaining);

  useEffect(() => {
    setRemainingSecs(calculateRemaining());
    if (!isActive || status === "READY") return;

    const interval = setInterval(() => {
      setRemainingSecs(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [readyTimestamp, status, isActive, calculateRemaining]);

  // Status transitions
  const handleStatusChange = async (newStatus) => {
    if (!order) return;
    setLoadingAction(true);
    try {
      const res = await orderService.updateOrderStatus(id, newStatus);
      const updated = res.order || (res.data && res.data.order);
      if (updated) setOrder(updated);
      showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      showToast(err.data?.message || err.message || "Failed to update status", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Adjust prep time
  const handleAdjustMinutes = async (mins) => {
    if (!order || loadingAction) return;
    setLoadingAction(true);
    try {
      const res = await orderService.updatePreparationTime(id, { adjustmentMinutes: mins });
      const updated = res.order || (res.data && res.data.order);
      if (updated) setOrder(updated);
      showToast(`Preparation time adjusted by ${mins > 0 ? `+${mins}` : mins} min`);
    } catch (err) {
      showToast(err.data?.message || err.message || "Failed to adjust preparation time", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSetCustomRemaining = async (e) => {
    e.preventDefault();
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1 || val > 300) {
      showToast("Please enter between 1 and 300 minutes", "error");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await orderService.updatePreparationTime(id, { remainingMinutes: val });
      const updated = res.order || (res.data && res.data.order);
      if (updated) setOrder(updated);
      setCustomInput("");
      setShowCustom(false);
      showToast(`Remaining preparation time set to ${val} min`);
    } catch (err) {
      showToast(err.data?.message || err.message || "Failed to set preparation time", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Record payment
  const handleRecordPayment = async (paymentStatus = "PAID") => {
    if (!order || loadingAction) return;
    setLoadingAction(true);
    try {
      const res = await orderService.recordPayment(id, { paymentStatus });
      const updated = res.order || (res.data && res.data.order);
      if (updated) setOrder(updated);
      showToast("Payment recorded successfully.");
    } catch (err) {
      showToast(err.data?.message || err.message || "Failed to record payment", "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Cancellation
  const handleConfirmCancel = async (reason) => {
    if (!order) return;
    setCancelSubmitting(true);
    try {
      const res = await orderService.cancelOrder(id, reason);
      const updated = res.order || (res.data && res.data.order);
      if (updated) setOrder(updated);
      setIsCancelModalOpen(false);
      showToast("Order cancelled successfully.");
    } catch (err) {
      showToast(err.data?.message || err.message || "Failed to cancel order", "error");
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-[#EBD4DC] shadow-xs">
        <div className="size-8 border-2 border-[#C94F78] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#735A67]">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-[#EBD4DC] shadow-xs space-y-4">
        <span className="text-4xl block">🔍</span>
        <h3 className="text-lg font-bold text-[#352431]">Order Not Found</h3>
        <p className="text-xs text-[#735A67] max-w-sm mx-auto">
          {error || "The requested order could not be loaded."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="px-4 py-2 rounded-xl bg-[#C94F78] text-white text-xs font-bold shadow-sakura-sm cursor-pointer"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const paymentMethod = (order.paymentMethod || "COD").toUpperCase();
  const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
  const isPaid = paymentStatus === "PAID";
  const isCashOrCod = paymentMethod === "COD" || paymentMethod === "CASH";
  const isOnlineUnpaid = paymentMethod === "ONLINE" && !isPaid;

  const totalPrepMins = order.estimatedPreparationMinutes || 15;
  const isOverdue = remainingSecs <= 0 && isActive && status !== "READY";
  const percentElapsed =
    totalPrepMins > 0
      ? Math.min(100, Math.max(0, ((totalPrepMins * 60 - remainingSecs) / (totalPrepMins * 60)) * 100))
      : 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-bounce ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EBD4DC]">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-2xl border border-[#EBD4DC] hover:border-[#C94F78] text-[#735A67] hover:text-[#C94F78] bg-white transition cursor-pointer shadow-sakura-sm"
            title="Back to Orders"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-black text-[#352431] font-mono tracking-tight">
                {order.orderNumber || `#${(order.id || order._id).slice(-6)}`}
              </h2>
              <OrderStatusBadge status={status} size="md" />
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  connected
                    ? "bg-[#5F9A68]/10 text-[#5F9A68] border-[#5F9A68]/20"
                    : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#5F9A68]" : "bg-amber-500"}`} />
                <span>{connected ? "Live" : "Reconnecting"}</span>
              </span>
            </div>
            <p className="text-xs text-[#735A67] mt-1">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchOrder}
          className="self-start sm:self-auto px-3.5 py-2 rounded-2xl border border-[#EBD4DC] hover:border-[#C94F78] text-[#735A67] hover:text-[#C94F78] bg-white transition cursor-pointer text-xs font-bold flex items-center gap-2 shadow-sakura-sm"
        >
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Order Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Customer & Items */}
        <div className="md:col-span-2 space-y-6">
          {/* Customer & Payment Card */}
          <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-4">
            <h3 className="font-bold text-sm text-[#352431] uppercase tracking-wider">
              Customer & Payment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[#927681] font-semibold mb-0.5">Student / Customer</p>
                <p className="font-bold text-[#352431] text-sm">
                  {order.user?.name || "Student"}
                </p>
                <p className="text-[#735A67]">{order.user?.email || "—"}</p>
                {order.user?.phone && (
                  <p className="text-[#735A67] font-mono mt-0.5">📞 {order.user.phone}</p>
                )}
              </div>

              <div>
                <p className="text-[#927681] font-semibold mb-0.5">Payment Method & Status</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF9F2] text-[#352431] border border-[#EBD4DC]">
                    {paymentMethod === "COD" || paymentMethod === "CASH" ? "Cash on Delivery (COD)" : paymentMethod}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
                {!isPaid && isCashOrCod && status !== "CANCELLED" && (
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleRecordPayment("PAID")}
                    className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>💵</span>
                    <span>Collect Cash & Mark Paid</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Ordered Items Table */}
          <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-4">
            <h3 className="font-bold text-sm text-[#352431] uppercase tracking-wider">
              Ordered Items
            </h3>
            <div className="rounded-2xl border border-[#EBD4DC] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF9F2] text-[#735A67] font-bold border-b border-[#EBD4DC]">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBD4DC]/80 text-[#352431]">
                  {(order.items || []).map((item, idx) => (
                    <tr key={item.id || item._id || idx}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-center font-bold font-mono text-[#C94F78]">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#735A67]">
                        ₹{item.price || item.unitPrice}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#352431]">
                        ₹{item.subtotal || (item.price || item.unitPrice) * item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#FFF9F2] font-bold text-xs border-t border-[#EBD4DC]">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-[#735A67]">
                      Grand Total
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-base text-[#352431]">
                      ₹{order.totalAmount}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Special Instructions */}
            {order.notes && order.notes.trim() && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <span className="text-base leading-none">📝</span>
                <div>
                  <p className="font-bold">Kitchen Instructions:</p>
                  <p className="italic mt-0.5">{order.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timer & Admin Controls */}
        <div className="space-y-6">
          {/* Live Kitchen Preparation Timer */}
          <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#352431] uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Live Kitchen Timer</span>
              </h3>
              <span className="text-xs font-semibold text-[#735A67]">
                Est: {totalPrepMins} min
              </span>
            </div>

            {/* Countdown Box */}
            <div
              className={`p-4 rounded-2xl border text-center transition-all ${
                status === "READY"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : status === "COMPLETED"
                  ? "bg-stone-50 border-stone-200 text-stone-700"
                  : isOverdue
                  ? "bg-rose-50 border-rose-300 text-rose-900 ring-2 ring-rose-400/30"
                  : "bg-[#FFF9F2] border-[#EBD4DC] text-[#352431]"
              }`}
            >
              {status === "READY" ? (
                <div>
                  <span className="text-2xl block mb-1">🔔</span>
                  <p className="font-black text-lg text-emerald-700">Order is Ready!</p>
                  <p className="text-xs text-emerald-600">Waiting for pickup</p>
                </div>
              ) : status === "COMPLETED" ? (
                <div>
                  <span className="text-2xl block mb-1">✅</span>
                  <p className="font-black text-lg text-stone-700">Order Completed</p>
                  <p className="text-xs text-stone-500">Delivered & Closed</p>
                </div>
              ) : status === "CANCELLED" ? (
                <div>
                  <span className="text-2xl block mb-1">✕</span>
                  <p className="font-black text-lg text-rose-700">Order Cancelled</p>
                </div>
              ) : (
                <div>
                  <div className="font-mono text-3xl font-black tracking-tight">
                    {isOverdue ? (
                      <span className="text-rose-600 animate-pulse">Taking longer</span>
                    ) : (
                      formatTimeMMSS(remainingSecs)
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#735A67] mt-1">
                    {isOverdue
                      ? `Overdue by ${Math.abs(Math.floor(remainingSecs / 60))}m`
                      : "Remaining preparation time"}
                  </p>
                  {order.estimatedReadyAt && (
                    <p className="text-[11px] text-[#927681] mt-1">
                      Ready target: {formatDateTime(order.estimatedReadyAt)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress Bar for active in-prep orders */}
            {isActive && status !== "READY" && (
              <div className="space-y-1">
                <div className="w-full bg-[#FFF9F2] rounded-full h-2 border border-[#EBD4DC] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isOverdue ? "bg-rose-500" : "bg-[#C94F78]"
                    }`}
                    style={{ width: `${percentElapsed}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#927681]">
                  <span>Placed: {formatDateTime(order.createdAt)}</span>
                  <span>{Math.round(percentElapsed)}% elapsed</span>
                </div>
              </div>
            )}

            {/* Preparation Time Adjustments (Active Orders Only) */}
            {isActive && (
              <div className="pt-2 border-t border-[#EBD4DC] space-y-2.5">
                <p className="text-xs font-bold text-[#735A67]">
                  Adjust Prep Time:
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleAdjustMinutes(-5)}
                    className="py-1.5 px-2 rounded-xl bg-white border border-[#EBD4DC] hover:border-rose-400 hover:text-rose-600 text-[#735A67] transition cursor-pointer disabled:opacity-40"
                    title="Reduce by 5 minutes"
                  >
                    -5m
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleAdjustMinutes(5)}
                    className="py-1.5 px-2 rounded-xl bg-white border border-[#EBD4DC] hover:border-[#C94F78] hover:text-[#C94F78] text-[#735A67] transition cursor-pointer disabled:opacity-40"
                    title="Add 5 minutes"
                  >
                    +5m
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleAdjustMinutes(10)}
                    className="py-1.5 px-2 rounded-xl bg-white border border-[#EBD4DC] hover:border-[#C94F78] hover:text-[#C94F78] text-[#735A67] transition cursor-pointer disabled:opacity-40"
                    title="Add 10 minutes"
                  >
                    +10m
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => setShowCustom(!showCustom)}
                    className="py-1.5 px-2 rounded-xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#C94F78] hover:bg-[#F2BAC9] transition cursor-pointer disabled:opacity-40"
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Minutes Input Drawer */}
                {showCustom && (
                  <form
                    onSubmit={handleSetCustomRemaining}
                    className="flex items-center gap-2 pt-2"
                  >
                    <input
                      type="number"
                      min="1"
                      max="300"
                      placeholder="Mins left"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#EBD4DC] bg-[#FFF9F2] text-xs font-mono text-[#352431] focus:outline-hidden focus:border-[#C94F78]"
                    />
                    <button
                      type="submit"
                      disabled={loadingAction || !customInput}
                      className="px-3 py-1.5 rounded-xl bg-[#C94F78] text-white text-xs font-bold hover:bg-[#B33D65] transition cursor-pointer disabled:opacity-40"
                    >
                      Set
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Workflow Status Actions Card */}
          <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-3.5">
            <h3 className="font-bold text-sm text-[#352431] uppercase tracking-wider">
              Status Progression
            </h3>

            <div className="space-y-2">
              {status === "PENDING" && (
                <button
                  type="button"
                  disabled={loadingAction || isOnlineUnpaid}
                  onClick={() => handleStatusChange("CONFIRMED")}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {isOnlineUnpaid ? "Awaiting Payment" : "✓ Accept & Confirm Order"}
                </button>
              )}

              {status === "CONFIRMED" && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleStatusChange("PREPARING")}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[#352431] hover:bg-[#4a3345] text-white font-bold text-xs shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
                >
                  🍳 Start Kitchen Preparation
                </button>
              )}

              {status === "PREPARING" && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleStatusChange("READY")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    🔔 Mark Ready for Pickup
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleStatusChange("DELAYED")}
                    className="w-full py-2 px-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    ⚠️ Mark as Delayed
                  </button>
                </div>
              )}

              {status === "DELAYED" && (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleStatusChange("READY")}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    🔔 Mark Ready for Pickup
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleStatusChange("PREPARING")}
                    className="w-full py-2 px-3 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#C94F78] hover:bg-[#FBE7EE]/80 font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    Resume Preparation
                  </button>
                </div>
              )}

              {status === "READY" && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleStatusChange("COMPLETED")}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[#5F9A68] hover:bg-[#4f8256] text-white font-bold text-xs shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
                >
                  ✅ Complete & Hand Over
                </button>
              )}

              {/* Cancel order button */}
              {status !== "COMPLETED" && status !== "CANCELLED" && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full py-2 px-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer mt-2"
                >
                  ✕ Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Cancellation Modal */}
      <AdminCancelModal
        order={order}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        submitting={cancelSubmitting}
      />
    </div>
  );
};

export default OrderDetails;
