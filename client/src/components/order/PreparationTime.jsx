import React, { useState, useEffect, useMemo } from "react";
import { Clock, Utensils, AlertCircle, CheckCircle2, Flame, Sparkles } from "lucide-react";

/**
 * Format remaining seconds into MM:SS display
 */
const formatMMSS = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Format expected clock time e.g. "3:45 PM"
 */
const formatClockTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (_) {
    return null;
  }
};

/**
 * Live Preparation Timer Synchronization Component
 *
 * Persisted server-side timestamps serve as the authoritative single source of truth.
 * Countdown derives mathematically from (estimatedReadyAt - now).
 * Refreshing or switching devices preserves countdown accuracy.
 * Never auto-marks order as ready upon expiry.
 */
const PreparationTime = ({ order, className = "" }) => {
  if (!order) return null;

  const orderStatus = (order.orderStatus || "PENDING").toUpperCase();
  const readyTimestamp = order.estimatedReadyAt || order.expectedReadyAt;
  const createdAtTimestamp = order.createdAt;

  // Server clock skew offset calculation (if serverTime provided)
  const clockSkewMs = useMemo(() => {
    if (!order.serverTime) return 0;
    const serverMs = new Date(order.serverTime).getTime();
    if (isNaN(serverMs)) return 0;
    return serverMs - Date.now();
  }, [order.serverTime]);

  const calculateRemainingSeconds = () => {
    if (!readyTimestamp) {
      const fallbackMinutes = order.estimatedPreparationMinutes || order.estimatedPreparationTime || 15;
      const createdMs = createdAtTimestamp ? new Date(createdAtTimestamp).getTime() : Date.now();
      const targetMs = createdMs + fallbackMinutes * 60 * 1000;
      return Math.floor((targetMs - (Date.now() + clockSkewMs)) / 1000);
    }
    const targetMs = new Date(readyTimestamp).getTime();
    if (isNaN(targetMs)) return 0;
    return Math.floor((targetMs - (Date.now() + clockSkewMs)) / 1000);
  };

  const [remainingSeconds, setRemainingSeconds] = useState(calculateRemainingSeconds);

  useEffect(() => {
    // Recompute immediately on timestamp / order changes
    setRemainingSeconds(calculateRemainingSeconds());

    // Do not run countdown interval for terminal states
    if (orderStatus === "READY" || orderStatus === "COMPLETED" || orderStatus === "CANCELLED") {
      return;
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds());
    }, 1000);

    return () => clearInterval(intervalId);
  }, [readyTimestamp, createdAtTimestamp, orderStatus, clockSkewMs]);

  // Terminal State 1: READY
  if (orderStatus === "READY") {
    return (
      <div className={`p-4 rounded-2xl bg-[#5F9A68]/15 border border-[#5F9A68]/30 text-[#352431] space-y-1.5 ${className}`}>
        <div className="flex items-center gap-2 font-bold text-sm text-[#5F9A68]">
          <CheckCircle2 className="w-5 h-5 text-[#5F9A68] shrink-0" />
          <span>Your Meal is Ready for Pickup!</span>
        </div>
        <p className="text-xs text-[#735A67] font-medium pl-7">
          Hot & freshly packed! Head to the canteen counter and show your order ID to collect.
        </p>
      </div>
    );
  }

  // Terminal State 2: COMPLETED
  if (orderStatus === "COMPLETED") {
    return (
      <div className={`p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-[#5F9A68] shrink-0" />
        <span>Order completed & handed over. Enjoy your food!</span>
      </div>
    );
  }

  // Terminal State 3: CANCELLED
  if (orderStatus === "CANCELLED") {
    return null;
  }

  // Active States: PENDING | CONFIRMED | PREPARING | DELAYED
  const totalDurationMinutes =
    order.estimatedPreparationMinutes || order.estimatedPreparationTime || 15;
  const totalDurationSeconds = totalDurationMinutes * 60;
  const isOverdue = remainingSeconds <= 0;
  const expectedClock = formatClockTime(readyTimestamp);

  // Compute progress percentage (0 to 100)
  const elapsedSeconds = Math.max(0, totalDurationSeconds - remainingSeconds);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalDurationSeconds) * 100));

  return (
    <div className={`p-4 sm:p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-xs space-y-3.5 ${className}`}>
      {/* Top Banner: Status Tag & Estimated Target */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center font-bold text-sm border border-[#EBD4DC]/80 shrink-0">
            {orderStatus === "PREPARING" ? (
              <Flame className="w-5 h-5 animate-pulse text-[#C94F78]" />
            ) : (
              <Utensils className="w-4 h-4 text-[#C94F78]" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#927681] block">
              {orderStatus === "PREPARING"
                ? "Kitchen Cooking in Progress"
                : orderStatus === "DELAYED"
                ? "Kitchen Rush in Progress"
                : "Kitchen Order Estimate"}
            </span>
            <span className="font-bold text-sm text-[#352431]">
              {orderStatus === "PREPARING"
                ? "Chefs are actively preparing your meal"
                : orderStatus === "DELAYED"
                ? "Kitchen is running behind schedule"
                : "Awaiting preparation start"}
            </span>
          </div>
        </div>

        {expectedClock && (
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#927681] block">
              Expected Ready
            </span>
            <span className="font-mono font-bold text-xs text-[#352431] bg-[#FFF9F2] px-2 py-0.5 rounded-lg border border-[#EBD4DC] inline-block">
              {expectedClock}
            </span>
          </div>
        )}
      </div>

      {/* Center Countdown Display */}
      <div className="bg-[#FFF9F2] rounded-2xl p-4 border border-[#EBD4DC] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span className="text-xs font-bold text-[#735A67] block">
            Remaining Preparation Time
          </span>
          {isOverdue ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-base sm:text-lg text-amber-700">
                Taking longer than expected
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-black text-2xl sm:text-3xl text-[#C94F78] tracking-tight">
                {formatMMSS(remainingSeconds)}
              </span>
              <span className="text-xs font-bold text-[#735A67]">
                ({Math.ceil(remainingSeconds / 60)} min{Math.ceil(remainingSeconds / 60) === 1 ? "" : "s"} left)
              </span>
            </div>
          )}
        </div>

        <div className="text-xs text-[#735A67] font-medium max-w-xs text-center sm:text-right">
          {isOverdue ? (
            <p className="text-amber-800 text-[11px] font-semibold bg-amber-50 p-2 rounded-xl border border-amber-200">
              Kitchen is taking a little extra care with your order. We appreciate your patience!
            </p>
          ) : (
            <p className="text-[11px]">
              Total estimate: <span className="font-bold text-[#352431]">{totalDurationMinutes} mins</span>. Timer updates in real-time if canteen staff adjusts duration.
            </p>
          )}
        </div>
      </div>

      {/* Continuous Progress Bar */}
      {!isOverdue && (
        <div className="space-y-1">
          <div className="w-full bg-[#FBE7EE] rounded-full h-2 overflow-hidden border border-[#EBD4DC]/60">
            <div
              className="bg-gradient-to-r from-[#C94F78] to-[#E582A5] h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparationTime;
