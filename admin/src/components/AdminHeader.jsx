import React from "react";
import { useLocation, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useStore from "../hooks/useStore";

const getPageTitle = (pathname) => {
  if (pathname.startsWith("/orders")) return "Order Management";
  if (pathname.startsWith("/products")) return "Product Catalog";
  if (pathname.startsWith("/combos")) return "Combo Offers";
  if (pathname.startsWith("/categories")) return "Menu Categories";
  if (pathname.startsWith("/store-settings")) return "Store Settings";
  return "Dashboard Overview";
};

const AdminHeader = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { storeStatus, loading } = useStore();
  const location = useLocation();

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
          aria-label="Open navigation sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Compact Store Status Indicator */}
        <Link
          to="/store-settings"
          title="Store Operating Status and Controls"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all bg-slate-800/80 hover:bg-slate-800 border-slate-700/60"
        >
          {loading ? (
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
          ) : storeStatus?.isOpen && storeStatus?.canOrder ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-[11px] font-bold">Open</span>
            </>
          ) : storeStatus?.isOpen && !storeStatus?.canOrder ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-[11px] font-bold">Paused</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-rose-400 text-[11px] font-bold">Closed</span>
            </>
          )}
        </Link>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">
            {user?.name || "Admin"}
          </span>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">
            {user?.role || "ADMIN"}
          </span>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;
