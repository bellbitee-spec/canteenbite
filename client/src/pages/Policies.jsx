import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  RefreshCcw,
  FileText,
  AlertTriangle,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";

const TABS = [
  { id: "return", label: "Return Policy", icon: RefreshCcw },
  { id: "refund", label: "Refund Policy", icon: ShieldCheck },
  { id: "privacy", label: "Privacy Policy", icon: FileText },
  { id: "disclaimer", label: "Disclaimer", icon: AlertTriangle },
  { id: "contact", label: "About & Contact", icon: Mail },
];

const Policies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "return";

  const activeTab = TABS.some((t) => t.id === currentTab) ? currentTab : "return";

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto my-8 sm:my-12 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="border-b border-[#EBD4DC] pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xl">📜</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#352431] tracking-tight">
              Legal & Canteen Policies
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#735A67] font-medium">
            Clear, transparent policies for meals, refunds, privacy, and campus dining standards.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 scroll-smooth">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? "bg-[#C94F78] border-[#C94F78] text-white shadow-xs"
                    : "bg-white border-[#EBD4DC] text-[#735A67] hover:border-[#C94F78]/50 hover:text-[#352431]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EBD4DC] shadow-sm text-[#352431] leading-relaxed">
          {/* 1. RETURN POLICY */}
          {activeTab === "return" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBD4DC]">
                <RefreshCcw className="w-5 h-5 text-[#C94F78]" />
                <h2 className="text-xl font-bold tracking-tight">Return Policy</h2>
              </div>
              <p className="text-xs sm:text-sm text-[#735A67]">
                Because BellBite serves made-to-order, perishable hot food and beverages, physical returns of consumed or prepared food items are not accepted once handed over at the counter, consistent with food safety and hygiene regulations.
              </p>

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#352431]">Order Cancellation Before Kitchen Preparation:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#735A67] list-disc pl-5">
                  <li>
                    <strong>30-Second Self-Service Window:</strong> You may cancel any submitted order directly from your order tracking screen within 30 seconds of placement, provided preparation has not commenced.
                  </li>
                  <li>
                    <strong>Inventory & Payment Restoration:</strong> When an order is cancelled within the allowed window, all reserved product stock is restored instantly, and online payments are initiated for full refund.
                  </li>
                  <li>
                    <strong>In-Kitchen Orders:</strong> Once our kitchen advances an order to "Preparing", cancellation is locked to avoid food wastage.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#352431]">Incorrect or Defective Orders:</h3>
                <p className="text-xs sm:text-sm text-[#735A67]">
                  If you receive an incorrect item or an order with quality issues, notify our counter staff immediately at Counter 1 & 2 or contact support within 15 minutes of collection. We will promptly replace your meal or issue a full credit/refund.
                </p>
              </div>
            </div>
          )}

          {/* 2. REFUND POLICY */}
          {activeTab === "refund" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBD4DC]">
                <ShieldCheck className="w-5 h-5 text-[#5F9A68]" />
                <h2 className="text-xl font-bold tracking-tight">Refund Policy</h2>
              </div>
              <p className="text-xs sm:text-sm text-[#735A67]">
                We are committed to fair, fast, and transparent refunds for campus dining.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FBE7EE]/50 border border-[#EBD4DC] space-y-1.5">
                  <span className="font-bold text-xs text-[#C94F78] uppercase tracking-wider block">
                    Online UPI / Card Payments
                  </span>
                  <p className="text-xs text-[#735A67]">
                    For orders paid online via Razorpay, refunds for approved cancellations or kitchen-rejected orders are processed back to the original payment source within <strong>3 to 5 business days</strong> according to standard banking timelines.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] space-y-1.5">
                  <span className="font-bold text-xs text-[#352431] uppercase tracking-wider block">
                    Cash on Delivery (COD)
                  </span>
                  <p className="text-xs text-[#735A67]">
                    Cash is collected only upon handover at the counter. If an unfulfilled COD order is cancelled, no cash is exchanged and your payment balance remains zero.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#352431]">Eligible Refund Scenarios:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#735A67] list-disc pl-5">
                  <li>Order cancelled within the 30-second cancellation window.</li>
                  <li>Order rejected or cancelled by canteen administration due to unexpected stockouts or kitchen emergencies.</li>
                  <li>Confirmed duplicate online payment charges resulting from network retries.</li>
                </ul>
              </div>
            </div>
          )}

          {/* 3. PRIVACY POLICY */}
          {activeTab === "privacy" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBD4DC]">
                <FileText className="w-5 h-5 text-[#C94F78]" />
                <h2 className="text-xl font-bold tracking-tight">Privacy Policy</h2>
              </div>
              <p className="text-xs sm:text-sm text-[#735A67]">
                BellBite respects your personal privacy. This policy outlines how your information is collected, used, and safeguarded when using our campus canteen platform.
              </p>

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#352431]">Information We Collect:</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#735A67] list-disc pl-5">
                  <li>
                    <strong>Account Information:</strong> Student name, email address, and encrypted authentication credentials.
                  </li>
                  <li>
                    <strong>Order Details:</strong> Items ordered, pickup tokens, order timestamp, preparation timing, and payment status.
                  </li>
                  <li>
                    <strong>Payment Data:</strong> All card and UPI transactions are securely handled by PCI-DSS compliant payment gateways (Razorpay). BellBite does not store or process raw bank card numbers or UPI PINs.
                  </li>
                </ul>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#352431]">How We Use Your Information:</h3>
                <p className="text-xs sm:text-sm text-[#735A67]">
                  Your data is used solely to authenticate your session, route orders to kitchen workstations, display live queue statuses, and contact you in the event of an order delay or refund. We never sell or share student data with third-party marketers.
                </p>
              </div>
            </div>
          )}

          {/* 4. DISCLAIMER */}
          {activeTab === "disclaimer" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBD4DC]">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-xl font-bold tracking-tight">Disclaimer</h2>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#352431]">Food Allergen & Ingredient Advisory:</h3>
                <p className="text-xs sm:text-sm text-[#735A67]">
                  Food prepared in our campus kitchens may contain or come into contact with common allergens such as dairy, gluten, nuts, soy, and sesame seeds. If you have severe allergies, please inform kitchen staff directly prior to ordering.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#352431]">Preparation Time Estimates:</h3>
                <p className="text-xs sm:text-sm text-[#735A67]">
                  Kitchen timers and countdown estimates are indicative and calibrated to average kitchen pipeline throughput. During peak campus lunch rushes, actual preparation time may vary slightly. Orders will be marked "Ready for Pickup" when available.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#352431]">Service Availability:</h3>
                <p className="text-xs sm:text-sm text-[#735A67]">
                  Canteen hours, menu availability, and online ordering access are subject to kitchen operational schedules, campus holidays, and inventory supplies.
                </p>
              </div>
            </div>
          )}

          {/* 5. ABOUT & CONTACT */}
          {activeTab === "contact" && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EBD4DC]">
                <Mail className="w-5 h-5 text-[#C94F78]" />
                <h2 className="text-xl font-bold tracking-tight">About & Contact</h2>
              </div>

              <p className="text-xs sm:text-sm text-[#735A67]">
                <strong>BellBite</strong> is the official smart dining portal for the campus canteen, built to eliminate waiting queues and provide freshly prepared food with transparent digital ordering.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FBE7EE]/40 border border-[#EBD4DC] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#352431]">
                    <MapPin className="w-4 h-4 text-[#C94F78]" />
                    <span>Physical Location</span>
                  </div>
                  <p className="text-xs text-[#735A67]">
                    Campus Food Court, Counters 1 & 2<br />
                    Central College Campus
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FBE7EE]/40 border border-[#EBD4DC] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#352431]">
                    <Clock className="w-4 h-4 text-[#C94F78]" />
                    <span>Operating Hours</span>
                  </div>
                  <p className="text-xs text-[#735A67]">
                    Monday – Saturday: 8:00 AM – 7:00 PM<br />
                    Sunday & Holidays: Closed
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EBD4DC] space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#352431]">
                  Need Assistance with an Order?
                </h4>
                <p className="text-xs text-[#735A67]">
                  Our canteen staff and technical support team are ready to assist you:
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#352431]">
                    <Mail className="w-4 h-4 text-[#C94F78]" />
                    <span>support@bellbite.edu</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-[#352431]">
                    <Phone className="w-4 h-4 text-[#5F9A68]" />
                    <span>Counter Helpline: Extension 204</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Policies;
