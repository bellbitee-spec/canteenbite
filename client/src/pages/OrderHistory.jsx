import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Receipt,
  Lock,
  UtensilsCrossed,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";
import orderService from "../services/orderService";
import Loader, { OrderCardSkeleton } from "../components/common/Loader";

const OrderHistory = () => {
  const { isAuthenticated, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    orderService
      .getMyOrders()
      .then((data) => {
        setOrders(data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load order history");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto my-6 sm:my-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center border border-[#EBD4DC]">
              <Receipt className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#352431] tracking-tight">
                My Orders
              </h1>
              <p className="text-xs sm:text-sm text-[#735A67] font-medium">
                Review your current and past meal orders from the college canteen
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="self-start sm:self-auto text-xs font-bold text-[#C94F78] hover:text-[#B33D65] inline-flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Browse Menu</span>
          </Link>
        </div>

        {!isAuthenticated ? (
          <div className="p-8 bg-white rounded-3xl border border-[#EBD4DC] text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h2 className="text-lg font-bold text-[#352431]">Please Log In</h2>
            <p className="text-xs text-[#735A67] max-w-sm mx-auto">
              You must be logged in with your student account to view order history.
            </p>
            <Link
              to="/checkout"
              className="px-5 py-2.5 rounded-full bg-[#352431] text-white font-bold text-xs inline-block hover:bg-[#352431]/90 transition"
            >
              Go to Login / Checkout
            </Link>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        ) : error ? (
          <div className="p-6 bg-[#FBE7EE] border border-[#EBD4DC] text-[#352431] rounded-2xl text-xs">
            <p className="font-bold text-[#C94F78]">Error loading order history:</p>
            <p className="text-[#735A67]">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-[#EBD4DC] text-center space-y-3 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
              <UtensilsCrossed className="w-7 h-7 stroke-[2]" />
            </div>
            <h2 className="text-lg font-bold text-[#352431]">No Orders Placed Yet</h2>
            <p className="text-xs text-[#735A67] max-w-sm mx-auto">
              You haven't placed any canteen orders yet. Explore our menu to get started!
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="px-6 py-3 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm active:scale-95 transition"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Order Now</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id || ord._id}
                className="p-5 bg-white rounded-3xl border border-[#EBD4DC] shadow-sm space-y-3 hover:border-[#C94F78]/50 hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EBD4DC]/60 pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-[#352431] block">
                      {ord.orderNumber || `#${(ord.id || ord._id).slice(-8)}`}
                    </span>
                    <span className="text-[11px] text-[#927681]">
                      {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                        ord.orderStatus === "COMPLETED"
                          ? "bg-[#5F9A68]/15 text-[#5F9A68] border-[#5F9A68]/30"
                          : ord.orderStatus === "CANCELLED"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-[#FBE7EE] text-[#C94F78] border-[#EBD4DC]"
                      }`}
                    >
                      {ord.orderStatus}
                    </span>
                    <Link
                      to={`/orders/${ord.id || ord._id}`}
                      className="px-3 py-1.5 rounded-full bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 text-[#352431] border border-[#EBD4DC] font-bold text-xs inline-flex items-center gap-1 transition"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#735A67] gap-2">
                  <span>
                    {(ord.items || []).length} items • Payment: {ord.paymentMethod} (
                    {ord.paymentStatus})
                  </span>
                  <span className="font-bold text-[#C94F78] text-base">
                    ₹{ord.totalAmount || ord.subtotal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default OrderHistory;
