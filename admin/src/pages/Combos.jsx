import React, { useState, useEffect, useCallback, useMemo } from "react";
import comboService from "../services/comboService";
import productService from "../services/productService";
import ComboTable from "../components/combos/ComboTable";
import ComboModal from "../components/combos/ComboModal";
import DeleteComboModal from "../components/combos/DeleteComboModal";

const Combos = () => {
  // Data states
  const [combos, setCombos] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("all"); // "all", "true", "false"

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [comboToDelete, setComboToDelete] = useState(null);

  // Form submission states
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Quick toggle tracking
  const [togglingIds, setTogglingIds] = useState(new Set());

  // Toast notification state
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

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

  // Debounce search term by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load available products for combo item editor
  const fetchProducts = useCallback(async () => {
    try {
      const prods = await productService.getProducts({ includeUnavailable: "true" });
      setAvailableProducts(prods || []);
    } catch (err) {
      console.error("Failed to load products for combos:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load combos from backend
  const fetchCombos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const list = await comboService.getCombos();
      setCombos(list || []);
    } catch (err) {
      setError(err.message || "Failed to load combos. Please check server connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCombos();
  }, [fetchCombos]);

  // Filter combos based on debouncedSearch and selectedAvailability
  const filteredCombos = useMemo(() => {
    let result = combos;

    // Search filter
    if (debouncedSearch && debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(query);
        const descMatch = c.description?.toLowerCase().includes(query);
        const itemMatch = c.items?.some((i) => {
          const prodName =
            typeof i.product === "object" && i.product !== null
              ? i.product.name?.toLowerCase()
              : "";
          return prodName.includes(query);
        });
        return nameMatch || descMatch || itemMatch;
      });
    }

    // Availability filter
    if (selectedAvailability === "true") {
      result = result.filter((c) => c.isAvailable === true);
    } else if (selectedAvailability === "false") {
      result = result.filter((c) => c.isAvailable === false);
    }

    return result;
  }, [combos, debouncedSearch, selectedAvailability]);

  const isFiltered = Boolean(
    searchTerm.trim() || selectedAvailability !== "all"
  );

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedAvailability("all");
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCombo(null);
    setFormServerError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (combo) => {
    setEditingCombo(combo);
    setFormServerError(null);
    setIsModalOpen(true);
  };

  // Save Combo (Create / Update)
  const handleSaveCombo = async (payload) => {
    setFormSubmitting(true);
    setFormServerError(null);

    try {
      if (editingCombo && editingCombo.id) {
        await comboService.updateCombo(editingCombo.id, payload);
        showToast("Combo updated successfully.");
      } else {
        await comboService.createCombo(payload);
        showToast("Combo created successfully.");
      }

      setIsModalOpen(false);
      setEditingCombo(null);
      await fetchCombos();
    } catch (err) {
      let msg = err.message || "Unable to save combo.";
      if (err.data && err.data.errors && err.data.errors.length > 0) {
        msg = err.data.errors.map((e) => e.msg).join(", ");
      } else if (err.status === 404) {
        msg = "One or more component products were not found in the catalog.";
      } else if (err.status === 401 || err.status === 403) {
        msg = "Your admin session has expired or lacks permission.";
      }
      setFormServerError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (combo) => {
    setComboToDelete(combo);
    setIsDeleteModalOpen(true);
  };

  // Confirm Disable Combo
  const handleConfirmDelete = async () => {
    if (!comboToDelete) return;
    setDeleteSubmitting(true);

    try {
      await comboService.deleteCombo(comboToDelete.id);
      showToast("Combo disabled successfully.");
      setIsDeleteModalOpen(false);
      setComboToDelete(null);
      await fetchCombos();
    } catch (err) {
      showToast(err.message || "Failed to disable combo.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Quick Availability Toggle
  const handleToggleAvailability = async (combo) => {
    const newStatus = !combo.isAvailable;
    const comboId = combo.id;

    setTogglingIds((prev) => new Set(prev).add(comboId));

    try {
      await comboService.updateCombo(comboId, { isAvailable: newStatus });
      setCombos((prev) =>
        prev.map((c) => (c.id === comboId ? { ...c, isAvailable: newStatus } : c))
      );
      showToast(
        newStatus
          ? `"${combo.name}" is now available.`
          : `"${combo.name}" is now unavailable.`
      );
    } catch (err) {
      showToast(err.message || "Failed to update availability.", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(comboId);
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
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border backdrop-blur-md transition-all animate-bounceIn ${
            toast.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/30"
              : "bg-slate-900/95 text-emerald-300 border-emerald-500/30"
          }`}
        >
          {toast.type === "error" ? (
            <svg className="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner / Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Combos
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage combo meals and their included products.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/25 cursor-pointer self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Combo</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-8 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search combos by name, item, or description..."
              className="w-full pl-9 pr-9 py-2 bg-slate-950/70 border border-slate-750 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                title="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Availability Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-750 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-300">
                All status
              </option>
              <option value="true" className="bg-slate-900 text-white">
                Available
              </option>
              <option value="false" className="bg-slate-900 text-white">
                Unavailable
              </option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Clear Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{filteredCombos.length}</span>{" "}
            {filteredCombos.length === 1 ? "combo" : "combos"}
            {combos.length !== filteredCombos.length && (
              <span className="text-slate-500 ml-1">
                (filtered from {combos.length} total)
              </span>
            )}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-red-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchCombos}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-800 rounded w-1/4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800/60 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredCombos.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <h3 className="text-base font-bold text-white mb-1.5">
            {isFiltered ? "No combos match your filters" : "No combos found"}
          </h3>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
            {isFiltered
              ? "Try adjusting your search query or availability filter."
              : "No combo meals have been created yet."}
          </p>

          {isFiltered ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              Clear filters
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-indigo-600/25"
            >
              + Add Combo
            </button>
          )}
        </div>
      ) : (
        /* Combo Table / Cards */
        <ComboTable
          combos={filteredCombos}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteModal}
          onToggleAvailability={handleToggleAvailability}
          togglingIds={togglingIds}
        />
      )}

      {/* Combo Create / Edit Modal */}
      <ComboModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCombo(null);
          setFormServerError(null);
        }}
        initialData={editingCombo}
        availableProducts={availableProducts}
        onSubmit={handleSaveCombo}
        submitting={formSubmitting}
        serverError={formServerError}
      />

      {/* Delete / Disable Confirmation Modal */}
      <DeleteComboModal
        isOpen={isDeleteModalOpen}
        combo={comboToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setComboToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteSubmitting}
      />
    </div>
  );
};

export default Combos;
