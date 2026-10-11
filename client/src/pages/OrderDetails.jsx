import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Clock,
  PartyPopper,
  XCircle,
  CreditCard,
  UtensilsCrossed,
  Sparkles,
  Lock,
  ShieldAlert,
  FileText,
  Activity,
  Layers,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";
import orderService from "../services/orderService";
import paymentService, { loadRazorpayScript } from "../services/paymentService";
import OrderTimeline from "../components/orders/OrderTimeline";
import CancelCountdown from "../components/orders/CancelCountdown";
import useOrderSocket from "../hooks/useOrderSocket";

const formatCreatedTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) {
      return `Placed today at ${timeStr}`;
    }

    const dateStrFormatted = d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    return `Placed on ${dateStrFormatted}, ${timeStr}`;
  } catch (_) {
    return dateStr;
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

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // Cancellation states
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  // Online Payment Retry states
  const [retryingPayment, setRetryingPayment] = useState(false);

  /**
   * Fetch authoritative order from backend
   */
  const loadOrder = useCallback(
    async (isBackground = false) => {
      if (!id) return;
      if (!isBackground) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await orderService.getMyOrder(id);
        setOrder(data);
        setError(null);
        setErrorCode(null);
      } catch (err) {
        const status = err.status || 0;
        setErrorCode(status);

        if (status === 401) {
          setError("Please log in to view this order.");
        } else if (status === 403) {
          setError("Access forbidden: You do not have permission to view another student's order.");
        } else if (status === 404) {
          setError("Order not found. It may have been removed or the ID is invalid.");
        } else {
          setError(err.message || "Unable to load this order.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      setError("Please log in to view this order.");
      setErrorCode(401);
      return;
    }
    loadOrder(false);
  }, [id, isAuthenticated, authLoading, loadOrder]);

  // Realtime order updates via Socket.IO
  useOrderSocket({
    orderId: id,
    enabled: !!id && isAuthenticated,
    onOrderUpdated: (eventData) => {
      // Optimistically update order status and relevant fields from eventData
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orderStatus:
            eventData.orderStatus || eventData.status || prev.orderStatus,
          paymentStatus: eventData.paymentStatus || prev.paymentStatus,
          cancelUntil:
            eventData.cancelUntil !== undefined
              ? eventData.cancelUntil
              : prev.cancelUntil,
          cancellationWindowOpen:
            eventData.cancellationWindowOpen !== undefined
              ? eventData.cancellationWindowOpen
              : prev.cancellationWindowOpen,
          cancelledBy: eventData.cancelledBy || prev.cancelledBy,
          cancellationReason:
            eventData.cancellationReason || prev.cancellationReason,
          estimatedPreparationTime:
            eventData.estimatedPreparationTime !== undefined
              ? eventData.estimatedPreparationTime
              : prev.estimatedPreparationTime,
          expectedReadyAt:
            eventData.expectedReadyAt !== undefined
              ? eventData.expectedReadyAt
              : prev.expectedReadyAt,
          preparationStartedAt:
            eventData.preparationStartedAt !== undefined
              ? eventData.preparationStartedAt
              : prev.preparationStartedAt,
          readyAt:
            eventData.readyAt !== undefined
              ? eventData.readyAt
              : prev.readyAt,
          completedAt:
            eventData.completedAt !== undefined
              ? eventData.completedAt
              : prev.completedAt,
          delayedAt:
            eventData.delayedAt !== undefined
              ? eventData.delayedAt
              : prev.delayedAt,
          cancelledAt:
            eventData.cancelledAt !== undefined
              ? eventData.cancelledAt
              : prev.cancelledAt,
        };
      });
      // Authoritatively refetch the complete order snapshot from REST in background
      loadOrder(true);
    },
    onReconnect: () => {
      // Refetch authoritative order state upon socket reconnection
      loadOrder(true);
    },
  });

  /**
   * Handle student order cancellation
   */
  const handleCancelOrder = async () => {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    setCancelFeedback(null);

    try {
      const result = await orderService.cancelOrder(order.id || order._id);
      setCancelFeedback({
        type: "success",
        message: "Order cancelled successfully.",
      });

      // Update state with confirmed order
      if (result) {
        setOrder(result);
      } else {
        await loadOrder(true);
      }
    } catch (err) {
      const backendMessage =
        err.data?.message || err.message || "Cancellation failed.";

      if (
        backendMessage.toLowerCase().includes("expired") ||
        backendMessage.toLowerCase().includes("cancellation window")
      ) {
        setCancelFeedback({
          type: "error",
          message: "The cancellation window has expired.",
        });
      } else {
        setCancelFeedback({
          type: "error",
          message: backendMessage,
        });
      }

      // Authoritative refresh to reflect actual backend state
      await loadOrder(true);
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Window expired notification from local timer
   */
  const handleWindowExpired = () => {
    // When timer expires, fetch fresh order without showing error toast
    loadOrder(true);
  };

  /**
   * Retry Online Payment for PENDING/FAILED online orders
   */
  const handleRetryPayment = async () => {
    if (!order || retryingPayment) return;
    setRetryingPayment(true);
    setCancelFeedback(null);

    try {
      const paymentData = await paymentService.createPaymentOrder(order.id || order._id);
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || typeof window.Razorpay === "undefined") {
        throw new Error("Unable to load Razorpay checkout SDK. Please check your internet connection.");
      }

      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: paymentData.currency || "INR",
        name: "College Canteen",
        description: `Order #${order.orderNumber || paymentData.orderNumber}`,
        order_id: paymentData.razorpayOrderId,
        handler: async (response) => {
          try {
            await paymentService.verifyPayment({
              orderId: order.id || order._id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });

            setCancelFeedback({
              type: "success",
              message: "Payment verified successfully!",
            });
            await loadOrder(true);
          } catch (verifyErr) {
            setCancelFeedback({
              type: "error",
              message: verifyErr.message || "Payment verification failed. Please check with the counter.",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setRetryingPayment(false);
          },
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#f59e0b",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setCancelFeedback({
          type: "error",
          message: response.error?.description || "Payment failed at gateway. Please retry.",
        });
        setRetryingPayment(false);
      });

      rzp.open();
    } catch (err) {
      setCancelFeedback({
        type: "error",
        message: err.message || "Unable to initiate payment retry.",
      });
    } finally {
      setRetryingPayment(false);
    }
  };

  // 1. Loading Skeleton
  if (loading) {
    return (
      <PageContainer>
        <div className="max-w-3xl mx-auto my-8 space-y-6">
          <div className="h-8 bg-[#FBE7EE] rounded-2xl w-48 animate-pulse" />
          <div className="bg-white rounded-3xl p-6 border border-[#EBD4DC] space-y-4 animate-pulse">
            <div className="h-6 bg-[#FBE7EE] rounded-xl w-1/3" />
            <div className="h-24 bg-[#FBE7EE]/50 rounded-2xl" />
            <div className="h-32 bg-[#FBE7EE]/50 rounded-2xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. Error States (401, 403, 404, etc.)
  if (error || !order) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto my-12 text-center p-8 bg-white rounded-3xl border border-[#EBD4DC] shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
            {errorCode === 401 ? (
              <Lock className="w-8 h-8 stroke-[2.2]" />
            ) : errorCode === 403 ? (
              <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
            ) : (
              <FileText className="w-8 h-8 stroke-[2.2]" />
            )}
          </div>

          <h2 className="text-xl font-bold text-[#352431]">
            {errorCode === 401
              ? "Login Required"
              : errorCode === 403
              ? "Access Forbidden"
              : errorCode === 404
              ? "Order Not Found"
              : "Unable to Load Order"}
          </h2>

          <p className="text-xs text-[#735A67] leading-relaxed max-w-sm mx-auto">
            {error || "An error occurred while retrieving order information."}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            {errorCode === 401 ? (
              <Link
                to="/checkout"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#352431] text-white font-bold text-xs hover:bg-[#352431]/90 transition"
              >
                Log In
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => loadOrder(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#C94F78] text-white font-bold text-xs hover:bg-[#B33D65] transition shadow-sm"
              >
                Retry
              </button>
            )}

            <Link
              to="/orders"
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#FBE7EE] text-[#352431] border border-[#EBD4DC] font-bold text-xs hover:bg-[#FBE7EE]/80 transition"
            >
              My Orders
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const expectedReadyFormatted = formatExpectedTime(order.expectedReadyAt);
  const createdTimeFormatted = formatCreatedTime(order.createdAt);
  const orderStatus = order.orderStatus || "PENDING";
  const paymentStatus = order.paymentStatus || "PENDING";
  const isPaid = paymentStatus === "PAID";
  const isPaymentFailed = paymentStatus === "FAILED";
  const isRefunded = paymentStatus === "REFUNDED";

  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto my-6 sm:my-10 space-y-6">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EBD4DC] pb-4">
          <Link
            to="/orders"
            className="text-xs font-bold text-[#C94F78] hover:text-[#B33D65] flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#FBE7EE] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Orders</span>
          </Link>

          <button
            type="button"
            onClick={() => loadOrder(true)}
            disabled={refreshing}
            className="px-3.5 py-1.5 rounded-full border border-[#EBD4DC] hover:bg-[#FBE7EE]/50 text-[#352431] font-bold text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Order Details"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#C94F78]" : ""}`}
            />
            <span>{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {cancelFeedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between gap-3 animate-fade-in ${
              cancelFeedback.type === "success"
                ? "bg-[#5F9A68]/10 text-[#5F9A68] border-[#5F9A68]/30"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {cancelFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-[#5F9A68] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{cancelFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setCancelFeedback(null)}
              className="text-[#927681] hover:text-[#352431] p-1"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC]/60 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#927681] block">
                Order Identifier
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#352431] tracking-tight mt-0.5">
                {order.orderNumber || `#${(order.id || order._id).slice(-8)}`}
              </h1>
              <p className="text-xs text-[#735A67] font-medium mt-1">
                {createdTimeFormatted}
              </p>
            </div>

            <div className="self-start sm:self-auto">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border ${
                  orderStatus === "READY"
                    ? "bg-[#5F9A68] text-white border-[#5F9A68]"
                    : orderStatus === "DELAYED"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : orderStatus === "CANCELLED"
                    ? "bg-rose-100 text-rose-800 border-rose-200"
                    : orderStatus === "COMPLETED"
                    ? "bg-slate-100 text-slate-800 border-slate-300"
                    : "bg-[#FBE7EE] text-[#C94F78] border-[#EBD4DC]"
                }`}
              >
                {orderStatus === "PENDING"
                  ? "Order received"
                  : orderStatus === "CONFIRMED"
                  ? "Order confirmed"
                  : orderStatus === "PREPARING"
                  ? "Being prepared"
                  : orderStatus === "READY"
                  ? "Ready for pickup"
                  : orderStatus === "DELAYED"
                  ? "Order running late"
                  : orderStatus === "COMPLETED"
                  ? "Completed"
                  : "Order cancelled"}
              </span>
            </div>
          </div>

          {/* Section 7: DELAYED State Alert Banner */}
          {orderStatus === "DELAYED" && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 sm:p-5 text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <Clock className="w-5 h-5 text-amber-700 shrink-0 animate-pulse" />
                <span>Order running late, hold on.</span>
              </div>
              <p className="text-xs text-amber-900 font-medium pl-7">
                We're taking a little longer than expected. The kitchen staff is working on it and we will alert you the moment it is ready!
              </p>
            </div>
          )}

          {/* Section 8: READY State Alert Banner */}
          {orderStatus === "READY" && (
            <div className="bg-[#5F9A68]/15 border border-[#5F9A68]/40 rounded-2xl p-4 sm:p-5 text-[#352431] space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-[#5F9A68]">
                <PartyPopper className="w-5 h-5 text-[#5F9A68] shrink-0" />
                <span>Your order is ready!</span>
              </div>
              <p className="text-xs text-[#735A67] font-medium pl-7">
                Please proceed to the canteen counter and show your order number{" "}
                <span className="font-mono font-bold text-[#352431]">{order.orderNumber}</span> to collect your meal.
              </p>
            </div>
          )}

          {/* Section 9: COMPLETED State Banner */}
          {orderStatus === "COMPLETED" && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5F9A68] shrink-0" />
              <span>Order completed. Thank you for dining at the college canteen!</span>
            </div>
          )}

          {/* Section 10: CANCELLED State Banner */}
          {orderStatus === "CANCELLED" && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Order cancelled</span>
              </div>
              <p className="text-xs text-rose-800 font-medium pl-7">
                {order.cancelledBy === "ADMIN"
                  ? "Canteen staff cancelled this order."
                  : "You cancelled this order."}
              </p>
              {order.cancellationReason && (
                <div className="text-xs bg-white/70 p-2.5 rounded-xl border border-rose-200/80 ml-7">
                  <span className="font-bold text-rose-900">Reason: </span>
                  <span className="text-rose-800 italic">"{order.cancellationReason}"</span>
                </div>
              )}
            </div>
          )}

          {/* Section 11-16: 30-Second Cancellation Window Component */}
          {order.cancellationWindowOpen &&
            order.cancelUntil &&
            orderStatus !== "CANCELLED" &&
            orderStatus !== "COMPLETED" && (
              <CancelCountdown
                order={order}
                onCancelConfirm={handleCancelOrder}
                isCancelling={isCancelling}
                onWindowExpired={handleWindowExpired}
              />
            )}

          {/* Section 26: Preparation Estimate & Expected Ready Time */}
          {orderStatus !== "CANCELLED" && orderStatus !== "COMPLETED" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-[#FBE7EE]/40 p-3.5 rounded-2xl border border-[#EBD4DC]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#927681] block">
                  Estimated Preparation
                </span>
                <span className="font-bold text-sm text-[#352431] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-[#C94F78]" />
                  <span>{order.estimatedPreparationTime ? `${order.estimatedPreparationTime} mins` : "10-15 mins"}</span>
                </span>
              </div>

              <div className="bg-[#FBE7EE]/40 p-3.5 rounded-2xl border border-[#EBD4DC]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#927681] block">
                  Expected Ready By
                </span>
                <span className="font-bold text-sm text-[#352431] flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-4 h-4 text-[#5F9A68]" />
                  <span>{expectedReadyFormatted || "Calculating estimate..."}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Order Lifecycle Timeline */}
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#352431] tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C94F78]" />
            <span>Live Order Timeline</span>
          </h2>
          <OrderTimeline order={order} />
        </div>

        {/* Section 22-23: Payment Status Card & Retry Action */}
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#352431] tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#C94F78]" />
              <span>Payment Details</span>
            </h2>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isPaid
                  ? "bg-[#5F9A68]/15 text-[#5F9A68] border-[#5F9A68]/30"
                  : isRefunded
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : isPaymentFailed
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isPaid
                ? "Paid"
                : isRefunded
                ? "Payment refunded"
                : isPaymentFailed
                ? "Payment failed"
                : "Payment pending"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Payment Method
              </span>
              <span className="font-bold text-[#352431] block mt-0.5">
                {order.paymentMethod === "CASH"
                  ? "Cash at Counter"
                  : "Online Payment (Razorpay)"}
              </span>
            </div>

            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Payment Status
              </span>
              <span
                className={`font-bold block mt-0.5 ${
                  isPaid
                    ? "text-[#5F9A68]"
                    : isRefunded
                    ? "text-purple-600"
                    : isPaymentFailed
                    ? "text-rose-600"
                    : "text-amber-600"
                }`}
              >
                {isPaid
                  ? "Payment successful"
                  : isRefunded
                  ? "Refund processed"
                  : isPaymentFailed
                  ? "Payment failed"
                  : "Payment pending"}
              </span>
            </div>
          </div>

          {/* Section 23: Online Payment Retry Button */}
          {order.paymentMethod === "ONLINE" &&
            !isPaid &&
            orderStatus !== "CANCELLED" && (
              <div className="pt-2 border-t border-[#EBD4DC]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[#735A67] font-medium">
                  Payment has not been completed for this order. You can complete it securely online now.
                </p>
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={retryingPayment}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] active:scale-95 text-white font-bold text-xs transition shadow-sm shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {retryingPayment ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening Gateway...</span>
                    </>
                  ) : (
                    <span>Retry Payment</span>
                  )}
                </button>
              </div>
            )}
        </div>

        {/* Section 24-25: Ordered Items with Historical Snapshot Integrity */}
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-7 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#352431] tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-[#C94F78]" />
            <span>Ordered Items ({(order.items || []).length})</span>
          </h2>

          <div className="divide-y divide-[#EBD4DC]/60 border border-[#EBD4DC] rounded-2xl p-2 sm:p-3">
            {(order.items || []).map((item, idx) => {
              const itemImg = item.image || item.snapshot?.image;
              const isCombo = item.itemType === "COMBO";
              const comboComponents = item.snapshot?.items || [];

              return (
                <div
                  key={item.id || idx}
                  className="py-3 flex items-start justify-between text-xs gap-3"
                >
                  <div className="flex items-start gap-3">
                    {itemImg ? (
                      <img
                        src={itemImg}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover bg-[#FBE7EE] shrink-0 border border-[#EBD4DC]"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center shrink-0 border border-[#EBD4DC]">
                        {isCombo ? (
                          <Layers className="w-5 h-5 text-[#C94F78]" />
                        ) : (
                          <UtensilsCrossed className="w-5 h-5" />
                        )}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#352431] text-sm">
                          {item.name}
                        </span>
                        {isCombo && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>COMBO</span>
                          </span>
                        )}
                      </div>

                      {/* Historical Unit Price Snapshot (Do NOT fetch current product price) */}
                      <span className="text-[#735A67] font-medium block">
                        ₹{item.unitPrice} × {item.quantity}
                      </span>

                      {/* Combo Included Items Breakdown */}
                      {isCombo && comboComponents.length > 0 && (
                        <div className="pt-1 text-[11px] text-[#927681] space-y-0.5">
                          <span className="font-semibold block text-[#735A67]">
                            Includes:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {comboComponents.map((c, cIdx) => (
                              <li key={cIdx} className="truncate">
                                {c.name} ({c.quantity}x)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="font-bold text-[#352431] text-sm shrink-0">
                    ₹{item.subtotal}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Kitchen Notes */}
          {order.notes && (
            <div className="bg-[#FBE7EE]/40 p-3.5 rounded-2xl border border-[#EBD4DC] text-xs">
              <span className="font-bold text-[#352431] block mb-0.5">
                Special Kitchen Notes:
              </span>
              <span className="text-[#735A67] font-medium italic">
                "{order.notes}"
              </span>
            </div>
          )}

          {/* Authoritative Financial Breakdown */}
          <div className="pt-3 border-t border-[#EBD4DC] space-y-2">
            <div className="flex justify-between text-xs text-[#735A67]">
              <span>Subtotal</span>
              <span className="font-bold text-[#352431]">
                ₹{order.subtotal}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-[#EBD4DC]">
              <span className="font-bold text-sm text-[#352431]">Total</span>
              <span className="text-2xl font-bold text-[#C94F78]">
                ₹{order.totalAmount ?? order.subtotal}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default OrderDetails;
