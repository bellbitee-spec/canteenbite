import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  X,
  ArrowRight,
  AlertCircle,
  UtensilsCrossed,
  Trash2,
} from "lucide-react";
import useCart from "../../hooks/useCart";
import useStore from "../../hooks/useStore";
import CartItem from "./CartItem";

const CartDrawer = () => {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    clearCart,
  } = useCart();
  const { store } = useStore();

  const canOrder = Boolean(store?.canOrder);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const handleCheckoutClick = () => {
    if (!canOrder) return;
    closeDrawer();
    navigate("/checkout");
  };

  const handleViewCartClick = () => {
    closeDrawer();
    navigate("/cart");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
        <div className="w-screen max-w-md bg-slate-50 flex flex-col shadow-float border-l border-slate-200/70 animate-slide-up">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Your Tray</h2>
                <span className="text-[11px] font-bold text-slate-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"} selected
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 my-auto">
                <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-500 flex items-center justify-center mb-3.5 border border-brand-100">
                  <UtensilsCrossed className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="font-black text-base text-slate-900 tracking-tight">
                  Your cart is waiting.
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Add some quick snacks, meals, or combos to start your order.
                </p>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs transition shadow-sm shadow-brand-500/20 active:scale-95"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              items.map((item) => (
                <CartItem key={`${item.itemType}_${item.id}`} item={item} />
              ))
            )}
          </div>

          {/* Footer Summary & Actions */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 space-y-3 shadow-subtle">
              {/* Store Closed Warning in Drawer */}
              {!canOrder && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Orders are currently paused. Items remain safely saved in your tray.</span>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-1.5 py-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Campus Counter Pickup</span>
                  <span className="font-bold text-emerald-600 uppercase text-[10px]">FREE</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                  <span className="font-black text-sm text-slate-900">To Pay</span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">₹{subtotal}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleViewCartClick}
                  className="w-full py-3 px-3 rounded-xl font-black text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-98"
                >
                  View Details
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={!canOrder}
                  className={`w-full py-3 px-3 rounded-xl font-black text-xs transition shadow-sm flex items-center justify-center gap-1.5 active:scale-98 ${
                    !canOrder
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25"
                  }`}
                >
                  <span>{!canOrder ? "Unavailable" : "Checkout"}</span>
                  {canOrder && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={clearCart}
                className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors pt-0.5 inline-flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear tray</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;

