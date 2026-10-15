import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import orderService from "../services/orderService";
import useOrderSocket from "../hooks/useOrderSocket";
import useSocket from "../hooks/useSocket";
import OrderCard from "../components/orders/OrderCard";
import OrderTable from "../components/orders/OrderTable";
import OrderDetailsModal from "../components/orders/OrderDetailsModal";
import AdminCancelModal from "../components/orders/AdminCancelModal";

const KITCHEN_COLUMNS = [
  {
    key: "PENDING",
    title: "NEW",
    desc: "Awaiting acceptance",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    headerBg: "border-t-2 border-t-amber-400",
  },
  {
    key: "CONFIRMED",
    title: "CONFIRMED",
    desc: "Queued for kitchen",
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    headerBg: "border-t-2 border-t-sky-400",
  },
  {
    key: "PREPARING",
    title: "PREPARING",
    desc: "Currently cooking",
    badgeBg: "bg-[#FBE7EE] text-[#C94F78] border-[#EBD4DC]",
    headerBg: "border-t-2 border-t-[#C94F78]",
  },
  {
    key: "DELAYED",
    title: "DELAYED",
    desc: "Urgent: behind schedule",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    headerBg: "border-t-2 border-t-rose-400",
  },
  {
    key: "READY",
    title: "READY",
    desc: "Pickup at counter",
    badgeBg: "bg-[#5F9A68]/15 text-[#5F9A68] border-[#5F9A68]/30",
    headerBg: "border-t-2 border-t-[#5F9A68]",
  },
];

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  const initialView = searchParams.get("view") || "board";

  const { connected } = useSocket();

  // View state: 'board' (Kitchen Board) | 'table' (History / All Orders Table)
  const [viewMode, setViewMode] = useState(initialView);

  // Active / Raw orders state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters state (for table view and search)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Mobile column active tab (for small screens in board view)
  const [mobileColumnTab, setMobileColumnTab] = useState("ALL");

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);

  // Action states
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /**
   * Fetch orders from backend API
   */
  const loadOrders = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      try {
        const queryParams = {
          page: viewMode === "board" ? 1 : page,
          limit: viewMode === "board" ? 100 : 20,
        };

        if (searchTerm.trim()) queryParams.search = searchTerm.trim();

        if (viewMode === "table") {
          if (statusFilter !== "all") queryParams.status = statusFilter;
          if (paymentStatusFilter !== "all") queryParams.paymentStatus = paymentStatusFilter;
          if (paymentMethodFilter !== "all") queryParams.paymentMethod = paymentMethodFilter;
          if (dateFrom) queryParams.from = dateFrom;
          if (dateTo) queryParams.to = dateTo;
        }

        const res = await orderService.getOrders(queryParams);
        const fetchedOrders = res.orders || (res.data && res.data.orders) || [];
        setOrders(fetchedOrders);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err) {
        showToast(err.message || "Failed to load orders.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewMode, page, statusFilter, paymentStatusFilter, paymentMethodFilter, dateFrom, dateTo, searchTerm]
  );

  useEffect(() => {
    loadOrders(false);
  }, [loadOrders]);

  /**
   * Realtime socket event handler
   * When order:updated is received:
   * 1. Update existing order in state (and move between columns automatically)
   * 2. If it is a new order not in state, fetch complete order and prepend
   */
  const handleOrderUpdated = useCallback(
    async (eventData) => {
      if (!eventData || !eventData.orderId) return;
      const updatedId = eventData.orderId.toString();

      setOrders((prevOrders) => {
        const exists = prevOrders.some(
          (o) => (o.id || o._id)?.toString() === updatedId
        );

        if (exists) {
          return prevOrders.map((ord) => {
            if ((ord.id || ord._id)?.toString() === updatedId) {
              const updated = {
                ...ord,
                orderStatus: eventData.orderStatus || ord.orderStatus,
                paymentStatus: eventData.paymentStatus || ord.paymentStatus,
                cancelUntil:
                  eventData.cancelUntil !== undefined
                    ? eventData.cancelUntil
                    : ord.cancelUntil,
                cancellationWindowOpen:
                  eventData.cancellationWindowOpen !== undefined
                    ? eventData.cancellationWindowOpen
                    : ord.cancellationWindowOpen,
                expectedReadyAt:
                  eventData.expectedReadyAt !== undefined
                    ? eventData.expectedReadyAt
                    : ord.expectedReadyAt,
                estimatedReadyAt:
                  eventData.estimatedReadyAt !== undefined
                    ? eventData.estimatedReadyAt
                    : ord.estimatedReadyAt,
                estimatedPreparationMinutes:
                  eventData.estimatedPreparationMinutes !== undefined
                    ? eventData.estimatedPreparationMinutes
                    : ord.estimatedPreparationMinutes,
                estimatedPreparationTime:
                  eventData.estimatedPreparationTime !== undefined
                    ? eventData.estimatedPreparationTime
                    : ord.estimatedPreparationTime,
                preparationEstimateUpdatedAt:
                  eventData.preparationEstimateUpdatedAt !== undefined
                    ? eventData.preparationEstimateUpdatedAt
                    : ord.preparationEstimateUpdatedAt,
                preparationStartedAt:
                  eventData.preparationStartedAt !== undefined
                    ? eventData.preparationStartedAt
                    : ord.preparationStartedAt,
                readyAt:
                  eventData.readyAt !== undefined ? eventData.readyAt : ord.readyAt,
                completedAt:
                  eventData.completedAt !== undefined
                    ? eventData.completedAt
                    : ord.completedAt,
                delayedAt:
                  eventData.delayedAt !== undefined
                    ? eventData.delayedAt
                    : ord.delayedAt,
                cancelledAt:
                  eventData.cancelledAt !== undefined
                    ? eventData.cancelledAt
                    : ord.cancelledAt,
                cancelledBy: eventData.cancelledBy || ord.cancelledBy,
                cancellationReason:
                  eventData.cancellationReason || ord.cancellationReason,
              };

              // If details modal is open for this order, keep modal in sync
              if (
                selectedOrder &&
                (selectedOrder.id || selectedOrder._id)?.toString() === updatedId
              ) {
                setSelectedOrder(updated);
              }

              return updated;
            }
            return ord;
          });
        }

        // New order not in state yet: schedule single fetch
        return prevOrders;
      });

      // Check if it was absent, then fetch full snapshot and prepend
      setOrders((currentOrders) => {
        const exists = currentOrders.some(
          (o) => (o.id || o._id)?.toString() === updatedId
        );
        if (!exists) {
          orderService
            .getOrderById(updatedId)
            .then((res) => {
              const newOrd = res.order || (res.data && res.data.order);
              if (newOrd) {
                setOrders((latest) => {
                  if (latest.some((o) => (o.id || o._id)?.toString() === updatedId)) {
                    return latest;
                  }
                  return [newOrd, ...latest];
                });
              }
            })
            .catch(() => {});
        }
        return currentOrders;
      });
    },
    [selectedOrder]
  );

  // Reconnection recovery: silently refetch authoritative state
  const handleReconnect = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  useOrderSocket({
    onOrderUpdated: handleOrderUpdated,
    onReconnect: handleReconnect,
    enabled: true,
  });

  /**
   * Handle admin status transition
   */
  const handleStatusChange = async (orderId, newStatus) => {
    setLoadingActionId(orderId);
    try {
      const res = await orderService.updateOrderStatus(orderId, newStatus);
      const updated = res.order || (res.data && res.data.order);

      showToast(`Order status updated to ${newStatus}`, "success");

      if (updated) {
        setOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id)?.toString() === orderId.toString() ? updated : o
          )
        );
        if (
          selectedOrder &&
          (selectedOrder.id || selectedOrder._id)?.toString() === orderId.toString()
        ) {
          setSelectedOrder(updated);
        }
      } else {
        await loadOrders(true);
      }
    } catch (err) {
      // Concurrency Conflict or Rule Violation
      const errMsg =
        err.data?.message || err.message || "Failed to update order status.";
      showToast(errMsg, "error");

      // Authoritative refresh to show the real current state
      try {
        const fresh = await orderService.getOrderById(orderId);
        const freshOrder = fresh.order || (fresh.data && fresh.data.order);
        if (freshOrder) {
          setOrders((prev) =>
            prev.map((o) =>
              (o.id || o._id)?.toString() === orderId.toString() ? freshOrder : o
            )
          );
          if (
            selectedOrder &&
            (selectedOrder.id || selectedOrder._id)?.toString() === orderId.toString()
          ) {
            setSelectedOrder(freshOrder);
          }
        }
      } catch (_) {
        await loadOrders(true);
      }
    } finally {
      setLoadingActionId(null);
    }
  };

  /**
   * Handle admin order cancellation
   */
  const handleConfirmCancel = async (orderId, reason) => {
    setCancelSubmitting(true);
    try {
      const res = await orderService.cancelOrder(orderId, reason);
      const updated = res.order || (res.data && res.data.order);

      showToast("Order cancelled successfully.", "success");
      setIsCancelModalOpen(false);
      setOrderToCancel(null);

      if (updated) {
        setOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id)?.toString() === orderId.toString() ? updated : o
          )
        );
        if (
          selectedOrder &&
          (selectedOrder.id || selectedOrder._id)?.toString() === orderId.toString()
        ) {
          setSelectedOrder(updated);
        }
      } else {
        await loadOrders(true);
      }
    } catch (err) {
      const errMsg =
        err.data?.message || err.message || "Cancellation failed.";
      showToast(errMsg, "error");
      await loadOrders(true);
    } finally {
      setCancelSubmitting(false);
    }
  };

  /**
   * Handle admin recording payment (e.g. Cash collected for COD)
   */
  const handleRecordPayment = async (orderId) => {
    setLoadingActionId(orderId);
    try {
      const res = await orderService.recordPayment(orderId, { paymentStatus: "PAID" });
      const updated = res.order || (res.data && res.data.order);
      showToast("Payment recorded as PAID.", "success");

      if (updated) {
        setOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id)?.toString() === orderId.toString() ? updated : o
          )
        );
        if (
          selectedOrder &&
          (selectedOrder.id || selectedOrder._id)?.toString() === orderId.toString()
        ) {
          setSelectedOrder(updated);
        }
      } else {
        await loadOrders(true);
      }
    } catch (err) {
      const errMsg = err.data?.message || err.message || "Failed to record payment.";
      showToast(errMsg, "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  /**
   * Handle admin adjusting preparation time (+/- minutes or custom remaining minutes)
   */
  const handleUpdatePreparationTime = async (orderId, data) => {
    setLoadingActionId(orderId);
    try {
      const res = await orderService.updatePreparationTime(orderId, data);
      const updated = res.order || (res.data && res.data.order);
      showToast("Preparation time adjusted successfully.", "success");

      if (updated) {
        setOrders((prev) =>
          prev.map((o) =>
            (o.id || o._id)?.toString() === orderId.toString() ? updated : o
          )
        );
        if (
          selectedOrder &&
          (selectedOrder.id || selectedOrder._id)?.toString() === orderId.toString()
        ) {
          setSelectedOrder(updated);
        }
      } else {
        await loadOrders(true);
      }
    } catch (err) {
      const errMsg =
        err.data?.message || err.message || "Failed to adjust preparation time.";
      showToast(errMsg, "error");
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleOpenCancelModal = (order) => {
    setOrderToCancel(order);
    setIsCancelModalOpen(true);
  };

  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  // Group active orders by status for the Kitchen Board
  const columnOrders = useMemo(() => {
    const map = {
      PENDING: [],
      CONFIRMED: [],
      PREPARING: [],
      DELAYED: [],
      READY: [],
      COMPLETED: [],
      CANCELLED: [],
    };

    orders.forEach((order) => {
      const st = (order.orderStatus || "PENDING").toUpperCase();
      if (map[st]) {
        map[st].push(order);
      }
    });

    // Sort newest first
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    return map;
  }, [orders]);

  const activeTotalCount =
    columnOrders.PENDING.length +
    columnOrders.CONFIRMED.length +
    columnOrders.PREPARING.length +
    columnOrders.DELAYED.length +
    columnOrders.READY.length;

  return (
    <div className="space-y-6">
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

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[#EBD4DC]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#352431] tracking-tight">
              Order Operations
            </h2>
            {/* Live Socket Status Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                connected
                  ? "bg-[#5F9A68]/10 text-[#5F9A68] border-[#5F9A68]/20"
                  : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
              }`}
              title={connected ? "Socket connected to live canteen updates" : "Connecting..."}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-[#5F9A68]" : "bg-amber-500"
                }`}
              />
              <span>{connected ? "Live Kitchen" : "Connecting"}</span>
            </span>
          </div>
          <p className="text-sm text-[#735A67] mt-0.5">
            Realtime canteen preparation pipeline and order management
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Board vs Table Toggle */}
          <div className="p-1 rounded-2xl bg-white border border-[#EBD4DC] flex items-center shadow-sakura-sm">
            <button
              type="button"
              onClick={() => {
                setViewMode("board");
                setSearchParams({ view: "board" });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === "board"
                  ? "bg-[#C94F78] text-white shadow-sakura-sm"
                  : "text-[#735A67] hover:text-[#352431]"
              }`}
            >
              <span>🍳</span>
              <span>Kitchen Board</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  viewMode === "board"
                    ? "bg-white/20 text-white"
                    : "bg-[#FFF9F2] text-[#735A67]"
                }`}
              >
                {activeTotalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                setSearchParams({ view: "table" });
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#C94F78] text-white shadow-sakura-sm"
                  : "text-[#735A67] hover:text-[#352431]"
              }`}
            >
              <span>📋</span>
              <span>All Orders Table</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadOrders(true)}
            disabled={loading || refreshing}
            className="p-2.5 rounded-2xl bg-white border border-[#EBD4DC] hover:border-[#C94F78] text-[#735A67] hover:text-[#C94F78] shadow-sakura-sm transition disabled:opacity-50 cursor-pointer"
            title="Refresh Orders"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-[#C94F78]" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* -----------------------------------------------------------
          VIEW 1: KITCHEN BOARD (LIVE OPERATIONAL VIEW)
         ----------------------------------------------------------- */}
      {viewMode === "board" && (
        <div className="space-y-5">
          {/* Quick Active Kitchen Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[#735A67] font-semibold">Active Pipeline:</span>
              <span className="text-amber-700 font-medium">
                {columnOrders.PENDING.length} New
              </span>
              <span className="text-sky-700 font-medium">
                {columnOrders.CONFIRMED.length} Confirmed
              </span>
              <span className="text-[#C94F78] font-medium">
                {columnOrders.PREPARING.length} In Prep
              </span>
              <span className="text-rose-600 font-bold">
                {columnOrders.DELAYED.length} Delayed
              </span>
              <span className="text-[#5F9A68] font-bold">
                {columnOrders.READY.length} Ready for Pickup
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#735A67]">History:</span>
              <span className="text-[#352431] font-medium">
                {columnOrders.COMPLETED.length} Completed today
              </span>
              <span className="text-[#EBD4DC]">•</span>
              <span className="text-[#735A67]">
                {columnOrders.CANCELLED.length} Cancelled
              </span>
            </div>
          </div>

          {/* Mobile Workstation Selector Tabs (Visible on < lg screens) */}
          <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setMobileColumnTab("ALL")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                mobileColumnTab === "ALL"
                  ? "bg-[#C94F78] text-white shadow-sakura-sm"
                  : "bg-white border border-[#EBD4DC] text-[#735A67]"
              }`}
            >
              All Stages ({activeTotalCount})
            </button>
            {KITCHEN_COLUMNS.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileColumnTab(col.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  mobileColumnTab === col.key
                    ? "bg-[#C94F78] text-white shadow-sakura-sm"
                    : "bg-white border border-[#EBD4DC] text-[#735A67]"
                }`}
              >
                <span>{col.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FFF9F2] text-[#735A67]">
                  {columnOrders[col.key]?.length || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
            {KITCHEN_COLUMNS.map((col) => {
              const colItems = columnOrders[col.key] || [];
              const isColHiddenOnMobile =
                mobileColumnTab !== "ALL" && mobileColumnTab !== col.key;

              return (
                <div
                  key={col.key}
                  className={`flex flex-col rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card p-4 space-y-3.5 min-h-[500px] ${
                    isColHiddenOnMobile ? "hidden lg:flex" : "flex"
                  } ${col.headerBg}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBD4DC]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#352431]">
                          {col.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold border ${col.badgeBg}`}
                        >
                          {colItems.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#735A67] mt-0.5">
                        {col.desc}
                      </p>
                    </div>
                  </div>

                  {/* Cards Lane */}
                  <div className="space-y-3.5 flex-1 overflow-y-auto">
                    {colItems.length === 0 ? (
                      <div className="py-14 text-center text-[#927681] border border-dashed border-[#EBD4DC] rounded-2xl bg-[#FFF9F2]/50">
                        <p className="text-xs">No orders in this stage</p>
                      </div>
                    ) : (
                      colItems.map((ord) => (
                        <OrderCard
                          key={ord.id || ord._id}
                          order={ord}
                          onStatusChange={handleStatusChange}
                          onCancelClick={handleOpenCancelModal}
                          onViewDetails={handleOpenDetails}
                          onRecordPayment={handleRecordPayment}
                          onUpdatePreparationTime={handleUpdatePreparationTime}
                          loadingAction={loadingActionId === (ord.id || ord._id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -----------------------------------------------------------
          VIEW 2: ALL ORDERS TABLE (WITH FULL SEARCH, FILTERS, PAGINATION)
         ----------------------------------------------------------- */}
      {viewMode === "table" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
              {/* Search */}
              <div>
                <label className="block text-[#735A67] font-semibold mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Order # or Student Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] placeholder:text-[#927681] focus:outline-hidden focus:border-[#C94F78]"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[#735A67] font-semibold mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] focus:outline-hidden focus:border-[#C94F78] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="PENDING">PENDING (New)</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="READY">READY</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-[#735A67] font-semibold mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] focus:outline-hidden focus:border-[#C94F78] cursor-pointer"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[#735A67] font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] focus:outline-hidden focus:border-[#C94F78] cursor-pointer"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                  <option value="CASH">CASH (Legacy)</option>
                  <option value="ONLINE">ONLINE</option>
                </select>
              </div>
            </div>

            {/* Date Range & Clear Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EBD4DC] text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[#735A67] font-semibold">Date Range:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431]"
                />
                <span className="text-[#735A67]">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431]"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setPaymentStatusFilter("all");
                  setPaymentMethodFilter("all");
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-[#EBD4DC] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Table Component */}
          <OrderTable
            orders={orders}
            loading={loading}
            pagination={pagination}
            onPageChange={(newPage) => setPage(newPage)}
            onViewDetails={handleOpenDetails}
            onStatusChange={handleStatusChange}
            onCancelClick={handleOpenCancelModal}
            onRecordPayment={handleRecordPayment}
            onUpdatePreparationTime={handleUpdatePreparationTime}
          />
        </div>
      )}

      {/* Details Modal / Drawer */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedOrder(null);
        }}
        onStatusChange={handleStatusChange}
        onCancelClick={handleOpenCancelModal}
        onRecordPayment={handleRecordPayment}
        onUpdatePreparationTime={handleUpdatePreparationTime}
        loadingAction={loadingActionId === (selectedOrder?.id || selectedOrder?._id)}
      />

      {/* Admin Cancellation Modal with Required Reason */}
      <AdminCancelModal
        order={orderToCancel}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setOrderToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        submitting={cancelSubmitting}
      />
    </div>
  );
};

export default Orders;
