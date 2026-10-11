import React from "react";

/**
 * ComboStatusBadge
 * Displays combo availability status (independent of component stock).
 * Can function as an interactive toggle if onToggle is provided.
 */
const ComboStatusBadge = ({
  isAvailable,
  onToggle,
  loading = false,
  disabled = false,
}) => {
  if (onToggle) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!loading && !disabled) onToggle();
        }}
        disabled={loading || disabled}
        title={isAvailable ? "Click to disable combo" : "Click to make combo available"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer select-none border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
          isAvailable
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 focus:ring-emerald-400"
            : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC] hover:bg-[#FBE7EE] hover:text-[#352431] focus:ring-[#C94F78]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? "bg-emerald-500 animate-pulse" : "bg-[#927681]"
            }`}
          />
        )}
        <span>{isAvailable ? "Available" : "Unavailable"}</span>
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        isAvailable
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isAvailable ? "bg-emerald-500" : "bg-[#927681]"
        }`}
      />
      <span>{isAvailable ? "Available" : "Unavailable"}</span>
    </span>
  );
};

export default ComboStatusBadge;
