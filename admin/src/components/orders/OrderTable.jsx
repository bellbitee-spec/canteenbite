import React from "react";
import OrderStatusBadge from "./OrderStatusBadge";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch (_) {
    return dateStr;
  }
};

const OrderTable = ({
  orders = [],
  loading = false,
  pagination = {},
  onPageChange,
  onViewDetails,
  onStatusChange,
  onCancelClick,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800">
        <span className="text-3xl block mb-2">📜</span>
        <h4 className="text-sm font-bold text-white mb-1">No orders found</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No orders match the current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3.5">Order</th>
              <th className="px-4 py-3.5">Customer</th>
              <th className="px-4 py-3.5">Placed At</th>
              <th className="px-4 py-3.5">Items</th>
              <th className="px-4 py-3.5">Total</th>
              <th className="px-4 py-3.5">Payment</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {orders.map((order) => {
              const orderId = order.id || order._id;
              const status = (order.orderStatus || "PENDING").toUpperCase();
              const paymentMethod = (order.paymentMethod || "CASH").toUpperCase();
              const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
              const isPaid = paymentStatus === "PAID";

              return (
                <tr
                  key={orderId}
                  onClick={() => onViewDetails(order)}
                  className="hover:bg-slate-800/40 cursor-pointer transition"
                >
                  {/* Order Number */}
                  <td className="px-4 py-3 font-mono font-bold text-white">
                    #{order.orderNumber || orderId.slice(-6)}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-white truncate max-w-[130px]">
                      {order.user?.name || "Student"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {order.user?.email || ""}
                    </p>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {formatDate(order.createdAt)}
                  </td>

                  {/* Items summary */}
                  <td className="px-4 py-3">
                    <div className="max-w-[180px] truncate">
                      {(order.items || [])
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ")}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                    ₹{order.totalAmount}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isPaid
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {paymentMethod}: {paymentStatus}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <OrderStatusBadge status={status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition"
                      >
                        Details
                      </button>

                      {status !== "COMPLETED" && status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => onCancelClick(order)}
                          className="px-2 py-1 rounded-lg border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Cancel Order"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTable;
