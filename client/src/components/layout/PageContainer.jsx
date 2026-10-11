import React from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import CartDrawer from "../cart/CartDrawer";
import StoreStatusBanner from "../store/StoreStatusBanner";
import BottomNavigation from "../navigation/BottomNavigation";
import { UtensilsCrossed, ShieldCheck, Zap, Sparkles } from "lucide-react";

const PageContainer = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#352431] antialiased flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Cart Drawer Modal */}
      <CartDrawer />

      {/* Unified Top Navbar (Desktop & Mobile) */}
      <div className="sticky top-0 z-30 bg-[#FFF9F2]/95 backdrop-blur-md border-b border-[#EBD4DC]/80 shadow-2xs">
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

      {/* Production-Ready BellBite Footer */}
      <Footer />

      {/* Mobile Bottom Navigation & Sticky Cart Bar */}
      <BottomNavigation />
    </div>
  );
};

export default PageContainer;
