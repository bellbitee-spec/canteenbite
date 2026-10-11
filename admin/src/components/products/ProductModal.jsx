import React, { useEffect } from "react";
import ProductForm from "./ProductForm";

/**
 * ProductModal
 * Responsive modal dialog hosting ProductForm for creating or editing a product.
 */
const ProductModal = ({
  isOpen,
  onClose,
  initialData = null,
  categories = [],
  onSubmit,
  submitting = false,
  serverError = null,
}) => {
  const isEdit = Boolean(initialData && initialData.id);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      <div className="relative w-full max-w-2xl bg-white border border-[#EBD4DC] rounded-3xl shadow-2xl z-10 my-4 sm:my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBD4DC] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC] flex items-center justify-center">
              {isEdit ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
            <div>
              <h2 id="product-modal-title" className="text-xl font-bold text-[#352431] tracking-tight">
                {isEdit ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="text-xs text-[#735A67]">
                {isEdit
                  ? `Updating "${initialData.name}"`
                  : "Configure menu details, pricing, and initial stock"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-2 text-[#735A67] hover:text-[#352431] rounded-xl hover:bg-[#FBE7EE] transition cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <ProductForm
            key={initialData?.id || "new-product"}
            initialData={initialData}
            categories={categories}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitting={submitting}
            serverError={serverError}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
