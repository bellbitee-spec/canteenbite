import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RotateCw,
  Clock,
  ArrowRight,
  Lock,
  UtensilsCrossed,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";
import orderService from "../services/orderService";
import useOrderSocket from "../hooks/useOrderSocket";
import { OrderCardSkeleton } from "../components/common/Loader";

const formatOrderDate = (dateStr) => {
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
      return `Today at ${timeStr}`;
    }

    const dateStrFormatted = d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    return `${dateStrFormatted}, ${timeStr}`;
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

const getStatusBadge = (status) => {
  switch (status) {
    case "PENDING":
      return {
        label: "Order received",
        className: "bg-[#FBE7EE]/50 text-[#735A67] border-[#EBD4DC]",
      };
    case "CONFIRMED":
      return {
        label: "Confirmed",
        className: "bg-[#FBE7EE] text-[#C94F78] border-[#EBD4DC] font-bold",
      };
    case "PREPARING":
      return {
        label: "Being prepared",
        className: "bg-[#FBE7EE] text-[#C94F78] border-[#EBD4DC] font-bold animate-pulse",
      };
    case "READY":
      return {
        label: "Ready for pickup",
        className: "bg-[#5F9A68] text-white border-[#5F9A68] font-bold shadow-xs",
      };
    case "DELAYED":
      return {
        label: "Running late",
        className: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        className: "bg-slate-100 text-slate-600 border-slate-200",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        className: "bg-rose-50 text-rose-700 border-rose-200",
      };
    default:
      return {
        label: status || "Unknown",
        className: "bg-slate-50 text-slate-700 border-slate-200",
      };
  }
};

const getPaymentBadge = (method, status) => {
  const isPaid = status === "PAID";
  const isFailed = status === "FAILED";
  const isRefunded = status === "REFUNDED";
  const isCashOrCod = method === "COD" || method === "CASH";

  let statusLabel = isCashOrCod ? "Unpaid (COD)" : "Payment pending";
  let statusColor = "text-amber-600";

  if (isPaid) {
    statusLabel = "Paid";
    statusColor = "text-emerald-600";
  } else if (isFailed) {
    statusLabel = "Failed";
    statusColor = "text-rose-600";
  } else if (isRefunded) {
    statusLabel = "Refunded";
    statusColor = "text-purple-600";
  }

  return {
    methodLabel: isCashOrCod ? "COD" : "ONLINE",
    statusLabel,
    statusColor,
  };
};

