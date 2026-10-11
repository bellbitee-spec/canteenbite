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
          <div className="w-20 h-20 rounded-full bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mb-4 border border-[#EBD4DC] shadow-xs">
            <ShoppingBag className="w-9 h-9 stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#352431] tracking-tight">
            Your tray is empty
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#735A67] leading-relaxed font-medium">
            Explore freshly cooked dishes, combos, and snacks to start your order.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="px-6 py-3.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#C94F78]/25 active:scale-95 transition-all inline-flex items-center gap-2"
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#352431] tracking-tight flex items-center gap-2">
            <span>Your Food Tray</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#735A67] mt-0.5">
            {itemCount} {itemCount === 1 ? "item" : "items"} selected for canteen pickup
          </p>
        </div>

        <button
          type="button"
          onClick={clearCart}
          className="self-start sm:self-auto text-xs font-semibold text-[#927681] hover:text-[#C94F78] transition-colors px-3 py-1.5 rounded-full inline-flex items-center gap-1 hover:bg-[#FBE7EE]"
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
              className="inline-flex items-center gap-2 text-xs font-bold text-[#C94F78] hover:text-[#B33D65] bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 px-4 py-2.5 rounded-full border border-[#EBD4DC] transition-all"
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

