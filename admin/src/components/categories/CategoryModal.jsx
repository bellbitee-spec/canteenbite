import React, { useEffect } from "react";
import CategoryForm from "./CategoryForm";

/**
 * CategoryModal
 * Modal dialog hosting CategoryForm for creating or editing categories.
 */
const CategoryModal = ({
  isOpen,
  onClose,
  initialData = null,
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

  // Lock body scroll when modal is active
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
      aria-labelledby="category-modal-title"
    >
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      <div className="relative w-full max-w-xl bg-white border border-[#EBD4DC] rounded-3xl shadow-2xl z-10 my-4 sm:my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EBD4DC] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC] flex items-center justify-center">
              {isEdit ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              )}
            </div>
            <div>
              <h2 id="category-modal-title" className="text-xl font-bold text-[#352431] tracking-tight">
                {isEdit ? "Edit Category" : "Add New Category"}
              </h2>
              <p className="text-xs text-[#735A67]">
                {isEdit
                  ? `Configuring "${initialData.name}"`
                  : "Organize items into a distinct canteen menu section"}
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

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <CategoryForm
            key={initialData?.id || "new-category"}
            initialData={initialData}
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

export default CategoryModal;