const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = (isManual = false) => {
    if (!isAuthenticated) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    orderService
      .getMyOrders()
      .then((data) => {
        setOrders(data || []);
        setError(null);
      })
      .catch((err) => {
        const status = err.status || 0;
        if (status === 401) {
          setError("Please log in to view your orders.");
        } else if (status === 403) {
          setError("Access forbidden: You can only view your own orders.");
        } else {
          setError(err.message || "Unable to load your orders.");
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchOrders();
  }, [isAuthenticated, authLoading]);

  // Extract list of currently displayed order IDs for realtime subscription
  const orderIds = useMemo(() => {
    return orders
      .map((o) => (o._id || o.id)?.toString())
      .filter(Boolean);
  }, [orders]);

  // Realtime updates for all visible orders
  useOrderSocket({
    orderIds,
    enabled: isAuthenticated && orderIds.length > 0,
    onOrderUpdated: (eventData) => {
      if (!eventData || !eventData.orderId) return;

      setOrders((prevOrders) =>
        prevOrders.map((ord) => {
          const ordId = (ord._id || ord.id)?.toString();
          if (ordId === eventData.orderId.toString()) {
            return {
              ...ord,
              orderStatus: eventData.orderStatus || ord.orderStatus,
              paymentStatus: eventData.paymentStatus || ord.paymentStatus,
              cancellationWindowOpen:
                eventData.cancellationWindowOpen !== undefined
                  ? eventData.cancellationWindowOpen
                  : ord.cancellationWindowOpen,
              cancelUntil: eventData.cancelUntil || ord.cancelUntil,
              estimatedPreparationTime:
                eventData.estimatedPreparationTime !== undefined
                  ? eventData.estimatedPreparationTime
                  : ord.estimatedPreparationTime,
              expectedReadyAt:
                eventData.expectedReadyAt || ord.expectedReadyAt,
              preparationStartedAt:
                eventData.preparationStartedAt || ord.preparationStartedAt,
              delayedAt:
                eventData.delayedAt !== undefined
                  ? eventData.delayedAt
                  : ord.delayedAt,
              readyAt:
                eventData.readyAt !== undefined
                  ? eventData.readyAt
                  : ord.readyAt,
              completedAt:
                eventData.completedAt !== undefined
                  ? eventData.completedAt
                  : ord.completedAt,
              cancelledAt:
                eventData.cancelledAt !== undefined
                  ? eventData.cancelledAt
                  : ord.cancelledAt,
            };
          }
          return ord;
        })
      );
    },
    onReconnect: () => {
      if (isAuthenticated) {
        orderService
          .getMyOrders()
          .then((data) => {
            if (data) setOrders(data);
          })
          .catch(() => {});
      }
    },
  });

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto my-6 sm:my-10 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC] pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#352431] tracking-tight flex items-center gap-2.5">
              <span>My Orders</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#735A67] mt-0.5">
              Live kitchen tracking and pickup history
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={loading || refreshing || !isAuthenticated}
              className="px-3.5 py-2 rounded-full border border-[#EBD4DC] hover:bg-[#FBE7EE]/60 text-[#352431] font-bold text-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh Orders"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/"
              className="text-xs font-bold text-[#C94F78] hover:text-[#B33D65] px-3 py-2 rounded-full hover:bg-[#FBE7EE] transition"
            >
              ← Browse Menu
            </Link>
          </div>
        </div>

        {/* 1. Unauthenticated State */}
        {!authLoading && !isAuthenticated ? (
          <div className="p-8 sm:p-12 bg-white rounded-3xl border border-[#EBD4DC] text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-[#352431] tracking-tight">Student Account Required</h2>
            <p className="text-xs sm:text-sm text-[#735A67] max-w-sm mx-auto leading-relaxed">
              Log in to see live progress on your orders and check counter pickup times.
            </p>
            <div className="pt-2">
              <Link
                to="/checkout"
                className="px-6 py-3 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs inline-block transition shadow-sm active:scale-95"
              >
                Log In with Student Account
              </Link>
            </div>
          </div>
        ) : loading ? (
          /* 2. Loading Skeletons */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <OrderCardSkeleton key={n} />
            ))}
          </div>
        ) : error ? (
          /* 3. Error State */
          <div className="p-6 bg-[#FBE7EE] border border-[#EBD4DC] text-[#352431] rounded-3xl text-xs space-y-2 animate-fade-in">
            <p className="font-bold flex items-center gap-2 text-[#C94F78]">
              <AlertCircle className="w-4 h-4 text-[#C94F78] shrink-0" />
              <span>Unable to load your orders</span>
            </p>
            <p className="text-[#735A67]">{error}</p>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="mt-2 px-4 py-1.5 bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold rounded-full text-xs"
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* 4. Empty State */
          <div className="p-12 bg-white rounded-3xl border border-[#EBD4DC] text-center space-y-4 shadow-sm animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
              <Receipt className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#352431] tracking-tight">
                No orders yet.
              </h2>
              <p className="text-xs sm:text-sm text-[#735A67] max-w-sm mx-auto leading-relaxed">
                You haven't placed any canteen orders yet. Discover today's fresh dishes and skip the queue!
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="px-6 py-3.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition active:scale-95"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Browse Menu</span>
              </Link>
            </div>
          </div>
        ) : (
          /* 5. Order List */
          <div className="space-y-4">
            {orders.map((ord) => {
              const orderId = ord.id || ord._id;
              const statusBadge = getStatusBadge(ord.orderStatus);
              const paymentBadge = getPaymentBadge(ord.paymentMethod, ord.paymentStatus);
              const expectedTime = formatExpectedTime(ord.expectedReadyAt);
              const itemsCount = (ord.items || []).length;
              const itemsSummary = (ord.items || [])
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ");
              const hasMoreItems = itemsCount > 3;

              return (
                <div
                  key={orderId}
                  onClick={() => navigate(`/orders/${orderId}`)}
                  className="p-5 sm:p-6 bg-white rounded-3xl border border-[#EBD4DC] shadow-sm space-y-4 hover:shadow-md hover:border-[#C94F78]/40 transition-all cursor-pointer group"
                >
                  {/* Top Bar: Order Number, Date, Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-[#EBD4DC]/60 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm sm:text-base text-[#352431] group-hover:text-[#C94F78] transition-colors">
                          {ord.orderNumber || `#${orderId.slice(-8)}`}
                        </span>
                        {ord.cancellationWindowOpen && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#C94F78]" />
                            <span>Can Cancel</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#927681] font-medium block mt-0.5">
                        {formatOrderDate(ord.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Items Summary & Expected Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 max-w-md">
                      <span className="font-bold text-[#352431]">
                        {itemsCount} {itemsCount === 1 ? "item" : "items"}:
                      </span>{" "}
                      <span className="text-[#735A67] font-medium truncate">
                        {itemsSummary}
                        {hasMoreItems && ` +${itemsCount - 3} more`}
                      </span>
                    </div>

                    {expectedTime &&
                      ord.orderStatus !== "CANCELLED" &&
                      ord.orderStatus !== "COMPLETED" && (
                        <div className="text-[11px] font-semibold text-[#C94F78] bg-[#FBE7EE] px-2.5 py-1 rounded-full border border-[#EBD4DC] shrink-0 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#C94F78]" />
                          <span>Ready by:</span>
                          <span className="font-bold font-mono">{expectedTime}</span>
                        </div>
                      )}
                  </div>

                  {/* Bottom: Payment Information, Total, Action Arrow */}
                  <div className="pt-2.5 border-t border-[#EBD4DC]/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[#352431] bg-[#FBE7EE] border border-[#EBD4DC] px-2.5 py-0.5 rounded-md text-[11px]">
                        {paymentBadge.methodLabel}
                      </span>
                      <span className={`font-bold text-[11px] ${paymentBadge.statusColor}`}>
                        {paymentBadge.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base text-[#C94F78] tracking-tight">
                        ₹{ord.totalAmount ?? ord.subtotal}
                      </span>
                      <span className="text-xs font-bold text-[#C94F78] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default Orders;
