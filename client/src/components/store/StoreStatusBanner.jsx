import React from "react";
import { Link } from "react-router-dom";
import { Clock, AlertTriangle, AlertCircle, Info } from "lucide-react";
import useStore from "../../hooks/useStore";

const formatNextOpening = (isoString) => {
  if (!isoString) return null;
  try {
    const targetDate = new Date(isoString);
    if (isNaN(targetDate.getTime())) return null;

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `Opens at ${timeFormatter.format(targetDate)}`;
  } catch (_) {
    return null;
  }
};

const StoreStatusBanner = () => {
  const { store, loading, error } = useStore();

  if (loading || !store) return null;

  const { isOpen, acceptingOrders, canOrder, reason, nextOpeningAt } = store;
  const nextOpeningFormatted = formatNextOpening(nextOpeningAt);

  // If healthy & open, keep the interface clean (Navbar already shows the green status pill)
  if (isOpen && canOrder) {
    return null;
  }

  // Store Open BUT Orders Paused
  if (isOpen && !acceptingOrders) {
    return (
      <div
        className="w-full bg-amber-50 border border-amber-200/80 text-amber-900 py-2 px-3.5 rounded-2xl mb-4 text-xs font-semibold flex items-center justify-between shadow-2xs"
        role="status"
        aria-label="Canteen open but ordering is paused"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>
            Ordering temporarily paused — {reason || "Kitchen is completing orders in progress."}
          </span>
        </div>
        <span className="text-[11px] text-amber-700 hidden sm:inline font-bold">
          Menu browsing available
        </span>
      </div>
    );
  }

  // Store Closed
  return (
    <div
      className="w-full bg-rose-50 border border-rose-200/80 text-rose-900 py-2.5 px-4 rounded-2xl mb-4 text-xs font-semibold flex items-center justify-between shadow-2xs"
      role="status"
      aria-label="Canteen currently closed"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500" />
        <span>
          Canteen is currently closed. {nextOpeningFormatted ? nextOpeningFormatted : "Check back tomorrow!"}
        </span>
      </div>
      <Link
        to="/store-closed"
        className="text-[11px] text-rose-700 font-extrabold hover:underline"
      >
        Operating Hours →
      </Link>
    </div>
  );
};

export default StoreStatusBanner;
