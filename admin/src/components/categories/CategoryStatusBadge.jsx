import React from "react";

/**
 * CategoryStatusBadge
 * Displays category active/inactive status.
 * Can function as an interactive quick-toggle if onToggle is provided.
 */
const CategoryStatusBadge = ({
  isActive,
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
        title={isActive ? "Click to deactivate category" : "Click to activate category"}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer select-none border ${
          isActive
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC] hover:bg-[#FBE7EE]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <div className="w-2.5 h-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? "bg-[#5F9A68]" : "bg-[#927681]"
            }`}
          />
        )}
        <span>{isActive ? "Active" : "Inactive"}</span>
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-[#FFF9F2] text-[#735A67] border-[#EBD4DC]"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-[#5F9A68]" : "bg-[#927681]"
        }`}
      />
      <span>{isActive ? "Active" : "Inactive"}</span>
    </span>
  );
};

export default CategoryStatusBadge;
