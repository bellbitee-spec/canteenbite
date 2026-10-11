import React, { useState } from "react";
import ComboItemEditor from "./ComboItemEditor";
import ImageUpload from "../common/ImageUpload";

const ComboForm = ({
  initialData = null,
  availableProducts = [],
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const isEdit = Boolean(initialData && initialData.id);

  // Form states
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    price: initialData?.price !== undefined ? initialData.price : "",
    preparationTime:
      initialData?.preparationTime !== undefined
        ? initialData.preparationTime
        : 10,
    sortOrder:
      initialData?.sortOrder !== undefined ? initialData.sortOrder : 0,
    isAvailable:
      initialData?.isAvailable !== undefined ? initialData.isAvailable : true,
    items:
      initialData?.items && initialData.items.length > 0
        ? initialData.items.map((i) => ({
            product:
              typeof i.product === "object" && i.product !== null
                ? i.product.id || i.product._id
                : i.product,
            quantity: i.quantity || 1,
          }))
        : [
            {
              product: availableProducts[0]?.id || "",
              quantity: 1,
            },
          ],
  });

  const [errors, setErrors] = useState({});
  const [imagePreviewError, setImagePreviewError] = useState(false);

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

  const handleItemsChange = (newItems) => {
    setFormData((prev) => ({ ...prev, items: newItems }));
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Name
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Combo name is required";
    } else if (formData.name.trim().length > 150) {
      newErrors.name = "Name must not exceed 150 characters";
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

    // Preparation Time
    if (formData.preparationTime !== "" && formData.preparationTime !== null) {
      const numPrep = Number(formData.preparationTime);
      if (isNaN(numPrep) || !Number.isInteger(numPrep) || numPrep < 0) {
        newErrors.preparationTime = "Preparation time must be a non-negative integer";
      }
    }

    // Sort Order
    if (formData.sortOrder !== "" && formData.sortOrder !== null) {
      const numSort = Number(formData.sortOrder);
      if (isNaN(numSort) || !Number.isInteger(numSort) || numSort < 0) {
        newErrors.sortOrder = "Sort order must be a non-negative integer";
      }
    }

    // Image URL
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

    // Items validation
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = "A combo must contain at least one product";
    } else {
      const seenProductIds = new Set();
      let hasItemError = false;

      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.product) {
          newErrors.items = `Please select a product for item #${i + 1}`;
          hasItemError = true;
          break;
        }

        if (seenProductIds.has(item.product)) {
          newErrors.items = "Duplicate products are not allowed. Please combine quantities into a single item row.";
          hasItemError = true;
          break;
        }
        seenProductIds.add(item.product);

        const qty = Number(item.quantity);
        if (!qty || !Number.isInteger(qty) || qty < 1) {
          newErrors.items = `Quantity for item #${i + 1} must be an integer of 1 or greater`;
          hasItemError = true;
          break;
        }
      }

      if (!hasItemError && seenProductIds.size === 0) {
        newErrors.items = "Please add at least one product";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Build payload matching backend expectations
    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      image: formData.image ? formData.image.trim() : "",
      price: Number(formData.price),
      preparationTime:
        formData.preparationTime !== "" ? Number(formData.preparationTime) : 10,
      sortOrder: formData.sortOrder !== "" ? Number(formData.sortOrder) : 0,
      isAvailable: Boolean(formData.isAvailable),
      items: formData.items.map((item) => ({
        product: item.product,
        quantity: Number(item.quantity) || 1,
      })),
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
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500"
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

      {/* Row 1: Name & Price */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="combo-name"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Combo Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="combo-name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Sakura Special Combo"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.name
                ? "border-rose-300 focus:ring-rose-200"
                : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-rose-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="combo-price"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Combo Price (₹) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#927681] text-sm font-semibold pointer-events-none">
              ₹
            </span>
            <input
              id="combo-price"
              name="price"
              type="number"
              step="any"
              min="0"
              required
              value={formData.price}
              onChange={handleChange}
              placeholder="0.00"
              className={`w-full pl-8 pr-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.price
                  ? "border-rose-300 focus:ring-rose-200"
                  : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
              }`}
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-xs text-rose-600">{errors.price}</p>
          )}
        </div>
      </div>

      {/* Row 2: Combo Items Editor */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EBD4DC] shadow-2xs">
        <ComboItemEditor
          items={formData.items}
          onChange={handleItemsChange}
          availableProducts={availableProducts}
          error={errors.items}
        />
      </div>

      {/* Row 3: Prep Time & Sort Order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="combo-preptime"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Preparation Time (minutes)
          </label>
          <div className="relative">
            <input
              id="combo-preptime"
              name="preparationTime"
              type="number"
              step="1"
              min="0"
              value={formData.preparationTime}
              onChange={handleChange}
              placeholder="10"
              className={`w-full pr-14 pl-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.preparationTime
                  ? "border-rose-300 focus:ring-rose-200"
                  : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
              }`}
            />
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#927681] text-xs pointer-events-none">
              min
            </span>
          </div>
          {errors.preparationTime && (
            <p className="mt-1 text-xs text-rose-600">{errors.preparationTime}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="combo-sortorder"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Sort Order
          </label>
          <input
            id="combo-sortorder"
            name="sortOrder"
            type="number"
            step="1"
            min="0"
            value={formData.sortOrder}
            onChange={handleChange}
            placeholder="0"
            className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.sortOrder
                ? "border-rose-300 focus:ring-rose-200"
                : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
            }`}
          />
          {errors.sortOrder && (
            <p className="mt-1 text-xs text-rose-600">{errors.sortOrder}</p>
          )}
        </div>
      </div>

      {/* Row 4: Image Upload + Preview */}
      <ImageUpload
        value={formData.image}
        onChange={(url) => {
          setFormData((prev) => ({ ...prev, image: url }));
          if (errors.image) {
            setErrors((prev) => ({ ...prev, image: null }));
          }
        }}
        folder="combos"
        label="Combo Image"
        placeholder="https://images.unsplash.com/... or upload via Cloudinary"
        error={errors.image}
        disabled={submitting}
      />

      {/* Row 5: Description */}
      <div>
        <label
          htmlFor="combo-desc"
          className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
        >
          Description
        </label>
        <textarea
          id="combo-desc"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of meal combination or special student savings..."
          className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 transition-colors resize-none ${
            errors.description
              ? "border-rose-300 focus:ring-rose-200"
              : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-rose-600">{errors.description}</p>
        )}
      </div>

      {/* Row 6: Available Toggle */}
      <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] flex items-center justify-between">
        <div>
          <label htmlFor="combo-avail" className="text-sm font-semibold text-[#352431] block cursor-pointer">
            Student Availability
          </label>
          <p className="text-xs text-[#735A67] mt-0.5">
            When enabled, students can see and order this combo deal from the storefront.
          </p>
        </div>
        <input
          id="combo-avail"
          name="isAvailable"
          type="checkbox"
          checked={formData.isAvailable}
          onChange={handleChange}
          className="w-5 h-5 rounded text-[#C94F78] bg-white border-[#EBD4DC] focus:ring-[#C94F78] focus:ring-offset-white cursor-pointer accent-[#C94F78]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBD4DC]">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] border border-[#EBD4DC] text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sakura-sm"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Combo" : "Create Combo"}</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default ComboForm;
