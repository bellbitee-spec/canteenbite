import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";
import useCart from "../../hooks/useCart";
import useStore from "../../hooks/useStore";

const CartSummary = ({ onContinue }) => {
  const navigate = useNavigate();
  const { itemCount, subtotal } = useCart();
  const { store, loading } = useStore();

  const canOrder = Boolean(store?.canOrder);

  const handleContinue = () => {
    if (!canOrder) return;
    if (onContinue) {
      onContinue();
    } else {
      navigate("/checkout");
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-card space-y-5">
      <h3 className="font-black text-lg text-slate-900 tracking-tight">
        Bill Summary
      </h3>

      <div className="space-y-2.5 text-xs sm:text-sm">
        <div className="flex justify-between text-slate-600">
          <span>Total Items</span>
          <span className="font-bold text-slate-900">{itemCount} items</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Item Subtotal</span>
          <span className="font-bold text-slate-900">₹{subtotal}</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Campus Counter Pickup</span>
          <span className="font-black text-emerald-600 uppercase text-xs">FREE</span>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
          <span className="font-black text-base text-slate-900">To Pay</span>
          <span className="font-black text-2xl text-slate-900 tracking-tight">₹{subtotal}</span>
        </div>
      </div>

      {/* Ordering Lock Warning if store is closed or paused */}
      {!loading && !canOrder && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Orders are currently paused</span>
          </div>
          <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
            {store?.reason || "Canteen is currently closed or kitchen is preparing active orders."}
          </p>
          <div className="pt-1">
            <Link
              to="/store-closed"
              className="text-[11px] font-bold text-rose-800 underline hover:text-rose-950 inline-flex items-center gap-1"
            >
              <span>View Canteen Schedule</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={itemCount === 0 || !canOrder}
        className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98 ${
          itemCount === 0 || !canOrder
            ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
            : "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25"
        }`}
      >
        <span>{!canOrder ? "Ordering Unavailable" : "Proceed to Checkout"}</span>
        {canOrder && itemCount > 0 && <ArrowRight className="w-4 h-4" />}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-semibold pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Authoritative campus pricing & live kitchen queue</span>
      </div>
    </div>
  );
};

export default CartSummary;

