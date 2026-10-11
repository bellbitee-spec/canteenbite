import React, { useState, useEffect } from "react";
import ImageUpload from "../common/ImageUpload";

// Slug generation utility
const generateSlug = (text) => {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Collapse whitespace and underscores to hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading and trailing hyphens
};

const ProductForm = ({
  initialData = null,
  categories = [],
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const isEdit = Boolean(initialData && initialData.id);

  // Form states
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    category: initialData?.category?.id || initialData?.category || "",
    price: initialData?.price !== undefined ? initialData.price : "",
    stock: initialData?.stock !== undefined ? initialData.stock : "",
    lowStockThreshold:
      initialData?.lowStockThreshold !== undefined
        ? initialData.lowStockThreshold
        : 5,
    preparationTime:
      initialData?.preparationTime !== undefined
        ? initialData.preparationTime
        : 10,
    sortOrder:
      initialData?.sortOrder !== undefined ? initialData.sortOrder : 0,
    isAvailable:
      initialData?.isAvailable !== undefined ? initialData.isAvailable : true,
    isFeatured:
      initialData?.isFeatured !== undefined ? Boolean(initialData.isFeatured) : false,
    featuredBadge: initialData?.featuredBadge || "",
    rating: initialData?.rating !== undefined ? initialData.rating : 4.8,
    ratingCount:
      initialData?.ratingCount !== undefined ? initialData.ratingCount : 0,
  });

  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Auto-generate slug when name changes (unless user manually touched slug)
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: newName,
      slug: slugManuallyEdited ? prev.slug : generateSlug(newName),
    }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: null }));
    }
  };

  const handleSlugChange = (e) => {
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }));
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (name === "image") {
      setImagePreviewError(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    // Name
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Product name is required";
    } else if (formData.name.trim().length > 150) {
      newErrors.name = "Name must not exceed 150 characters";
    }

    // Slug
    if (!formData.slug || !formData.slug.trim()) {
      newErrors.slug = "Product slug is required";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      newErrors.slug =
        "Slug must be lowercase alphanumeric with hyphens (e.g. 'veg-burger')";
    }

    // Category
    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    // Price
    if (formData.price === "" || formData.price === null) {
      newErrors.price = "Price is required";
    } else {
      const numPrice = Number(formData.price);
      if (isNaN(numPrice) || numPrice < 0) {
        newErrors.price = "Price must be a number greater than or equal to 0";
      }
    }

    // Stock
    if (formData.stock === "" || formData.stock === null) {
      newErrors.stock = "Stock is required";
    } else {
      const numStock = Number(formData.stock);
      if (isNaN(numStock) || !Number.isInteger(numStock) || numStock < 0) {
        newErrors.stock = "Stock must be a non-negative integer (e.g. 0, 10, 24)";
      }
    }

    // Low stock threshold
    if (
      formData.lowStockThreshold !== "" &&
      formData.lowStockThreshold !== null
    ) {
      const numThreshold = Number(formData.lowStockThreshold);
      if (
        isNaN(numThreshold) ||
        !Number.isInteger(numThreshold) ||
        numThreshold < 0
      ) {
        newErrors.lowStockThreshold = "Threshold must be a non-negative integer";
      }
    }

    // Preparation time
    if (formData.preparationTime !== "" && formData.preparationTime !== null) {
      const numPrep = Number(formData.preparationTime);
      if (isNaN(numPrep) || !Number.isInteger(numPrep) || numPrep < 0) {
        newErrors.preparationTime = "Preparation time must be a non-negative integer (minutes)";
      }
    }

    // Sort order
    if (formData.sortOrder !== "" && formData.sortOrder !== null) {
      const numSort = Number(formData.sortOrder);
      if (isNaN(numSort) || !Number.isInteger(numSort) || numSort < 0) {
        newErrors.sortOrder = "Sort order must be a non-negative integer";
      }
    }

    // Image URL format (if provided)
    if (formData.image && formData.image.trim()) {
      const imgVal = formData.image.trim();
      if (!/^https?:\/\/.+/i.test(imgVal)) {
        newErrors.image = "Image must be a valid web URL starting with http:// or https://";
      }
    }

    // Description length
    if (formData.description && formData.description.length > 1000) {
      newErrors.description = "Description cannot exceed 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build payload with authoritative numeric types
    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description.trim(),
      image: formData.image ? formData.image.trim() : "",
      category: formData.category,
      price: Number(formData.price),
      stock: Number(formData.stock),
      lowStockThreshold:
        formData.lowStockThreshold !== "" ? Number(formData.lowStockThreshold) : 5,
      preparationTime:
        formData.preparationTime !== "" ? Number(formData.preparationTime) : 10,
      sortOrder:
        formData.sortOrder !== "" ? Number(formData.sortOrder) : 0,
      isAvailable: Boolean(formData.isAvailable),
      isFeatured: Boolean(formData.isFeatured),
      featuredBadge: formData.featuredBadge.trim(),
      rating: formData.rating !== "" ? Number(formData.rating) : 4.8,
      ratingCount: formData.ratingCount !== "" ? Number(formData.ratingCount) : 0,
    };

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Global Server Error Banner */}
      {serverError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="leading-snug">{serverError}</span>
        </div>
      )}

      {/* Row 1: Name and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="prod-name"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="prod-name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g. Crispy Veg Burger"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
              errors.name
                ? "border-rose-400 focus:border-rose-500"
                : "border-[#EBD4DC] focus:border-[#C94F78]"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="prod-category"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Category <span className="text-rose-500">*</span>
          </label>
          {categories.length === 0 ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              No categories available. Create a category first.
            </div>
          ) : (
            <select
              id="prod-category"
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] text-sm focus:outline-none transition-colors cursor-pointer ${
                errors.category
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-[#EBD4DC] focus:border-[#C94F78]"
              }`}
            >
              <option value="" disabled className="bg-white text-[#735A67]">
                Select a category...
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-white text-[#352431]">
                  {cat.name}
                </option>
              ))}
            </select>
          )}
          {errors.category && (
            <p className="mt-1 text-xs text-rose-600">{errors.category}</p>
          )}
        </div>
      </div>

      {/* Row 2: Slug */}
      <div>
        <label
          htmlFor="prod-slug"
          className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
        >
          Product Slug <span className="text-rose-500">*</span>
          <span className="text-[#927681] normal-case ml-1 font-normal">
            (URL identifier, e.g. crispy-veg-burger)
          </span>
        </label>
        <input
          id="prod-slug"
          name="slug"
          type="text"
          required
          value={formData.slug}
          onChange={handleSlugChange}
          placeholder="e.g. crispy-veg-burger"
          className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm font-mono focus:outline-none transition-colors ${
            errors.slug
              ? "border-rose-400 focus:border-rose-500"
              : "border-[#EBD4DC] focus:border-[#C94F78]"
          }`}
        />
        {errors.slug && (
          <p className="mt-1 text-xs text-rose-600">{errors.slug}</p>
        )}
      </div>

      {/* Row 3: Price, Stock, Low Stock Threshold */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="prod-price"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Price (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#735A67] text-sm font-semibold pointer-events-none">
              ₹
            </span>
            <input
              id="prod-price"
              name="price"
              type="number"
              step="any"
              min="0"
              required
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              className={`w-full pl-8 pr-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
                errors.price
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-[#EBD4DC] focus:border-[#C94F78]"
              }`}
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-xs text-rose-600">{errors.price}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="prod-stock"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Stock <span className="text-rose-500">*</span>
          </label>
          <input
            id="prod-stock"
            name="stock"
            type="number"
            step="1"
            min="0"
            required
            value={formData.stock}
            onChange={handleChange}
            placeholder="e.g. 25"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
              errors.stock
                ? "border-rose-400 focus:border-rose-500"
                : "border-[#EBD4DC] focus:border-[#C94F78]"
            }`}
          />
          {errors.stock && (
            <p className="mt-1 text-xs text-rose-600">{errors.stock}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="prod-threshold"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Low Stock Alert
          </label>
          <input
            id="prod-threshold"
            name="lowStockThreshold"
            type="number"
            step="1"
            min="0"
            value={formData.lowStockThreshold}
            onChange={handleChange}
            placeholder="5"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
              errors.lowStockThreshold
                ? "border-rose-400 focus:border-rose-500"
                : "border-[#EBD4DC] focus:border-[#C94F78]"
            }`}
          />
          {errors.lowStockThreshold && (
            <p className="mt-1 text-xs text-rose-600">{errors.lowStockThreshold}</p>
          )}
        </div>
      </div>

      {/* Row 4: Prep Time and Sort Order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="prod-preptime"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Prep Time (minutes)
          </label>
          <div className="relative">
            <input
              id="prod-preptime"
              name="preparationTime"
              type="number"
              step="1"
              min="0"
              value={formData.preparationTime}
              onChange={handleChange}
              placeholder="10"
              className={`w-full pr-14 pl-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
                errors.preparationTime
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-[#EBD4DC] focus:border-[#C94F78]"
              }`}
            />
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#735A67] text-xs pointer-events-none">
              min
            </span>
          </div>
          {errors.preparationTime && (
            <p className="mt-1 text-xs text-rose-600">{errors.preparationTime}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="prod-sortorder"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Sort Order
          </label>
          <input
            id="prod-sortorder"
            name="sortOrder"
            type="number"
            step="1"
            min="0"
            value={formData.sortOrder}
            onChange={handleChange}
            placeholder="0"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors ${
              errors.sortOrder
                ? "border-rose-400 focus:border-rose-500"
                : "border-[#EBD4DC] focus:border-[#C94F78]"
            }`}
          />
          {errors.sortOrder && (
            <p className="mt-1 text-xs text-rose-600">{errors.sortOrder}</p>
          )}
        </div>
      </div>

      {/* Row 5: Image Upload + Preview */}
      <ImageUpload
        value={formData.image}
        onChange={(url) => {
          setFormData((prev) => ({ ...prev, image: url }));
          if (errors.image) {
            setErrors((prev) => ({ ...prev, image: null }));
          }
        }}
        folder="products"
        label="Product Image"
        placeholder="https://images.unsplash.com/... or upload via Cloudinary"
        error={errors.image}
        disabled={submitting}
      />

      {/* Row 6: Description */}
      <div>
        <label
          htmlFor="prod-desc"
          className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
        >
          Description
        </label>
        <textarea
          id="prod-desc"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of ingredients, allergens, or serving style..."
          className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none transition-colors resize-none ${
            errors.description
              ? "border-rose-400 focus:border-rose-500"
              : "border-[#EBD4DC] focus:border-[#C94F78]"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
        )}
      </div>

      {/* Row 7: Available Toggle */}
      <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] flex items-center justify-between">
        <div>
          <label htmlFor="prod-avail" className="text-sm font-semibold text-[#352431] block cursor-pointer">
            Student Availability
          </label>
          <p className="text-xs text-[#735A67] mt-0.5">
            When enabled, students can see and order this item in the storefront.
          </p>
        </div>
        <input
          id="prod-avail"
          name="isAvailable"
          type="checkbox"
          checked={formData.isAvailable}
          onChange={handleChange}
          className="w-5 h-5 rounded text-[#C94F78] border-[#EBD4DC] accent-[#C94F78] cursor-pointer"
        />
      </div>

      {/* Row 8: Homepage Hero Banner Showcase Settings */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#FBE7EE]/60 via-[#FFF9F2] to-[#FFF9F2] border border-[#EBD4DC] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#C94F78] flex items-center gap-1.5">
                <span>🌸</span>
                <span>Feature in Homepage Hero Banner</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#C94F78] border border-[#EBD4DC]">
                Showcase
              </span>
            </div>
            <p className="text-xs text-[#735A67] mt-1">
              Displays this dish on the student homepage floating animated banner with real rating &amp; live badge.
            </p>
          </div>
          <input
            id="prod-featured"
            name="isFeatured"
            type="checkbox"
            checked={formData.isFeatured}
            onChange={handleChange}
            className="w-5 h-5 rounded text-[#C94F78] border-[#EBD4DC] accent-[#C94F78] cursor-pointer"
          />
        </div>

        {formData.isFeatured && (
          <div className="pt-3 border-t border-[#EBD4DC] space-y-3.5">
            <div>
              <label
                htmlFor="prod-badge"
                className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
              >
                Hero Badge / Highlight Tag
              </label>
              <input
                id="prod-badge"
                name="featuredBadge"
                type="text"
                value={formData.featuredBadge}
                onChange={handleChange}
                placeholder="e.g. Campus Favorite, Chef's Sakura Signature"
                className="w-full px-3.5 py-2.5 bg-white border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:border-[#C94F78] transition-colors"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-[#735A67] mr-1 self-center">Quick tags:</span>
                {[
                  "Campus Favorite",
                  "Chef's Sakura Signature",
                  "Steaming Hot & Fresh",
                  "Today's Special",
                  "Student Top Pick",
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, featuredBadge: tag }))}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC] transition cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="prod-rating"
                  className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
                >
                  Rating (0.0 to 5.0)
                </label>
                <input
                  id="prod-rating"
                  name="rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating}
                  onChange={handleChange}
                  placeholder="4.8"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:border-[#C94F78] transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="prod-rating-count"
                  className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
                >
                  Orders / Rating Count
                </label>
                <input
                  id="prod-rating-count"
                  name="ratingCount"
                  type="number"
                  min="0"
                  value={formData.ratingCount}
                  onChange={handleChange}
                  placeholder="e.g. 1200"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:border-[#C94F78] transition-colors"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBD4DC]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 rounded-xl border border-[#EBD4DC] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] text-sm font-medium transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting || categories.length === 0}
          className="px-5 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sakura-sm"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Product" : "Create Product"}</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
