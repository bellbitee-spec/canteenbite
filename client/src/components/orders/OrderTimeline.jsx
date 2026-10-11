import React from "react";
import {
  Check,
  X,
  Clock,
  UtensilsCrossed,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const formatStepTime = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch (_) {
    return null;
  }
};

/**
 * OrderStatusTimeline
 * Visually renders order progression matching authoritative backend states.
 * Respects: PENDING, CONFIRMED, PREPARING, DELAYED, READY, COMPLETED, CANCELLED
 */
const OrderTimeline = ({ order }) => {
  if (!order) return null;

  const currentStatus = order.orderStatus || "PENDING";

  // Build steps array based on status branch
  let steps = [];

  if (currentStatus === "CANCELLED") {
    steps = [
      {
        key: "PLACED",
        label: "Order received",
        subtitle: "Order registered with canteen queue",
        time: formatStepTime(order.createdAt),
        state: "completed",
        iconType: "check",
      },
      {
        key: "CANCELLED",
        label: "Order cancelled",
        subtitle:
          order.cancelledBy === "ADMIN"
            ? "Cancelled by canteen staff"
            : "Cancelled by student",
        time: formatStepTime(order.cancelledAt),
        state: "cancelled",
        iconType: "cancelled",
      },
    ];
  } else if (currentStatus === "DELAYED") {
    steps = [
      {
        key: "PLACED",
        label: "Order received",
        subtitle: "Order placed in kitchen queue",
        time: formatStepTime(order.createdAt),
        state: "completed",
        iconType: "check",
      },
      {
        key: "CONFIRMED",
        label: "Order confirmed",
        subtitle: "Accepted by canteen staff",
        time: null, // Backend does not generate separate confirmedAt timestamp
        state: "completed",
        iconType: "check",
      },
      {
        key: "PREPARING",
        label: "Being prepared",
        subtitle: "Kitchen preparation underway",
        time: formatStepTime(order.preparationStartedAt),
        state: "completed",
        iconType: "check",
      },
      {
        key: "DELAYED",
        label: "Order running late",
        subtitle: "Kitchen is working through a rush",
        time: formatStepTime(order.delayedAt),
        state: "active-delayed",
        iconType: "delayed",
      },
      {
        key: "READY",
        label: "Ready for pickup",
        subtitle: "Collect at canteen counter",
        time: null,
        state: "upcoming",
        stepNumber: "4",
      },
      {
        key: "COMPLETED",
        label: "Completed",
        subtitle: "Handed over to student",
        time: null,
        state: "upcoming",
        stepNumber: "5",
      },
    ];
  } else {
    // Standard normal lifecycle
    const statusOrder = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
    const currentIndex = statusOrder.indexOf(currentStatus);

    steps = [
      {
        key: "PENDING",
        label: "Order received",
        subtitle: "Order registered in kitchen queue",
        time: formatStepTime(order.createdAt),
        state:
          currentIndex > 0
            ? "completed"
            : currentIndex === 0
            ? "current"
            : "upcoming",
        iconType: currentIndex > 0 ? "check" : undefined,
        stepNumber: "1",
      },
      {
        key: "CONFIRMED",
        label: "Order confirmed",
        subtitle: "Accepted by canteen staff",
        time: null,
        state:
          currentIndex > 1
            ? "completed"
            : currentIndex === 1
            ? "current"
            : "upcoming",
        iconType: currentIndex > 1 ? "check" : undefined,
        stepNumber: "2",
      },
      {
        key: "PREPARING",
        label: "Being prepared",
        subtitle: "Kitchen preparation underway",
        time: formatStepTime(order.preparationStartedAt),
        state:
          currentIndex > 2
            ? "completed"
            : currentIndex === 2
            ? "current"
            : "upcoming",
        iconType: currentIndex > 2 ? "check" : undefined,
        stepNumber: "3",
      },
      {
        key: "READY",
        label: "Ready for pickup",
        subtitle: "Collect at canteen counter",
        time: formatStepTime(order.readyAt),
        state:
          currentIndex > 3
            ? "completed"
            : currentIndex === 3
            ? "current"
            : "upcoming",
        iconType: currentIndex > 3 ? "check" : undefined,
        stepNumber: "4",
      },
      {
        key: "COMPLETED",
        label: "Completed",
        subtitle: "Handed over to student",
        time: formatStepTime(order.completedAt),
        state: currentIndex === 4 ? "completed" : "upcoming",
        iconType: currentIndex === 4 ? "check" : undefined,
        stepNumber: "5",
      },
    ];
  }

  const renderIcon = (step) => {
    if (step.iconType === "check") {
      return <Check className="w-4 h-4 stroke-[3]" />;
    }
    if (step.iconType === "cancelled") {
      return <X className="w-4 h-4 stroke-[3]" />;
    }
    if (step.iconType === "delayed") {
      return <Clock className="w-4 h-4 stroke-[2.5]" />;
    }
    if (step.state === "current") {
      return <span className="inline-block w-2.5 h-2.5 rounded-full bg-white animate-ping" />;
    }
    return <span className="font-mono text-xs font-bold">{step.stepNumber}</span>;
  };

  return (
    <div className="py-2" aria-label="Order Status Timeline">
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;

          let badgeClasses =
            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-2xs";
          let lineClasses = "w-0.5 grow mt-1 mb-1 transition-colors";
          let titleClasses = "text-sm font-extrabold";
          let subtitleClasses = "text-xs font-medium";

          if (step.state === "completed") {
            badgeClasses += " bg-[#5F9A68] text-white shadow-[#5F9A68]/20";
            lineClasses += " bg-[#5F9A68]/60";
            titleClasses += " text-[#352431]";
            subtitleClasses += " text-[#735A67]";
          } else if (step.state === "current") {
            badgeClasses +=
              " bg-[#C94F78] text-white ring-4 ring-[#FBE7EE] animate-pulse shadow-[#C94F78]/20";
            lineClasses += " bg-[#EBD4DC]";
            titleClasses += " text-[#C94F78]";
            subtitleClasses += " text-[#735A67]";
          } else if (step.state === "active-delayed") {
            badgeClasses +=
              " bg-amber-600 text-white ring-4 ring-amber-200 animate-pulse";
            lineClasses += " bg-[#EBD4DC]";
            titleClasses += " text-amber-900";
            subtitleClasses += " text-amber-800 font-semibold";
          } else if (step.state === "cancelled") {
            badgeClasses += " bg-rose-500 text-white shadow-rose-500/20";
            lineClasses += " bg-rose-200";
            titleClasses += " text-rose-900";
            subtitleClasses += " text-rose-700";
          } else {
            // upcoming
            badgeClasses += " bg-[#FBE7EE]/50 text-[#927681] border border-[#EBD4DC]";
            lineClasses += " bg-[#EBD4DC]/60";
            titleClasses += " text-[#927681] font-bold";
            subtitleClasses += " text-[#927681]";
          }

          return (
            <div key={step.key} className="flex items-start gap-3.5">
              {/* Step indicator column with vertical connecting line */}
              <div className="flex flex-col items-center self-stretch">
                <div className={badgeClasses} aria-hidden="true">
                  {renderIcon(step)}
                </div>
                {!isLast && <div className={lineClasses} aria-hidden="true" />}
              </div>

              {/* Step details column */}
              <div className="pb-3 grow flex items-start justify-between gap-2">
                <div>
                  <h4 className={titleClasses}>{step.label}</h4>
                  <p className={subtitleClasses}>{step.subtitle}</p>
                </div>

                {step.time && (
                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{step.time}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
