import React from "react";

export const STATUS_CONFIG = {
  PENDING: {
    label: "New Order",
    textColor: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    textColor: "text-sky-800",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    dotColor: "bg-sky-500",
  },
  PREPARING: {
    label: "Preparing",
    textColor: "text-[#C94F78] font-bold",
    bgColor: "bg-[#FBE7EE]",
    borderColor: "border-[#EBD4DC]",
    dotColor: "bg-[#C94F78]",
  },
  DELAYED: {
    label: "Delayed",
    textColor: "text-rose-800 font-bold",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    dotColor: "bg-rose-500",
  },
  READY: {
    label: "Ready for Pickup",
    textColor: "text-[#5F9A68] font-bold",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    dotColor: "bg-[#5F9A68]",
  },
  COMPLETED: {
    label: "Completed",
    textColor: "text-emerald-800",
    bgColor: "bg-emerald-50/60",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    textColor: "text-[#735A67]",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-200",
    dotColor: "bg-slate-400",
  },
};

const OrderStatusBadge = ({ status, size = "md", pulse = false }) => {
  const normStatus = (status || "").toUpperCase();
  const config = STATUS_CONFIG[normStatus] || {
    label: normStatus || "Unknown",
    textColor: "text-[#735A67]",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
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
      className={`inline-flex items-center rounded-full border font-semibold ${config.bgColor} ${config.borderColor} ${config.textColor} ${sizeClasses} ${
        isDelayed ? "ring-1 ring-rose-400/40" : ""
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
