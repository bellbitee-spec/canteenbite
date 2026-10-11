import React, { useEffect } from "react";

/**
 * DeleteCategoryModal
 * Handles category deletion and deactivation while respecting product dependencies.
 */
const DeleteCategoryModal = ({
  isOpen,
  category,
  productCount = 0,
  onClose,
  onConfirmDelete,
  onDeactivate,
  loading = false,
  errorMessage = null,
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

  if (!isOpen || !category) return null;

  const hasProducts = productCount > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-category-title"
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
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
              hasProducts
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-rose-50 border-rose-200 text-[#C94F78]"
            }`}
          >
            {hasProducts ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </div>
          <div>
            <h3 id="delete-category-title" className="text-lg font-bold text-[#352431] tracking-tight">
              {hasProducts ? "Category Has Assigned Products" : "Delete category?"}
            </h3>
            <p className="text-xs text-[#735A67]">
              {hasProducts ? "Deletion blocked by active products" : "Permanent removal"}
            </p>
          </div>
        </div>

        {/* Category summary card */}
        <div className="mb-5 p-3.5 bg-[#FFF9F2] rounded-2xl border border-[#EBD4DC] flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#EBD4DC]">
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <svg className="w-6 h-6 text-[#927681]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-[#352431] truncate">{category.name}</h4>
            <p className="text-xs text-[#735A67]">
              {productCount} {productCount === 1 ? "product assigned" : "products assigned"} • Order: {category.sortOrder || 0}
            </p>
          </div>
        </div>

        {/* Error banner from backend */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
          >
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {hasProducts ? (
          <div className="space-y-2 mb-6">
            <p className="text-sm text-[#735A67] leading-relaxed">
              This category cannot be deleted because <strong className="text-[#352431]">{productCount} {productCount === 1 ? "product is" : "products are"}</strong> still assigned to it.
            </p>
            <p className="text-xs text-[#927681] leading-relaxed">
              To hide this category from student menus without affecting any existing products or orders, you can deactivate it instead.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[#735A67] mb-6 leading-relaxed">
            Are you sure you want to delete <strong className="text-[#352431]">&quot;{category.name}&quot;</strong>? This category currently has no products assigned and will be removed.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] border border-[#EBD4DC] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer order-last sm:order-first"
          >
            Cancel
          </button>

          {hasProducts ? (
            <>
              {category.isActive && (
                <button
                  type="button"
                  onClick={onDeactivate}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Deactivating...</span>
                    </>
                  ) : (
                    <span>Deactivate Category</span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                title="Attempt deletion to verify backend policy"
              >
                Delete Anyway
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sakura-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete Category</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteCategoryModal;
