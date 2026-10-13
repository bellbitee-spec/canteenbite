import React, { useEffect } from "react";
import { getThumbnailUrl } from "../../utils/imageUtils";

/**
 * DeleteComboModal
 * Confirmation modal for soft-disabling a combo meal.
 */
const DeleteComboModal = ({
  isOpen,
  combo,
  onClose,
  onConfirm,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !combo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-combo-title"
    >
      {/* Backdrop click */}
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div className="relative w-full max-w-md bg-white border border-[#EBD4DC] rounded-3xl p-6 shadow-2xl z-10">
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-[#C94F78] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 id="disable-combo-title" className="text-lg font-bold text-[#352431] tracking-tight">
              Disable this combo?
            </h3>
            <p className="text-xs text-[#735A67]">
              Soft disable action
            </p>
          </div>
        </div>

        {/* Combo summary card */}
        <div className="mb-4 p-3.5 bg-[#FFF9F2] rounded-2xl border border-[#EBD4DC] flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#EBD4DC]">
            {combo.image ? (
              <img
                src={getThumbnailUrl(combo.image, 96)}
                alt={combo.name}
                width="48"
                height="48"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23927681' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'/%3E%3C/svg%3E";
                  e.currentTarget.className = "w-6 h-6 m-auto object-contain";
                }}
              />
            ) : (
              <svg className="w-6 h-6 text-[#927681]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[#352431] truncate">{combo.name}</h4>
            <p className="text-xs text-[#735A67]">
              {combo.items?.length || 0} products • ₹{combo.price}
            </p>
          </div>
        </div>

        <p className="text-sm text-[#735A67] mb-6 leading-relaxed">
          This will hide the combo from students. Existing historical orders will not be changed.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] border border-[#EBD4DC] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sakura-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Disabling...</span>
              </>
            ) : (
              <span>Disable Combo</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteComboModal;
