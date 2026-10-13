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
  onRecordPayment,
}) => {
  if (loading) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white border border-[#EBD4DC] shadow-xs">
        <div className="size-8 border-2 border-[#C94F78] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#735A67]">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white border border-[#EBD4DC] shadow-xs">
        <span className="text-3xl block mb-2">📜</span>
        <h4 className="text-sm font-bold text-[#352431] mb-1">No orders found</h4>
        <p className="text-xs font-medium text-[#735A67] max-w-sm mx-auto">
          No orders match the current filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#EBD4DC] bg-white overflow-hidden shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FFF9F2] text-[#735A67] uppercase tracking-wider font-bold border-b border-[#EBD4DC]">
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
          <tbody className="divide-y divide-[#EBD4DC]/80 text-[#352431]">
            {orders.map((order) => {
              const orderId = order.id || order._id;
              const status = (order.orderStatus || "PENDING").toUpperCase();
              const paymentMethod = (order.paymentMethod || "CASH").toUpperCase();
              const isCashOrCod = paymentMethod === "COD" || paymentMethod === "CASH";
              const displayPaymentMethod = isCashOrCod ? "COD" : paymentMethod;
              const paymentStatus = (order.paymentStatus || "PENDING").toUpperCase();
              const isPaid = paymentStatus === "PAID";

              return (
                <tr
                  key={orderId}
                  onClick={() => onViewDetails(order)}
                  className="hover:bg-[#FBE7EE]/30 cursor-pointer transition"
                >
                  {/* Order Number */}
                  <td className="px-4 py-3.5 font-mono font-black text-[#352431]">
                    #{order.orderNumber || orderId.slice(-6)}
                  </td>

                  {/* Customer */}
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-[#352431] truncate max-w-[130px]">
                      {order.user?.name || "Student"}
                    </p>
                    <p className="text-[11px] text-[#927681] truncate max-w-[130px]">
                      {order.user?.email || ""}
                    </p>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3.5 text-[#735A67] whitespace-nowrap font-medium">
                    {formatDate(order.createdAt)}
                  </td>

                  {/* Items summary */}
                  <td className="px-4 py-3.5">
                    <div className="max-w-[180px] truncate text-[#735A67] font-medium">
                      {(order.items || [])
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ")}
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 font-mono font-bold text-[#352431] whitespace-nowrap">
                    ₹{order.totalAmount}
                  </td>

                  {/* Payment */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {displayPaymentMethod}: {isPaid ? "PAID" : "UNPAID"}
                    </span>
                    {!isPaid && isCashOrCod && onRecordPayment && status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRecordPayment(orderId, "PAID");
                        }}
                        className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition cursor-pointer"
                        title="Collect Cash & Mark Paid"
                      >
                        💵 Collect
                      </button>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <OrderStatusBadge status={status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3.5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onViewDetails(order)}
                        className="px-3 py-1 rounded-lg bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] font-bold border border-[#EBD4DC] transition cursor-pointer"
                      >
                        Details
                      </button>

                      {status !== "COMPLETED" && status !== "CANCELLED" && (
                        <button
                          type="button"
                          onClick={() => onCancelClick(order)}
                          className="px-2 py-1 rounded-lg border border-[#EBD4DC] hover:border-rose-300 text-[#927681] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
        <div className="flex items-center justify-between text-xs text-[#735A67] pt-2">
          <span className="font-medium">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-xl border border-[#EBD4DC] bg-white hover:bg-[#FBE7EE]/50 text-[#735A67] disabled:opacity-40 disabled:cursor-not-allowed transition font-bold"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-xl border border-[#EBD4DC] bg-white hover:bg-[#FBE7EE]/50 text-[#735A67] disabled:opacity-40 disabled:cursor-not-allowed transition font-bold"
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
