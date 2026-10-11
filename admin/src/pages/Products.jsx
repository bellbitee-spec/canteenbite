import React, { useState, useEffect, useCallback, useMemo } from "react";
import productService from "../services/productService";
import categoryService from "../services/categoryService";
import ProductTable from "../components/products/ProductTable";
import ProductModal from "../components/products/ProductModal";
import DeleteProductModal from "../components/products/DeleteProductModal";

const Products = () => {
  // Data states
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState(""); // "" (All), "true", "false"
  const [selectedStockFilter, setSelectedStockFilter] = useState("all"); // "all", "in_stock", "low_stock", "out_of_stock"
  const [showOnlyHeroBanner, setShowOnlyHeroBanner] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

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

  // Load categories once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const catList = await categoryService.getCategories();
        setCategories(catList || []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products from backend whenever debouncedSearch, category, or availability changes
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        includeUnavailable: "true",
      };

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (selectedCategory) {
        params.category = selectedCategory;
      }

      if (selectedAvailability !== "") {
        params.available = selectedAvailability;
      }

      const list = await productService.getProducts(params);
      setProducts(list || []);
    } catch (err) {
      setError(err.message || "Failed to load products. Please check server connection.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedAvailability]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Apply client-side filters (stock and hero banner)
  const filteredProducts = useMemo(() => {
    let list = products;

    if (showOnlyHeroBanner) {
      list = list.filter((p) => Boolean(p.isFeatured));
    }

    if (selectedStockFilter === "all") {
      return list;
    }

    return list.filter((item) => {
      const stock = Number(item.stock) || 0;
      const threshold =
        item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : 5;

      if (selectedStockFilter === "in_stock") {
        return stock > 0;
      }
      if (selectedStockFilter === "low_stock") {
        return stock > 0 && stock <= threshold;
      }
      if (selectedStockFilter === "out_of_stock") {
        return stock === 0;
      }
      return true;
    });
  }, [products, selectedStockFilter, showOnlyHeroBanner]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedAvailability("");
    setSelectedStockFilter("all");
    setShowOnlyHeroBanner(false);
  };

  const isFiltered = Boolean(
    searchTerm.trim() ||
      selectedCategory ||
      selectedAvailability !== "" ||
      selectedStockFilter !== "all" ||
      showOnlyHeroBanner
  );

  // Create Product handler
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Edit Product handler
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormServerError(null);
    setIsFormModalOpen(true);
  };

  // Save Product (Create / Update)
  const handleSaveProduct = async (payload) => {
    setFormSubmitting(true);
    setFormServerError(null);

    try {
      if (editingProduct && editingProduct.id) {
        await productService.updateProduct(editingProduct.id, payload);
        showToast("Product updated successfully.");
      } else {
        await productService.createProduct(payload);
        showToast("Product created successfully.");
      }

      setIsFormModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      let msg = err.message || "Unable to save product.";
      if (err.data && err.data.errors && err.data.errors.length > 0) {
        msg = err.data.errors.map((e) => e.msg).join(", ");
      } else if (err.status === 409) {
        msg = "A product with this URL slug already exists. Please choose a different slug.";
      } else if (err.status === 404) {
        msg = "The selected category is no longer available.";
      } else if (err.status === 401 || err.status === 403) {
        msg = "Your admin session has expired or lacks permission.";
      }
      setFormServerError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  // Confirm Disable Product
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleteSubmitting(true);

    try {
      await productService.deleteProduct(productToDelete.id);
      showToast("Product disabled successfully.");
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
      await fetchProducts();
    } catch (err) {
      showToast(err.message || "Failed to disable product.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Quick Availability Toggle
  const handleToggleAvailability = async (product) => {
    const newStatus = !product.isAvailable;
    const productId = product.id;

    // Track toggling state for this specific product
    setTogglingIds((prev) => new Set(prev).add(productId));

    try {
      await productService.updateProduct(productId, { isAvailable: newStatus });
      // Update local state directly
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: newStatus } : p))
      );
      showToast(
        newStatus
          ? `"${product.name}" is now available.`
          : `"${product.name}" is now unavailable.`
      );
    } catch (err) {
      showToast(err.message || "Failed to update availability.", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Quick Hero Banner Toggle
  const handleToggleHeroFeatured = async (product) => {
    const newFeatured = !product.isFeatured;
    const productId = product.id;

    setTogglingIds((prev) => new Set(prev).add(productId));

    try {
      await productService.updateProduct(productId, {
        isFeatured: newFeatured,
        featuredBadge: product.featuredBadge || (newFeatured ? "Campus Favorite" : ""),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                isFeatured: newFeatured,
                featuredBadge: p.featuredBadge || (newFeatured ? "Campus Favorite" : ""),
              }
            : p
        )
      );
      showToast(
        newFeatured
          ? `"${product.name}" added to Hero Banner!`
          : `"${product.name}" removed from Hero Banner.`
      );
    } catch (err) {
      showToast(err.message || "Failed to update Hero Banner status.", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
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
            Products
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage menu items, pricing, stock and availability.
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
          <span>+ Add Product</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input (5 cols on md+) */}
          <div className="md:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
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

          {/* Category Filter (3 cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-750 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-300">
                All categories
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Filter (2.5 cols) */}
          <div className="md:col-span-2">
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-750 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-300">
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

          {/* Stock Filter (2.5 cols) */}
          <div className="md:col-span-3">
            <select
              value={selectedStockFilter}
              onChange={(e) => setSelectedStockFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-750 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-300">
                All stock
              </option>
              <option value="in_stock" className="bg-slate-900 text-white">
                In stock (&gt;0)
              </option>
              <option value="low_stock" className="bg-slate-900 text-white">
                Low stock (≤ threshold)
              </option>
              <option value="out_of_stock" className="bg-slate-900 text-white">
                Out of stock (0)
              </option>
            </select>
          </div>
        </div>

        {/* Filter status summary / Clear filters button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <div>
              Showing <span className="font-bold text-white">{filteredProducts.length}</span>{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
              {products.length !== filteredProducts.length && (
                <span className="text-slate-500 ml-1">
                  (filtered from {products.length} total)
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowOnlyHeroBanner((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                showOnlyHeroBanner
                  ? "bg-rose-500 text-white shadow-xs"
                  : "bg-slate-800 text-rose-300 hover:bg-slate-750 border border-rose-500/30"
              }`}
            >
              <span>🌸</span>
              <span>
                Hero Banner ({products.filter((p) => Boolean(p.isFeatured)).length})
              </span>
            </button>
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

      {/* Global Error Alert */}
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
            onClick={fetchProducts}
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
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800/60 rounded-xl" />
            ))}
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 max-w-lg mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>

          <h3 className="text-base font-bold text-white mb-1.5">
            {isFiltered ? "No products match your filters" : "Products not found"}
          </h3>
          <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
            {isFiltered
              ? "Try adjusting your search query, category selection, or stock filters."
              : "No items have been added to the canteen catalog yet."}
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
              + Add Product
            </button>
          )}
        </div>
      ) : (
        /* Product Table / Cards */
        <ProductTable
          products={filteredProducts}
          onEdit={handleOpenEditModal}
          onDelete={handleOpenDeleteModal}
          onToggleAvailability={handleToggleAvailability}
          onToggleHeroFeatured={handleToggleHeroFeatured}
          togglingIds={togglingIds}
        />
      )}

      {/* Product Create / Edit Modal */}
      <ProductModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingProduct(null);
          setFormServerError(null);
        }}
        initialData={editingProduct}
        categories={categories}
        onSubmit={handleSaveProduct}
        submitting={formSubmitting}
        serverError={formServerError}
      />

      {/* Delete / Disable Confirmation Modal */}
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        product={productToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteSubmitting}
      />
    </div>
  );
};

export default Products;
