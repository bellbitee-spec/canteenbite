import React, { useEffect } from "react";
import { getThumbnailUrl } from "../../utils/imageUtils";

/**
 * DeleteProductModal
 * Confirmation modal for soft-disabling a product.
 */
const DeleteProductModal = ({ isOpen, product, onClose, onConfirm, loading = false }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !product) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disable-product-title"
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
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 id="disable-product-title" className="text-lg font-bold text-[#352431] tracking-tight">
              Disable product?
            </h3>
            <p className="text-xs text-[#735A67]">
              Soft disable action
            </p>
          </div>
        </div>

        {/* Product summary card */}
        <div className="mb-4 p-3 bg-[#FFF9F2] rounded-2xl border border-[#EBD4DC] flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#EBD4DC]">
            {product.image ? (
              <img
                src={getThumbnailUrl(product.image, 96)}
                alt={product.name}
                width="48"
                height="48"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23927681' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'/%3E%3C/svg%3E";
                  e.currentTarget.className = "w-6 h-6 m-auto object-contain";
                }}
              />
            ) : (
              <svg className="w-6 h-6 text-[#927681]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[#352431] truncate">{product.name}</h4>
            <p className="text-xs text-[#735A67]">
              {product.category?.name || "Uncategorized"} • ₹{product.price}
            </p>
          </div>
        </div>

        <p className="text-sm text-[#735A67] mb-6 leading-relaxed">
          This will hide the product from students. Existing historical orders will not be changed.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-[#EBD4DC] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] text-sm font-medium transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Disabling...</span>
              </>
            ) : (
              <span>Disable Product</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProductModal;
