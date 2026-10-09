import React from "react";
import { Link } from "react-router-dom";
import {
  DoorClosed,
  PauseCircle,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  Info,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useStore from "../hooks/useStore";
import useCart from "../hooks/useCart";

const formatNextOpeningTime = (isoString) => {
  if (!isoString) return null;
  try {
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return null;

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return formatter.format(targetDate);
  } catch (_) {
    return null;
  }
};

const StoreClosed = () => {
  const { store, loading } = useStore();
  const { itemCount } = useCart();

  const isPaused = store?.isOpen && !store?.canOrder;
  const reasonText = store?.reason || store?.temporaryClosedReason;
  const nextOpeningFormatted = formatNextOpeningTime(store?.nextOpeningAt);

  return (
    <PageContainer>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-xl mx-auto">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-elevated border ${
            isPaused
              ? "bg-amber-50 text-amber-600 border-amber-200"
              : "bg-rose-50 text-rose-600 border-rose-200"
          }`}
        >
          {isPaused ? (
            <PauseCircle className="w-10 h-10 stroke-[2]" />
          ) : (
            <DoorClosed className="w-10 h-10 stroke-[2]" />
          )}
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {isPaused ? "Ordering Temporarily Paused" : "Canteen Currently Closed"}
        </h1>

        {/* Dynamic Reason */}
        {reasonText ? (
          <div className="mt-4 p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium leading-relaxed max-w-md text-left">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
              <Info className="w-4 h-4 text-brand-500" />
              <span>Notice from Canteen Staff</span>
            </div>
            <p className="text-slate-600 pl-5">{reasonText}</p>
          </div>
        ) : (
          <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-md">
            Our campus kitchen is currently closed or preparing for the next meal shift.
          </p>
        )}

        {/* Next Opening / Hours Information */}
        <div className="mt-6 w-full max-w-md bg-white rounded-2xl border border-slate-200/80 p-4 text-xs text-slate-600 space-y-2 shadow-subtle text-left">
          {nextOpeningFormatted && (
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-500" />
                <span>Next Opening:</span>
              </span>
              <span className="font-bold text-brand-600 text-xs sm:text-sm">{nextOpeningFormatted}</span>
            </div>
          )}

          {store?.openingTime && store?.closingTime && (
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-500 font-semibold">Standard Scheduled Hours:</span>
              <span className="font-semibold text-slate-800">
                {store.openingTime} – {store.closingTime}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center py-1.5 border-t border-slate-100">
            <span className="text-slate-500 font-semibold">Timezone:</span>
            <span className="font-mono text-slate-500">{store?.timezone || "Asia/Kolkata (IST)"}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs sm:text-sm shadow-elevated shadow-brand-500/20 active:scale-95 transition-all inline-flex items-center justify-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Browse Menu</span>
          </Link>

          {itemCount > 0 && (
            <Link
              to="/cart"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 active:scale-95 transition-all inline-flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View Saved Cart ({itemCount})</span>
            </Link>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-400 font-medium max-w-sm">
          You can continue exploring items and saving your cart. Orders will reopen once the canteen resumes operations.
        </p>
      </div>
    </PageContainer>
  );
};

export default StoreClosed;
