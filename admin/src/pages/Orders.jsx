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
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    headerBg: "border-t-2 border-t-amber-500",
  },
  {
    key: "CONFIRMED",
    title: "CONFIRMED",
    desc: "Queued for kitchen",
    badgeBg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    headerBg: "border-t-2 border-t-sky-500",
  },
  {
    key: "PREPARING",
    title: "PREPARING",
    desc: "Currently cooking",
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    headerBg: "border-t-2 border-t-indigo-500",
  },
  {
    key: "DELAYED",
    title: "DELAYED",
    desc: "Urgent: behind schedule",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    headerBg: "border-t-2 border-t-rose-500",
  },
  {
    key: "READY",
    title: "READY",
    desc: "Pickup at counter",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    headerBg: "border-t-2 border-t-emerald-500",
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
              ? "bg-rose-950 border-rose-500/50 text-rose-200"
              : "bg-emerald-950 border-emerald-500/50 text-emerald-200"
          }`}
        >
          <span>{toast.type === "error" ? "⚠️" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Order Operations
            </h2>
            {/* Live Socket Status Indicator */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
              }`}
              title={connected ? "Socket connected to live canteen updates" : "Connecting..."}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>{connected ? "Live Kitchen" : "Connecting"}</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Realtime canteen preparation pipeline and order management
          </p>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Board vs Table Toggle */}
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center">
            <button
              type="button"
              onClick={() => {
                setViewMode("board");
                setSearchParams({ view: "board" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "board"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🍳</span>
              <span>Kitchen Board</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {activeTotalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                setSearchParams({ view: "table" });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === "table"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
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
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50"
            title="Refresh Orders"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`}
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
        <div className="space-y-4">
          {/* Quick Active Kitchen Stats Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-400 font-semibold">Active Pipeline:</span>
              <span className="text-amber-400 font-medium">
                {columnOrders.PENDING.length} New
              </span>
              <span className="text-sky-400 font-medium">
                {columnOrders.CONFIRMED.length} Confirmed
              </span>
              <span className="text-indigo-400 font-medium">
                {columnOrders.PREPARING.length} In Prep
              </span>
              <span className="text-rose-400 font-bold">
                {columnOrders.DELAYED.length} Delayed
              </span>
              <span className="text-emerald-400 font-bold">
                {columnOrders.READY.length} Ready for Pickup
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">History:</span>
              <span className="text-slate-400">
                {columnOrders.COMPLETED.length} Completed today
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {columnOrders.CANCELLED.length} Cancelled
              </span>
            </div>
          </div>

          {/* Mobile Workstation Selector Tabs (Visible on < lg screens) */}
          <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setMobileColumnTab("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                mobileColumnTab === "ALL"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400"
              }`}
            >
              All Stages ({activeTotalCount})
            </button>
            {KITCHEN_COLUMNS.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileColumnTab(col.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  mobileColumnTab === col.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 border border-slate-800 text-slate-400"
                }`}
              >
                <span>{col.title}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
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
                  className={`flex flex-col rounded-3xl bg-slate-950/40 border border-slate-800/80 p-3.5 space-y-3 min-h-[500px] ${
                    isColHiddenOnMobile ? "hidden lg:flex" : "flex"
                  } ${col.headerBg}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-white">
                          {col.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold border ${col.badgeBg}`}
                        >
                          {colItems.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {col.desc}
                      </p>
                    </div>
                  </div>

                  {/* Cards Lane */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colItems.length === 0 ? (
                      <div className="py-12 text-center text-slate-600 border border-dashed border-slate-800/80 rounded-2xl">
                        <p className="text-xs">No orders</p>
                      </div>
                    ) : (
                      colItems.map((ord) => (
                        <OrderCard
                          key={ord.id || ord._id}
                          order={ord}
                          onStatusChange={handleStatusChange}
                          onCancelClick={handleOpenCancelModal}
                          onViewDetails={handleOpenDetails}
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
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Search */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Order # or Student Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
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
                <label className="block text-slate-400 font-semibold mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => {
                    setPaymentStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
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
                <label className="block text-slate-400 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => {
                    setPaymentMethodFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="CASH">CASH</option>
                  <option value="ONLINE">ONLINE</option>
                </select>
              </div>
            </div>

            {/* Date Range & Clear Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 font-semibold">Date Range:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
                <span className="text-slate-600">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white"
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
                className="px-3 py-1 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
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
