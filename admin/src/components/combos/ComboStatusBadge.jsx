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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer select-none border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          isAvailable
            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 focus:ring-emerald-500"
            : "bg-slate-800 text-slate-400 border-slate-750 hover:bg-slate-750 hover:text-slate-300 focus:ring-slate-500"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
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
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          : "bg-slate-800 text-slate-400 border-slate-750"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isAvailable ? "bg-emerald-400" : "bg-slate-500"
        }`}
      />
      <span>{isAvailable ? "Available" : "Unavailable"}</span>
    </span>
  );
};

export default ComboStatusBadge;
