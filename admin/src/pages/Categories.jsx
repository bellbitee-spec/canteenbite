import React, { useState, useEffect, useCallback, useMemo } from "react";
import categoryService from "../services/categoryService";
import productService from "../services/productService";
import CategoryTable from "../components/categories/CategoryTable";
import CategoryModal from "../components/categories/CategoryModal";
import DeleteCategoryModal from "../components/categories/DeleteCategoryModal";

const Categories = () => {
  // Data states
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all"); // "all", "active", "inactive"

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Submission states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteServerError, setDeleteServerError] = useState(null);

  // Quick toggle tracking
  const [togglingIds, setTogglingIds] = useState(new Set());

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Debounce search by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch categories and products (single requests, no N+1)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [cats, prods] = await Promise.all([
        categoryService.getCategories({ includeInactive: "true" }),
        productService.getProducts({ includeUnavailable: "true" }),
      ]);

      setCategories(cats || []);

      // Calculate product counts per category in a single pass
      const counts = {};
      (prods || []).forEach((prod) => {
        const catId =
          typeof prod.category === "object" && prod.category !== null
            ? prod.category.id || prod.category._id
            : prod.category;
        if (catId) {
          counts[catId] = (counts[catId] || 0) + 1;
        }
      });
      setProductCounts(counts);
    } catch (err) {
      setError(err.message || "Failed to load categories. Please check server connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let result = categories;

    // Search query
    if (debouncedSearch && debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(query);
        const descMatch = c.description?.toLowerCase().includes(query);
        return nameMatch || descMatch;
      });
    }

    // Status filter
    if (selectedStatus === "active") {
      result = result.filter((c) => c.isActive === true);
    } else if (selectedStatus === "inactive") {
      result = result.filter((c) => c.isActive === false);
    }

    return result;
  }, [categories, debouncedSearch, selectedStatus]);

  const isFiltered = Boolean(
    searchTerm.trim() || selectedStatus !== "all"
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedStatus("all");
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormServerError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormServerError(null);
    setIsModalOpen(true);
  };

  // Save Category (Create / Update)
  const handleSaveCategory = async (payload) => {
    setFormSubmitting(true);
    setFormServerError(null);

    try {
      if (editingCategory && editingCategory.id) {
        await categoryService.updateCategory(editingCategory.id, payload);
        showToast("Category updated successfully.");
      } else {
        await categoryService.createCategory(payload);
        showToast("Category created successfully.");
      }

      setIsModalOpen(false);
      setEditingCategory(null);
      await fetchData();
    } catch (err) {
      let msg = err.message || "Unable to save category.";
      if (err.data && err.data.errors && err.data.errors.length > 0) {
        msg = err.data.errors.map((e) => e.msg).join(", ");
      } else if (err.status === 409) {
        msg = "A category with this name already exists. Please choose a different name.";
      } else if (err.status === 401 || err.status === 403) {
        msg = "Your admin session has expired or lacks permission.";
      }
      setFormServerError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setDeleteServerError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleteSubmitting(true);
    setDeleteServerError(null);

    try {
      await categoryService.deleteCategory(categoryToDelete.id);
      showToast("Category deleted successfully.");
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      await fetchData();
    } catch (err) {
      const msg =
        err.message ||
        (err.data && err.data.message) ||
        "This category cannot be deleted because products are still using it.";
      setDeleteServerError(msg);
      showToast(msg, "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Alternative: Deactivate category
  const handleDeactivateCategory = async () => {
    if (!categoryToDelete) return;
    setDeleteSubmitting(true);
    setDeleteServerError(null);

    try {
      await categoryService.updateCategory(categoryToDelete.id, { isActive: false });
      showToast(`Category "${categoryToDelete.name}" deactivated.`);
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      await fetchData();
    } catch (err) {
      showToast(err.message || "Failed to deactivate category.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Quick Status Toggle
  const handleToggleStatus = async (cat) => {
    const newStatus = !cat.isActive;
    const catId = cat.id;

    setTogglingIds((prev) => new Set(prev).add(catId));

    try {
      await categoryService.updateCategory(catId, { isActive: newStatus });
      setCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, isActive: newStatus } : c))
      );
      showToast(
        newStatus
          ? `"${cat.name}" is now active.`
          : `"${cat.name}" is now inactive.`
      );
    } catch (err) {
      showToast(err.message || "Failed to update category status.", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(catId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-sakura-card flex items-center gap-3 text-sm font-medium border backdrop-blur-md transition-all animate-bounceIn ${
            toast.type === "error"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : "bg-white text-[#5F9A68] border-[#EBD4DC]"
          }`}
        >
          {toast.type === "error" ? (
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[#5F9A68] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner / Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#EBD4DC]">
        <div>
          <h2 className="text-2xl font-bold text-[#352431] tracking-tight">
            Categories
          </h2>
          <p className="text-sm text-[#735A67] mt-0.5">
            Organize products into menu categories.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition-all shadow-sakura-sm cursor-pointer self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Category</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-5 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-8 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#927681]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories by name or description..."
              className="w-full pl-9 pr-9 py-2.5 bg-[#FFF9F2] border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 focus:ring-[#C94F78]/20 focus:border-[#C94F78] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#927681] hover:text-[#352431]"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#FFF9F2] border border-[#EBD4DC] rounded-xl text-[#352431] text-sm focus:outline-none focus:ring-2 focus:ring-[#C94F78]/20 focus:border-[#C94F78] transition-colors cursor-pointer"
            >
              <option value="all">
                All categories
              </option>
              <option value="active">
                Active only
              </option>
              <option value="inactive">
                Inactive only
              </option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Clear Button */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EBD4DC] text-xs text-[#735A67]">
          <div>
            Showing <span className="font-bold text-[#352431]">{filteredCategories.length}</span>{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
            {categories.length !== filteredCategories.length && (
              <span className="text-[#927681] ml-1">
                (filtered from {categories.length} total)
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[#C94F78] hover:text-[#B33D65] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-rose-700">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-3xl border border-[#EBD4DC] bg-white p-6 space-y-4 shadow-sakura-card animate-pulse">
          <div className="h-6 bg-[#FFF9F2] rounded w-1/4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-[#FFF9F2] rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-[#EBD4DC] shadow-sakura-card max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF9F2] text-[#C94F78] mx-auto flex items-center justify-center mb-4 border border-[#EBD4DC]">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>

          <h3 className="text-base font-bold text-[#352431] mb-1.5">
            {isFiltered ? "No categories match your search" : "No categories found"}
          </h3>
          <p className="text-xs text-[#735A67] mb-5 max-w-xs mx-auto">
            {isFiltered
              ? "Try adjusting your search query or filter selection."
              : "No menu categories have been added yet."}
          </p>

          {isFiltered ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#352431] text-xs font-semibold transition-colors cursor-pointer border border-[#EBD4DC]"
            >
              Clear search
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sakura-sm"
            >
              + Add Category
            </button>
          )}
        </div>
      ) : (
        /* Category Table / Cards */
        <CategoryTable
          categories={filteredCategories}
          productCounts={productCounts}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteModal}
          onToggleStatus={handleToggleStatus}
          togglingIds={togglingIds}
        />
      )}

      {/* Category Create / Edit Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
          setFormServerError(null);
        }}
        initialData={editingCategory}
        onSubmit={handleSaveCategory}
        submitting={formSubmitting}
        serverError={formServerError}
      />

      {/* Delete / Deactivate Confirmation Modal */}
      <DeleteCategoryModal
        isOpen={isDeleteModalOpen}
        category={categoryToDelete}
        productCount={categoryToDelete ? productCounts[categoryToDelete.id] || 0 : 0}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCategoryToDelete(null);
          setDeleteServerError(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        onDeactivate={handleDeactivateCategory}
        loading={deleteSubmitting}
        errorMessage={deleteServerError}
      />
    </div>
  );
};

export default Categories;
