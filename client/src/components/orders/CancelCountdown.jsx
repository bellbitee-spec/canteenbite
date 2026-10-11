import React, { useState, useEffect, useRef } from "react";
import { Clock, AlertTriangle, X, Loader2 } from "lucide-react";

/**
 * Format remaining seconds into MM:SS (e.g. 00:24)
 */
const formatTimeDisplay = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

/**
 * CancelCountdown
 * Visual countdown based strictly on backend cancelUntil timestamp.
 * Displays countdown timer and triggers confirmation dialog before calling cancel.
 */
const CancelCountdown = ({
  order,
  onCancelConfirm,
  isCancelling = false,
  onWindowExpired,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    if (!order?.cancelUntil || !order?.cancellationWindowOpen) return 0;
    const diffMs = new Date(order.cancelUntil).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  });

  const onWindowExpiredRef = useRef(onWindowExpired);
  useEffect(() => {
    onWindowExpiredRef.current = onWindowExpired;
  }, [onWindowExpired]);

  useEffect(() => {
    if (!order?.cancelUntil || !order?.cancellationWindowOpen) {
      setRemainingSeconds(0);
      return;
    }

    const cancelUntilMs = new Date(order.cancelUntil).getTime();

    // Calculate initial remaining
    const initialDiff = cancelUntilMs - Date.now();
    if (initialDiff <= 0) {
      setRemainingSeconds(0);
      if (onWindowExpiredRef.current) onWindowExpiredRef.current();
      return;
    }

    setRemainingSeconds(Math.floor(initialDiff / 1000));

    // Tick every 1000ms
    const interval = setInterval(() => {
      const currentDiff = cancelUntilMs - Date.now();
      // Strict deadline: at currentTime >= cancelUntil, disable
      if (currentDiff <= 0) {
        setRemainingSeconds(0);
        clearInterval(interval);
        setShowConfirmModal(false); // Close dialog if open
        if (onWindowExpiredRef.current) onWindowExpiredRef.current();
      } else {
        setRemainingSeconds(Math.floor(currentDiff / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order?.cancelUntil, order?.cancellationWindowOpen]);

  // Window closed or expired
  if (
    !order?.cancellationWindowOpen ||
    remainingSeconds <= 0 ||
    order?.orderStatus === "CANCELLED" ||
    order?.orderStatus === "COMPLETED"
  ) {
    return null;
  }

  const handleOpenModal = () => {
    if (remainingSeconds > 0 && !isCancelling) {
      setShowConfirmModal(true);
    }
  };

  const handleCloseModal = () => {
    if (!isCancelling) {
      setShowConfirmModal(false);
    }
  };

  const handleConfirm = () => {
    if (remainingSeconds > 0 && !isCancelling) {
      setShowConfirmModal(false);
      onCancelConfirm();
    }
  };

  // 30 seconds is the standard window; compute percentage remaining
  const percentageRemaining = Math.min(100, Math.max(0, (remainingSeconds / 30) * 100));

  return (
    <>
      {/* Cancellation Banner Card */}
      <div className="bg-[#FBE7EE]/60 border border-[#EBD4DC] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#C94F78] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#352431] uppercase tracking-wider">
                Order Cancellation Window
              </span>
              <span className="font-mono font-bold text-[#C94F78] bg-white border border-[#EBD4DC] px-2 py-0.5 rounded-md text-xs">
                {formatTimeDisplay(remainingSeconds)}
              </span>
            </div>
            <p className="text-xs text-[#735A67] font-medium mt-0.5">
              You have <span className="font-bold text-[#352431]">{remainingSeconds}s</span> left to cancel this order if placed by mistake.
            </p>
            {/* Visual countdown progress line */}
            <div className="w-full bg-[#EBD4DC] rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#C94F78] h-1.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${percentageRemaining}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          disabled={isCancelling || remainingSeconds <= 0}
          className="w-full sm:w-auto px-4 py-2.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] active:scale-95 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label={`Cancel order. You have ${remainingSeconds} seconds left`}
        >
          {isCancelling ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Cancelling...</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              <span>Cancel Order ({remainingSeconds}s)</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#352431]/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#EBD4DC] space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3
                id="cancel-dialog-title"
                className="text-lg font-bold text-[#352431] tracking-tight"
              >
                Cancel this order?
              </h3>
              <p className="text-xs text-[#735A67] font-medium leading-relaxed">
                You can only cancel during the remaining cancellation window. The kitchen has not yet started preparing your meal.
              </p>
              <div className="pt-1 font-mono font-bold text-[#C94F78] text-sm">
                Time remaining: {formatTimeDisplay(remainingSeconds)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isCancelling}
                className="py-2.5 px-4 rounded-full border border-[#EBD4DC] text-[#352431] hover:bg-[#FBE7EE]/50 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Keep Order
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isCancelling || remainingSeconds <= 0}
                className="py-2.5 px-4 rounded-full bg-[#C94F78] hover:bg-[#B33D65] active:scale-95 text-white font-bold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CancelCountdown;
