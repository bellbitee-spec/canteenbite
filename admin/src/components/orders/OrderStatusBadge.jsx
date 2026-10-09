import React from "react";

export const STATUS_CONFIG = {
  PENDING: {
    label: "New Order",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    textColor: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    dotColor: "bg-sky-400",
  },
  PREPARING: {
    label: "Preparing",
    textColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    dotColor: "bg-indigo-400 animate-ping",
  },
  DELAYED: {
    label: "Delayed",
    textColor: "text-rose-400 font-bold",
    bgColor: "bg-rose-500/15",
    borderColor: "border-rose-500/30",
    dotColor: "bg-rose-500",
  },
  READY: {
    label: "Ready for Pickup",
    textColor: "text-emerald-400 font-bold",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
    dotColor: "bg-emerald-400",
  },
  COMPLETED: {
    label: "Completed",
    textColor: "text-emerald-300",
    bgColor: "bg-emerald-950/40",
    borderColor: "border-emerald-800/40",
    dotColor: "bg-emerald-500",
  },
  CANCELLED: {
    label: "Cancelled",
    textColor: "text-slate-400",
    bgColor: "bg-slate-800/50",
    borderColor: "border-slate-700/50",
    dotColor: "bg-slate-500",
  },
};

const OrderStatusBadge = ({ status, size = "md", pulse = false }) => {
  const normStatus = (status || "").toUpperCase();
  const config = STATUS_CONFIG[normStatus] || {
    label: normStatus || "Unknown",
    textColor: "text-slate-300",
    bgColor: "bg-slate-800",
    borderColor: "border-slate-700",
    dotColor: "bg-slate-400",
  };

  const isPreparing = normStatus === "PREPARING";
  const isDelayed = normStatus === "DELAYED";

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1.5"
      : size === "lg"
      ? "px-3.5 py-1.5 text-sm gap-2"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses} ${
        isDelayed ? "ring-1 ring-rose-500/30" : ""
      }`}
    >
      <span className="relative flex h-2 w-2">
        {(pulse || isPreparing || isDelayed) && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`}
        />
      </span>
      <span>{config.label}</span>
    </span>
  );
};

export default OrderStatusBadge;
