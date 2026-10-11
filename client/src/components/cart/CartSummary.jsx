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
    <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 shadow-sm space-y-5">
      <h3 className="font-bold text-lg text-[#352431] tracking-tight">
        Bill Summary
      </h3>

      <div className="space-y-2.5 text-xs sm:text-sm">
        <div className="flex justify-between text-[#735A67]">
          <span>Total Items</span>
          <span className="font-bold text-[#352431]">{itemCount} items</span>
        </div>

        <div className="flex justify-between text-[#735A67]">
          <span>Item Subtotal</span>
          <span className="font-bold text-[#352431]">₹{subtotal}</span>
        </div>

        <div className="flex justify-between text-[#735A67]">
          <span>Campus Counter Pickup</span>
          <span className="font-bold text-[#5F9A68] uppercase text-xs">FREE</span>
        </div>

        <div className="pt-3 border-t border-[#EBD4DC] flex justify-between items-baseline">
          <span className="font-bold text-base text-[#352431]">To Pay</span>
          <span className="font-bold text-2xl text-[#C94F78] tracking-tight">₹{subtotal}</span>
        </div>
      </div>

      {/* Ordering Lock Warning if store is closed or paused */}
      {!loading && !canOrder && (
        <div className="p-3.5 rounded-2xl bg-[#FBE7EE]/60 border border-[#EBD4DC] text-[#352431] text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-2 font-bold text-[#C94F78]">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#C94F78]" />
            <span>Orders are currently paused</span>
          </div>
          <p className="text-[11px] text-[#735A67] leading-relaxed font-medium">
            {store?.reason || "Canteen is currently closed or kitchen is preparing active orders."}
          </p>
          <div className="pt-1">
            <Link
              to="/store-closed"
              className="text-[11px] font-bold text-[#C94F78] underline hover:text-[#B33D65] inline-flex items-center gap-1"
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
        className={`w-full py-3.5 px-6 rounded-full font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98 ${
          itemCount === 0 || !canOrder
            ? "bg-[#FBE7EE] text-[#927681] cursor-not-allowed border border-[#EBD4DC] shadow-none"
            : "bg-[#C94F78] hover:bg-[#B33D65] text-white shadow-[#C94F78]/20"
        }`}
      >
        <span>{!canOrder ? "Ordering Unavailable" : "Proceed to Checkout"}</span>
        {canOrder && itemCount > 0 && <ArrowRight className="w-4 h-4" />}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#927681] font-medium pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-[#C94F78]" />
        <span>Authoritative campus pricing & live kitchen queue</span>
      </div>
    </div>
  );
};

export default CartSummary;

