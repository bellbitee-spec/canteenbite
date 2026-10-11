import React from "react";

/**
 * ProductStatusBadge
 * Displays product availability (independent of stock status).
 * Optionally acts as an interactive toggle if onToggle is provided.
 */
const ProductStatusBadge = ({ isAvailable, onToggle, loading = false, disabled = false }) => {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!loading && !disabled) onToggle();
        }}
        disabled={loading || disabled}
        title={isAvailable ? "Click to disable/hide product" : "Click to make available"}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer select-none border ${
          isAvailable
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC] hover:bg-[#FBE7EE]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? "bg-[#5F9A68]" : "bg-[#927681]"
            }`}
          />
        )}
        <span>{isAvailable ? "Available" : "Unavailable"}</span>
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
        isAvailable
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isAvailable ? "bg-[#5F9A68]" : "bg-[#927681]"
        }`}
      />
      <span>{isAvailable ? "Available" : "Unavailable"}</span>
    </span>
  );
};

export default ProductStatusBadge;
