import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  ShoppingBag,
  Home,
  LayoutGrid,
  Receipt,
  User,
  Menu,
  X,
  Search,
} from "lucide-react";
import useCart from "../../hooks/useCart";
import useStore from "../../hooks/useStore";
import useAuth from "../../hooks/useAuth";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const { itemCount, subtotal, openDrawer } = useCart();
  const { store, loading } = useStore();
  const { user, isAuthenticated, logout } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/?q=${encodeURIComponent(headerSearch.trim())}`);
    }
  };

  return (
    <header className="w-full">
      {/* ================= DESKTOP HEADER ================= */}
      <div className="hidden lg:flex items-center justify-between py-3.5 gap-6">
        {/* Left: Brand & Location */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-sm shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900 block leading-tight">
                My Canteen
              </span>
              <span className="text-[10px] font-bold text-brand-600 block uppercase tracking-wider">
                Express Campus Dining
              </span>
            </div>
          </Link>

          <div className="h-6 w-px bg-slate-200" />

          {/* Location & Status indicator */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 border border-slate-200/60 shadow-2xs">
              <span className="text-slate-500 text-[11px] font-semibold">📍 Counter 1 & 2</span>
              <span className="text-slate-300">·</span>
              {loading ? (
                <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
              ) : store?.isOpen && store?.canOrder ? (
                <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Open now
                </span>
              ) : store?.isOpen && !store?.canOrder ? (
                <span className="text-amber-700 font-extrabold text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Paused
                </span>
              ) : (
                <Link
                  to="/store-closed"
                  className="text-rose-700 font-extrabold text-[11px] hover:underline flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
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
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Search meals, snacks, drinks..."
            className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-slate-100/80 hover:bg-slate-100 text-slate-800 placeholder-slate-400 text-xs font-semibold border-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:outline-hidden transition-all shadow-2xs"
          />
        </form>

        {/* Right: Nav Links, Cart, Profile */}
        <div className="flex items-center gap-3">
          <Link
            to="/categories"
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors ${
              location.pathname.startsWith("/categories")
                ? "text-brand-600 bg-brand-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Menu
          </Link>

          <Link
            to="/orders"
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-colors ${
              location.pathname.startsWith("/orders")
                ? "text-brand-600 bg-brand-50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            Orders
          </Link>

          {/* Cart Icon Button */}
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open shopping cart with ${itemCount} items`}
            className={`relative p-2.5 px-3 rounded-2xl transition-all duration-200 active:scale-95 flex items-center gap-2 cursor-pointer ${
              itemCount > 0
                ? "bg-slate-900 text-white shadow-elevated hover:bg-slate-800"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <ShoppingBag className="w-4.5 h-4.5 stroke-[2.2]" />
            {itemCount > 0 ? (
              <span className="text-xs font-black text-brand-400">
                ₹{subtotal}
              </span>
            ) : null}
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-500 text-white font-black text-[10px] flex items-center justify-center animate-scale-in shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* Desktop Profile / Sign In */}
          {isAuthenticated && user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/60 transition active:scale-95"
              aria-label="View Profile"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <span className="text-xs font-black truncate max-w-[100px]">
                {user.name}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black transition active:scale-95 shadow-2xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* ================= MOBILE HEADER ================= */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between shadow-2xs">
        {/* Brand & Counter Location (Reference Inspired) */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-xs">
            <UtensilsCrossed className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-slate-900 leading-tight">
                My Canteen
              </span>
              <span className="text-[10px] text-slate-400">·</span>
              <span className="text-[10px] font-semibold text-slate-500">
                Counter 1 & 2
              </span>
            </div>
            {/* Store Status Pill */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {store?.isOpen && store?.canOrder ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-700">
                    Open now
                  </span>
                </>
              ) : store?.isOpen && !store?.canOrder ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700">
                    Paused
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-rose-700">
                    Closed
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Mobile Right Actions */}
        <div className="flex items-center gap-2">
          {/* User Profile / Login Link */}
          <Link
            to={isAuthenticated ? "/profile" : "/login"}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95"
            aria-label={isAuthenticated ? "Student Profile" : "Sign In"}
          >
            {isAuthenticated && user?.name ? (
              <span className="font-black text-xs text-brand-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <User className="w-4 h-4 text-slate-600" />
            )}
          </Link>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openDrawer}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              itemCount > 0
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            aria-label="Open cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-500 text-white font-black text-[9px] flex items-center justify-center animate-scale-in">
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
