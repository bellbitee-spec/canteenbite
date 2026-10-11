import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  UtensilsCrossed,
  ShoppingBag,
  Home,
  LayoutGrid,
  Receipt,
  User,
  Menu,
  X,
  Search,
  Sparkles,
} from "lucide-react";
import useCart from "../../hooks/useCart";
import useStore from "../../hooks/useStore";
import useAuth from "../../hooks/useAuth";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState("");
  const { itemCount, subtotal, openDrawer } = useCart();
  const { store, loading } = useStore();
  const { user, isAuthenticated } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/?q=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  return (
    <header className="w-full">
      {/* ================= DESKTOP HEADER ================= */}
      <div className="hidden lg:flex items-center justify-between py-4 gap-6">
        {/* Left: Brand & Location */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="shrink-0 text-[28px] font-extrabold tracking-[-0.09em] text-[#352431] transition-opacity hover:opacity-90"
            aria-label="BellBite Home"
          >
            bell<span className="text-[#C94F78]">bite</span><span className="text-[#C94F78]">.</span>
          </Link>

          <div className="h-6 w-px bg-[#EBD4DC]" />

          {/* Location & Status indicator */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#FFF9F2] border border-[#EBD4DC] shadow-2xs">
              <span className="text-[#735A67] text-[11px] font-semibold flex items-center gap-1">
                <span className="text-[#C94F78]">📍</span> Counter 1 & 2
              </span>
              <span className="text-[#EBD4DC]">·</span>
              {loading ? (
                <span className="w-2 h-2 rounded-full bg-[#EBD4DC] animate-pulse" />
              ) : store?.isOpen && store?.canOrder ? (
                <span className="text-[#5F9A68] font-extrabold text-[11px] flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#5F9A68]" />
                  Canteen open
                </span>
              ) : store?.isOpen && !store?.canOrder ? (
                <span className="text-amber-700 font-extrabold text-[11px] flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Ordering Paused
                </span>
              ) : (
                <Link
                  to="/store-closed"
                  className="text-rose-700 font-extrabold text-[11px] hover:underline flex items-center gap-1.5"
                >
                  <span className="size-2 rounded-full bg-rose-500" />
                  Closed
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-md relative flex items-center"
        >
          <Search className="w-4 h-4 text-[#927681] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search dishes, snacks, drinks..."
            className="w-full pl-9.5 pr-4 py-2.5 rounded-full bg-white text-[#352431] placeholder-[#927681] text-xs font-semibold border border-[#EBD4DC] focus:border-[#C94F78] focus:ring-2 focus:ring-[#C94F78]/15 focus:outline-hidden transition-all shadow-2xs"
          />
        </form>

        {/* Right: Nav Links, Cart, Profile */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-4 text-sm font-semibold text-[#735A67]" aria-label="Primary navigation">
            <Link
              to="/categories"
              className={`transition hover:text-[#C94F78] ${
                location.pathname.startsWith("/categories")
                  ? "text-[#C94F78] font-bold"
                  : ""
              }`}
            >
              Menu
            </Link>

            <Link
              to="/orders"
              className={`transition hover:text-[#C94F78] ${
                location.pathname.startsWith("/orders")
                  ? "text-[#C94F78] font-bold"
                  : ""
              }`}
            >
              Orders
            </Link>
          </nav>

          {/* Cart Icon Button */}
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open shopping cart with ${itemCount} items`}
            className="relative flex items-center gap-2 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-[#C94F78]/25 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
            {itemCount > 0 ? (
              <span>₹{subtotal}</span>
            ) : (
              <span>Cart</span>
            )}
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[#352431] text-[10px] font-bold text-white shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* Desktop Profile / Sign In */}
          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 text-[#352431] border border-[#EBD4DC] transition active:scale-95"
              aria-label="View Profile"
            >
              <div className="w-6 h-6 rounded-full bg-[#C94F78] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <span className="text-xs font-bold truncate max-w-[100px]">
                {user.name}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-full bg-[#352431] hover:bg-[#483343] text-white text-xs font-bold transition active:scale-95 shadow-2xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ================= MOBILE HEADER ================= */}
      <div className="lg:hidden bg-[#FFF9F2]/95 backdrop-blur-md px-4 py-3 border-b border-[#EBD4DC] flex items-center justify-between shadow-2xs">
        {/* Brand & Counter Location */}
        <Link to="/" className="flex items-center gap-2" aria-label="BellBite Home">
          <span className="text-[22px] font-extrabold tracking-[-0.09em] text-[#352431]">
            bell<span className="text-[#C94F78]">bite</span><span className="text-[#C94F78]">.</span>
          </span>
          <span className="text-[#EBD4DC]">·</span>
          <div className="flex items-center gap-1.5">
            {store?.isOpen && store?.canOrder ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#5F9A68]">
                <span className="size-1.5 rounded-full bg-[#5F9A68]" />
                Open
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                <span className="size-1.5 rounded-full bg-rose-500" />
                Closed
              </span>
            )}
          </div>
        </Link>

        {/* Mobile Right Actions */}
        <div className="flex items-center gap-2">
          {/* User Profile / Login Link */}
          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            className="size-9 rounded-full bg-[#FBE7EE] border border-[#EBD4DC] text-[#352431] flex items-center justify-center transition active:scale-95"
            aria-label={isAuthenticated ? "Student Profile" : "Sign In"}
          >
            {isAuthenticated && user?.name ? (
              <span className="font-bold text-xs text-[#C94F78]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-[#735A67]" />
            )}
          </Link>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className="relative flex size-9 items-center justify-center rounded-full bg-[#C94F78] text-white transition-all active:scale-95 cursor-pointer shadow-xs"
            aria-label="Open cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-[#352431] text-white font-bold text-[9px] shadow-xs">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
