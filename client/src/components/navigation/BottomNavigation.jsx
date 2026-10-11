import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  LayoutGrid,
  Receipt,
  ShoppingBag,
  User,
  ArrowRight,
} from "lucide-react";
import useCart from "../../hooks/useCart";
import useAuth from "../../hooks/useAuth";

const BottomNavigation = () => {
  const location = useLocation();
  const { itemCount, subtotal, openDrawer } = useCart();
  const { isAuthenticated } = useAuth();

  const isCurrent = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Floating Sticky Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 sm:bottom-18 inset-x-3.5 z-40 lg:hidden animate-slide-up select-none">
          <button
            type="button"
            onClick={openDrawer}
            className="w-full bg-[#352431] text-white px-4 py-3 rounded-full shadow-float border border-[#352431] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            aria-label={`View tray with ${itemCount} items totaling ₹${subtotal}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#C94F78] text-white flex items-center justify-center font-bold text-xs shadow-xs animate-scale-in">
                {itemCount}
              </span>
              <div className="text-left">
                <div className="text-xs font-bold tracking-tight leading-tight flex items-center gap-1.5 text-white">
                  <span>₹{subtotal}</span>
                  <span className="text-[#927681] font-normal">·</span>
                  <span className="text-[11px] text-[#EBD4DC] font-medium">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                </div>
                <div className="text-[10px] text-[#F3A6BF] font-semibold tracking-wide">
                  Pickup Counter 1 & 2
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold bg-[#C94F78] hover:bg-[#B33D65] text-white px-3.5 py-1.5 rounded-full transition-colors shadow-xs">
              <span>View Tray</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFF9F2]/95 backdrop-blur-md border-t border-[#EBD4DC] px-2 py-2 flex items-center justify-around shadow-subtle select-none"
      >
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2.5 rounded-xl active:scale-90 ${
            isCurrent("/")
              ? "text-[#C94F78] font-bold"
              : "text-[#927681] hover:text-[#352431] font-semibold"
          }`}
        >
          <Home className={`w-5 h-5 ${isCurrent("/") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Home</span>
        </Link>

        {/* Categories */}
        <Link
          to="/categories"
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2.5 rounded-xl active:scale-90 ${
            isCurrent("/categories")
              ? "text-[#C94F78] font-bold"
              : "text-[#927681] hover:text-[#352431] font-semibold"
          }`}
        >
          <LayoutGrid className={`w-5 h-5 ${isCurrent("/categories") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Menu</span>
        </Link>

        {/* Orders */}
        <Link
          to="/orders"
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2.5 rounded-xl active:scale-90 ${
            isCurrent("/orders") || isCurrent("/order-history")
              ? "text-[#C94F78] font-bold"
              : "text-[#927681] hover:text-[#352431] font-semibold"
          }`}
        >
          <Receipt className={`w-5 h-5 ${isCurrent("/orders") || isCurrent("/order-history") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Orders</span>
        </Link>

        {/* Cart button / drawer trigger */}
        <button
          type="button"
          onClick={openDrawer}
          aria-label={`Open Cart (${itemCount} items)`}
          className={`relative flex flex-col items-center gap-1 transition-all py-1 px-2.5 rounded-xl active:scale-90 cursor-pointer ${
            itemCount > 0 ? "text-[#C94F78] font-bold" : "text-[#927681] font-semibold"
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 stroke-[2]" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-[#C94F78] text-white font-bold text-[9px] leading-tight animate-scale-in shadow-xs">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Cart</span>
        </button>

        {/* Profile / Account */}
        <Link
          to={isAuthenticated ? "/profile" : "/login"}
          className={`flex flex-col items-center gap-1 transition-all py-1 px-2.5 rounded-xl active:scale-90 ${
            isCurrent("/profile") || isCurrent("/login")
              ? "text-[#C94F78] font-bold"
              : "text-[#927681] hover:text-[#352431] font-semibold"
          }`}
        >
          <User className={`w-5 h-5 ${isCurrent("/profile") || isCurrent("/login") ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
          <span className="text-[10px] tracking-tight">Profile</span>
        </Link>
      </nav>
    </>
  );
};

export default BottomNavigation;
