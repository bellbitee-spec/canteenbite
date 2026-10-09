import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Trash2, UtensilsCrossed, Plus } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import CartItem from "../components/cart/CartItem";
import CartSummary from "../components/cart/CartSummary";
import useCart from "../hooks/useCart";

const Cart = () => {
  const navigate = useNavigate();
  const { items, itemCount, clearCart } = useCart();

  if (!items || items.length === 0) {
    return (
      <PageContainer>
        <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4 border border-brand-100 shadow-subtle">
            <ShoppingBag className="w-9 h-9 stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Your tray is empty
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            Explore freshly cooked dishes, combos, and snacks to start your order.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs sm:text-sm shadow-sm shadow-brand-500/25 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Browse Canteen Menu</span>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Your Food Tray</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {itemCount} {itemCount === 1 ? "item" : "items"} selected for canteen pickup
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="self-start sm:self-auto text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors px-2 py-1 rounded-lg inline-flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Tray</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Cart Item List */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <CartItem key={`${item.itemType}_${item.id}`} item={item} />
          ))}

          <div className="pt-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 px-4 py-2.5 rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add more food from menu</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <CartSummary onContinue={() => navigate("/checkout")} />
        </div>
      </div>
    </PageContainer>
  );
};

export default Cart;

