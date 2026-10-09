import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import CartDrawer from "../cart/CartDrawer";
import StoreStatusBanner from "../store/StoreStatusBanner";
import BottomNavigation from "../navigation/BottomNavigation";
import { UtensilsCrossed, ShieldCheck, Zap, Sparkles } from "lucide-react";

const PageContainer = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 antialiased flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Cart Drawer Modal */}
      <CartDrawer />

      {/* Unified Top Navbar (Desktop & Mobile) */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Navbar />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 flex-1 flex flex-col">
        <StoreStatusBanner />

        {/* Page Body Content */}
        <main className="flex-1 w-full pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Modern Desktop Footer */}
      <footer className="border-t border-slate-100 bg-white py-6 text-center text-xs text-slate-400 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-500 text-white flex items-center justify-center text-xs font-black shadow-2xs">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-slate-800 text-xs tracking-tight">
              My Canteen • Express Campus Counter Ordering
            </span>
          </div>

          <div className="flex items-center gap-4 font-semibold text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-brand-500" />
              Skip Counter Queue
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-500" />
              Fresh Campus Prep
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-brand-500" />
              Counter Pickup
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} College Canteen
          </span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation & Sticky Cart Bar */}
      <BottomNavigation />
    </div>
  );
};

export default PageContainer;
