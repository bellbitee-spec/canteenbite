import React from "react";
import { CreditCard, Banknote, ShieldCheck } from "lucide-react";

/**
 * PaymentMethod Component
 * Provides payment option selection: Cash on Delivery (COD) / Cash at Counter or Online via Razorpay
 * with accessible radio inputs and informational notices.
 */
const PaymentMethod = ({
  selectedMethod = "COD",
  onSelectMethod,
  disabled = false,
  className = "",
}) => {
  const isCodSelected = selectedMethod === "COD" || selectedMethod === "CASH";

  return (
    <div className={`bg-white rounded-3xl border border-[#EBD4DC] p-5 sm:p-6 shadow-sm space-y-4 ${className}`}>
      <h2 className="text-base font-bold text-[#352431] tracking-tight flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-[#C94F78]" />
        <span>Select Payment Method</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Cash on Delivery (COD) / Cash at Counter Option */}
        <label
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${
            isCodSelected
              ? "border-[#C94F78] bg-[#FBE7EE]/50 shadow-xs ring-1 ring-[#C94F78]/20"
              : "border-[#EBD4DC] hover:border-[#C94F78]/50 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="COD"
            disabled={disabled}
            checked={isCodSelected}
            onChange={(e) => onSelectMethod(e.target.value)}
            className="mt-1 text-[#C94F78] focus:ring-[#C94F78] h-4 w-4"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Banknote className="w-4 h-4 text-[#735A67]" />
              <span className="font-bold text-sm text-[#352431]">
                Cash on Delivery (COD)
              </span>
              <span className="text-[9px] font-bold uppercase text-[#735A67] bg-[#FFF9F2] border border-[#EBD4DC] px-1.5 py-0.5 rounded-md">
                Counter
              </span>
            </div>
            <span className="text-[11px] text-[#735A67] font-medium leading-relaxed block">
              Pay cash at the canteen counter when collecting your meal. No online gateway required.
            </span>
          </div>
        </label>

        {/* Online Payment Option */}
        <label
          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
            disabled ? "opacity-60 cursor-not-allowed" : ""
          } ${
            selectedMethod === "ONLINE"
              ? "border-[#C94F78] bg-[#FBE7EE]/50 shadow-xs ring-1 ring-[#C94F78]/20"
              : "border-[#EBD4DC] hover:border-[#C94F78]/50 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value="ONLINE"
            disabled={disabled}
            checked={selectedMethod === "ONLINE"}
            onChange={(e) => onSelectMethod(e.target.value)}
            className="mt-1 text-[#C94F78] focus:ring-[#C94F78] h-4 w-4"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CreditCard className="w-4 h-4 text-[#C94F78]" />
              <span className="font-bold text-sm text-[#352431]">
                Online Payment
              </span>
              <span className="text-[9px] font-bold uppercase text-[#5F9A68] bg-[#FBE7EE] border border-[#EBD4DC] px-1.5 py-0.5 rounded-md">
                Instant
              </span>
            </div>
            <span className="text-[11px] text-[#735A67] font-medium leading-relaxed block">
              Pay securely via UPI (Google Pay, PhonePe, Paytm), Cards, or NetBanking.
            </span>
          </div>
        </label>
      </div>

      {selectedMethod === "ONLINE" && (
        <div className="text-[11px] text-[#352431] bg-[#FBE7EE]/60 p-3.5 rounded-2xl border border-[#EBD4DC] font-medium leading-relaxed space-y-1 animate-fade-in">
          <div className="flex items-center gap-1.5 font-bold text-[#352431]">
            <ShieldCheck className="w-4 h-4 text-[#C94F78]" />
            <span>Secure Payment via Razorpay Gateway</span>
          </div>
          <p className="text-[#735A67] text-[11px]">
            Direct token generation upon verification. Cancel within 30 seconds for immediate refund processing.
          </p>
        </div>
      )}

      {isCodSelected && (
        <div className="text-[11px] text-[#352431] bg-[#FFF9F2] p-3.5 rounded-2xl border border-[#EBD4DC] font-medium leading-relaxed space-y-1 animate-fade-in">
          <div className="flex items-center gap-1.5 font-bold text-[#352431]">
            <Banknote className="w-4 h-4 text-[#5F9A68]" />
            <span>Cash on Delivery / Pickup</span>
          </div>
          <p className="text-[#735A67] text-[11px]">
            Your order will be queued immediately in the kitchen. Keep the exact cash amount ready at pickup.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentMethod;
