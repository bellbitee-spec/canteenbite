import React from "react";
import { CreditCard, Banknote, ShieldCheck } from "lucide-react";

/**
 * PaymentMethod Component
 * Provides payment option selection (Cash at Counter or Online via Razorpay)
 * with accessible radio inputs and informational notices.
 */
const PaymentMethod = ({
  selectedMethod = "CASH",
  onSelectMethod,
  disabled = false,
  className = "",
}) => {
  return (
    <div className={`bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-card space-y-4 ${className}`}>
      <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-brand-500" />
        <span>Select Payment Method</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Cash on Counter Option */}
        <label
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${
            selectedMethod === "CASH"
              ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="CASH"
            disabled={disabled}
            checked={selectedMethod === "CASH"}
            onChange={(e) => onSelectMethod(e.target.value)}
            className="mt-1 text-brand-600 focus:ring-brand-500 h-4 w-4"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-slate-700" />
              <span className="font-black text-sm text-slate-900">
                Cash at Counter
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium leading-relaxed block">
              Pay cash directly at the canteen pickup counter when collecting your meal.
            </span>
          </div>
        </label>

        {/* Online Payment Option */}
        <label
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${
            selectedMethod === "ONLINE"
              ? "border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500/20"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="ONLINE"
            disabled={disabled}
            checked={selectedMethod === "ONLINE"}
            onChange={(e) => onSelectMethod(e.target.value)}
            className="mt-1 text-brand-600 focus:ring-brand-500 h-4 w-4"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CreditCard className="w-4 h-4 text-brand-600" />
              <span className="font-black text-sm text-slate-900">
                Online Payment
              </span>
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                Instant
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium leading-relaxed block">
              Pay securely via UPI (Google Pay, PhonePe, Paytm), Cards, or NetBanking.
            </span>
          </div>
        </label>
      </div>

      {selectedMethod === "ONLINE" && (
        <div className="text-[11px] text-brand-900 bg-brand-50 p-3.5 rounded-2xl border border-brand-200/80 font-medium leading-relaxed space-y-1 animate-fade-in">
          <div className="flex items-center gap-1.5 font-black text-brand-950">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Secure Payment via Razorpay Gateway</span>
          </div>
          <p className="text-brand-800 text-[11px]">
            Direct token generation upon verification. Cancel within 30 seconds for immediate refund processing.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentMethod;
