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
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-3xl p-6 sm:p-8 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full inline-block">
            Order Confirmed & Queued
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Order Placed Successfully!
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
            Your items are now registered into the canteen kitchen board. Head over to the counter when marked ready.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-subtle space-y-6">
          {/* Top Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-100 pb-5">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Order Number
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm truncate block mt-0.5">
                {order.orderNumber || `#${order.id?.slice(-8)}`}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Payment Method
              </span>
              <span className="font-extrabold text-slate-900 block mt-0.5">
                {order.paymentMethod === "CASH" ? "Cash at Counter" : "Online Payment"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Payment Status
              </span>
              <span
                className={`font-black block mt-0.5 ${
                  order.paymentStatus === "PAID" ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {order.paymentStatus || "PENDING"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                Kitchen State
              </span>
              <span className="font-black text-brand-600 block mt-0.5">
                {order.orderStatus || "PENDING"}
              </span>
            </div>
          </div>

          {/* Timings Highlight Box */}
          <div className="bg-brand-50 rounded-2xl border border-brand-200/80 p-4 flex flex-col sm:flex-row items-center justify-around gap-3 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
                Estimated Preparation
              </span>
              <span className="text-lg font-black text-slate-900">
                {order.estimatedPreparationTime ? `${order.estimatedPreparationTime} mins` : "10-15 mins"}
              </span>
            </div>

            {expectedReadyFormatted && (
              <>
                <div className="hidden sm:block h-8 w-px bg-brand-200" />
                <div>
                  <span className="text-[11px] font-bold text-brand-800 uppercase tracking-wider block">
                    Expected Ready By
                  </span>
                  <span className="text-lg font-black text-slate-900 flex items-center justify-center sm:justify-start gap-1">
                    <Clock className="w-4 h-4 text-brand-600" />
                    <span>{expectedReadyFormatted}</span>
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Items Breakdown */}
          <div className="space-y-3">
            <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-brand-500" />
              <span>Order Items ({order.items?.length || 0})</span>
            </h3>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2 sm:p-3">
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
                          src={itemImg}
                          alt={item.name}
                          loading="lazy"
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 font-bold flex items-center justify-center">
                          {item.itemType === "COMBO" ? (
                            <Layers className="w-4 h-4" />
                          ) : (
                            <UtensilsCrossed className="w-4 h-4" />
                          )}
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold text-slate-800 block">
                          {item.name}
                        </span>
                        <span className="text-slate-400 text-[11px] font-medium">
                          ₹{item.unitPrice} × {item.quantity}
                        </span>
                      </div>
                    </div>

                    <div className="font-black text-slate-900 text-sm">
                      ₹{item.subtotal}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Notes (if any) */}
          {order.notes && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Kitchen Note:</span>
              <span className="text-slate-600 font-medium italic">"{order.notes}"</span>
            </div>
          )}

          {/* Final Authoritative Total */}
          <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <span className="font-bold text-slate-600 text-sm">Total Due / Paid</span>
            <span className="text-2xl font-black text-slate-900">
              ₹{order.totalAmount || order.subtotal}
            </span>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/orders/${order.id || order._id}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm transition shadow-sm shadow-brand-500/25 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Track Live Order</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-200 transition active:scale-95 text-center flex items-center justify-center gap-2"
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

