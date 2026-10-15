import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  UtensilsCrossed,
  Receipt,
  Layers,
  ShoppingBag,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import orderService from "../services/orderService";
import Loader from "../components/common/Loader";
import { getThumbnailUrl } from "../utils/imageUtils";
import { getFoodImage } from "../utils/foodImages";
import useOrderSocket from "../hooks/useOrderSocket";
import PreparationTime from "../components/order/PreparationTime";

const formatExpectedTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch (_) {
    return null;
  }
};

const OrderSuccess = () => {
  const { id } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!order && id) {
      setLoading(true);
      orderService
        .getOrderById(id)
        .then((data) => {
          setOrder(data);
          setError(null);
        })
        .catch((err) => {
          console.error("Failed to load order details:", err);
          setError(err.message || "Failed to load order details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, order]);

  // Real-time synchronization: reflect admin acceptance or payment updates immediately
  useOrderSocket({
    orderId: id || order?.id || order?._id,
    enabled: !!(id || order?.id || order?._id),
    onOrderUpdated: (eventData) => {
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          orderStatus: eventData.orderStatus || prev.orderStatus,
          paymentStatus: eventData.paymentStatus || prev.paymentStatus,
          expectedReadyAt: eventData.expectedReadyAt || prev.expectedReadyAt,
          estimatedReadyAt: eventData.estimatedReadyAt || prev.estimatedReadyAt,
          estimatedPreparationMinutes:
            eventData.estimatedPreparationMinutes !== undefined
              ? eventData.estimatedPreparationMinutes
              : prev.estimatedPreparationMinutes,
          estimatedPreparationTime:
            eventData.estimatedPreparationTime !== undefined
              ? eventData.estimatedPreparationTime
              : prev.estimatedPreparationTime,
          preparationEstimateUpdatedAt:
            eventData.preparationEstimateUpdatedAt !== undefined
              ? eventData.preparationEstimateUpdatedAt
              : prev.preparationEstimateUpdatedAt,
          serverTime: eventData.serverTime || prev.serverTime,
        };
      });
    },
    onReconnect: () => {
      const targetId = id || order?.id || order?._id;
      if (targetId) {
        orderService.getOrderById(targetId).then(setOrder).catch(() => {});
      }
    },
  });

  if (loading) {
    return (
      <PageContainer>
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <Loader message="Fetching order receipt..." />
        </div>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto my-12 text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-subtle space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Order Placed</h2>
          <p className="text-sm text-slate-600">
            {error || "Order reference: " + id}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm transition shadow-sm inline-flex items-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Return to Menu</span>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const expectedReadyFormatted = formatExpectedTime(order.expectedReadyAt);

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto my-6 sm:my-10 space-y-6 animate-fade-in">
        {/* Success Header Banner */}
        <div className="bg-[#5F9A68]/10 border border-[#5F9A68]/25 rounded-3xl p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#5F9A68] text-white flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#5F9A68] bg-[#5F9A68]/15 px-3.5 py-1 rounded-full inline-block">
            Order Confirmed & Queued
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#352431] tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-xs sm:text-sm text-[#735A67] font-medium max-w-md mx-auto">
            Your items are now registered into the canteen kitchen board. Head over to the counter when marked ready.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-8 shadow-sm space-y-6">
          {/* Top Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-[#EBD4DC]/60 pb-5">
            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Order Number
              </span>
              <span className="font-mono font-bold text-[#352431] text-xs sm:text-sm truncate block mt-0.5">
                {order.orderNumber || `#${order.id?.slice(-8)}`}
              </span>
            </div>

            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Payment Method
              </span>
              <span className="font-bold text-[#352431] block mt-0.5">
                {order.paymentMethod === "COD" || order.paymentMethod === "CASH"
                  ? "Cash on Delivery (COD)"
                  : "Online Payment"}
              </span>
            </div>

            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Payment Status
              </span>
              <span
                className={`font-bold block mt-0.5 ${
                  order.paymentStatus === "PAID" ? "text-[#5F9A68]" : "text-amber-600"
                }`}
              >
                {order.paymentStatus === "PAID"
                  ? "PAID"
                  : order.paymentMethod === "COD" || order.paymentMethod === "CASH"
                  ? "UNPAID (Pay on Delivery / Collection)"
                  : "PENDING"}
              </span>
            </div>

            <div>
              <span className="text-[#927681] font-semibold block text-[10px] uppercase">
                Kitchen State
              </span>
              <span className="font-bold text-[#C94F78] block mt-0.5">
                {order.orderStatus || "PENDING"}
              </span>
            </div>
          </div>

          {/* Live Preparation Timer */}
          <PreparationTime order={order} />

          {/* Items Breakdown */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-[#352431] tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#C94F78]" />
              <span>Order Items ({order.items?.length || 0})</span>
            </h3>

            <div className="divide-y divide-[#EBD4DC]/60 border border-[#EBD4DC] rounded-2xl p-2 sm:p-3">
              {(order.items || []).map((item, idx) => {
                const itemImg = item.image || item.snapshot?.image;
                return (
                  <div
                    key={item.id || idx}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      {itemImg ? (
                        <img
                          src={getThumbnailUrl(itemImg, 80)}
                          alt={item.name}
                          width="40"
                          height="40"
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-xl object-cover bg-[#FBE7EE] border border-[#EBD4DC]"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = getFoodImage(item);
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#FBE7EE] text-[#C94F78] font-bold flex items-center justify-center border border-[#EBD4DC]">
                          {item.itemType === "COMBO" ? (
                            <Layers className="w-4 h-4" />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4" />
                          )}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-[#352431] block">
                          {item.name}
                        </span>
                        <span className="text-[#735A67] text-[11px] font-medium">
                          ₹{item.unitPrice} × {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="font-bold text-[#352431] text-sm">
                      ₹{item.subtotal}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Notes (if any) */}
          {order.notes && (
            <div className="bg-[#FBE7EE]/40 p-3.5 rounded-2xl border border-[#EBD4DC] text-xs">
              <span className="font-bold text-[#352431] block mb-0.5">Kitchen Note:</span>
              <span className="text-[#735A67] font-medium italic">"{order.notes}"</span>
            </div>
          )}

          {/* Final Authoritative Total */}
          <div className="pt-3 border-t border-[#EBD4DC] flex items-baseline justify-between">
            <span className="font-bold text-[#735A67] text-sm">Total Due / Paid</span>
            <span className="text-2xl font-bold text-[#C94F78]">
              ₹{order.totalAmount || order.subtotal}
            </span>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/orders/${order.id || order._id}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-sm transition shadow-sm active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Track Live Order</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 text-[#352431] font-bold text-sm border border-[#EBD4DC] transition active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Back to Menu</span>
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default OrderSuccess;

