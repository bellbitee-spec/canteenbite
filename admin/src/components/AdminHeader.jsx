import React from "react";
import { useLocation, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useStore from "../hooks/useStore";

const getPageTitle = (pathname) => {
  if (pathname.startsWith("/orders")) return "Order Management";
  if (pathname.startsWith("/products")) return "Product Catalog";
  if (pathname.startsWith("/combos")) return "Combo Offers";
  if (pathname.startsWith("/categories")) return "Menu Categories";
  if (pathname.startsWith("/store-settings")) return "Store Operations & Banner";
  return "Kitchen Dashboard";
};

const AdminHeader = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { storeStatus, loading } = useStore();
  const location = useLocation();

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-18 bg-white/85 backdrop-blur-md border-b border-[#EBD4DC] flex items-center justify-between px-5 sm:px-8 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3.5">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-[#735A67] hover:text-[#352431] rounded-xl hover:bg-[#FBE7EE] transition-colors focus:outline-none"
          aria-label="Open navigation sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="text-xl font-extrabold text-[#352431] tracking-tight">
            {title}
          </h1>
          <p className="text-[11px] font-semibold text-[#927681] hidden sm:block">
            Campus Live Food Management
          </p>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Compact Store Status Indicator with Radar pulse */}
        <Link
          to="/store-settings"
          title="Store Operating Status and Controls"
          className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold border transition-all bg-[#FFF9F2] hover:bg-[#FBE7EE] border-[#EBD4DC] shadow-xs active:scale-98"
        >
          {loading ? (
            <span className="size-2 rounded-full bg-[#927681] animate-pulse" />
          ) : storeStatus?.isOpen && storeStatus?.canOrder ? (
            <>
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5F9A68] opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-[#5F9A68]" />
              </span>
              <span className="text-[#5F9A68] text-[11px] font-extrabold uppercase tracking-wider">
                Canteen Open
              </span>
            </>
          ) : storeStatus?.isOpen && !storeStatus?.canOrder ? (
            <>
              <span className="size-2 rounded-full bg-amber-500" />
              <span className="text-amber-700 text-[11px] font-extrabold uppercase tracking-wider">
                Orders Paused
              </span>
            </>
          ) : (
            <>
              <span className="size-2 rounded-full bg-[#C94F78]" />
              <span className="text-[#C94F78] text-[11px] font-extrabold uppercase tracking-wider">
                Canteen Closed
              </span>
            </>
          )}
        </Link>

        {/* Staff badge */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF9F2] border border-[#EBD4DC] shadow-xs">
          <span className="text-xs font-bold text-[#352431]">
            {user?.name || "Kitchen Staff"}
          </span>
          <span className="text-[10px] font-black text-[#C94F78] bg-[#FBE7EE] px-2 py-0.5 rounded-full border border-[#C94F78]/30 uppercase tracking-wider">
            {user?.role || "ADMIN"}
          </span>
        </div>

        {/* Sign Out Action */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 text-[#735A67] hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
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
