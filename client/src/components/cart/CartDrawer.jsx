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
        className="fixed inset-0 bg-[#352431]/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FFF9F2] flex flex-col shadow-float border-l border-[#EBD4DC] animate-slide-up">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-[#FFF9F2] border-b border-[#EBD4DC] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center border border-[#EBD4DC]">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#352431] tracking-tight">Your Tray</h2>
                <span className="text-[11px] font-semibold text-[#735A67]">
                  {itemCount} {itemCount === 1 ? "item" : "items"} selected
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDrawer}
              className="p-2 text-[#735A67] hover:text-[#352431] rounded-full hover:bg-[#FBE7EE] transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#735A67] my-auto">
                <div className="w-16 h-16 rounded-full bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mb-3.5 border border-[#EBD4DC]">
                  <UtensilsCrossed className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="font-extrabold text-base text-[#352431] tracking-tight">
                  Your cart is waiting.
                </h3>
                <p className="text-xs text-[#927681] mt-1 max-w-xs leading-relaxed">
                  Add some quick snacks, meals, or combos to start your order.
                </p>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="mt-5 px-6 py-2.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs transition shadow-md shadow-[#C94F78]/25 active:scale-95"
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
            <div className="p-4 sm:p-5 bg-[#FFF9F2] border-t border-[#EBD4DC] space-y-3 shadow-subtle">
              {/* Store Closed Warning in Drawer */}
              {!canOrder && (
                <div className="p-3 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-rose-800 text-[11px] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Orders are currently paused. Items remain safely saved in your tray.</span>
                </div>
              )}

              {/* Bill Details */}
              <div className="space-y-1.5 py-1 text-xs text-[#735A67]">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-[#352431]">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Campus Counter Pickup</span>
                  <span className="font-bold text-[#5F9A68] uppercase text-[10px]">FREE</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-[#EBD4DC]">
                  <span className="font-bold text-sm text-[#352431]">To Pay</span>
                  <span className="text-2xl font-extrabold text-[#352431] tracking-tight">₹{subtotal}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleViewCartClick}
                  className="w-full py-3 px-3 rounded-full font-bold text-xs bg-white hover:bg-[#FBE7EE] text-[#352431] border border-[#EBD4DC] transition active:scale-98"
                >
                  View Details
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  disabled={!canOrder}
                  className={`w-full py-3 px-3 rounded-full font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 active:scale-98 ${
                    !canOrder
                      ? "bg-[#FBE7EE] text-[#927681] cursor-not-allowed shadow-none"
                      : "bg-[#C94F78] hover:bg-[#B33D65] text-white shadow-md shadow-[#C94F78]/25"
                  }`}
                >
                  <span>{!canOrder ? "Unavailable" : "Checkout"}</span>
                  {canOrder && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={clearCart}
                className="w-full text-center text-[11px] font-semibold text-[#927681] hover:text-[#C94F78] transition-colors pt-0.5 inline-flex items-center justify-center gap-1"
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

