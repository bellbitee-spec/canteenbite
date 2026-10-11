import React, { useState } from "react";
import ImageUpload from "../common/ImageUpload";

const CategoryForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  submitting = false,
  serverError = null,
}) => {
  const isEdit = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    image: initialData?.image || "",
    sortOrder:
      initialData?.sortOrder !== undefined ? initialData.sortOrder : 0,
    isActive:
      initialData?.isActive !== undefined ? initialData.isActive : true,
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

  const validate = () => {
    const newErrors = {};

    // Name
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Category name is required";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Category name must not exceed 100 characters";
    }

    // Description
    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must not exceed 500 characters";
    }

    // Sort order
    if (formData.sortOrder !== "" && formData.sortOrder !== null) {
      const numSort = Number(formData.sortOrder);
      if (isNaN(numSort) || !Number.isInteger(numSort) || numSort < 0) {
        newErrors.sortOrder = "Sort order must be a non-negative integer";
      }
    }

    // Image URL format
    if (formData.image && formData.image.trim()) {
      const imgVal = formData.image.trim();
      if (!/^https?:\/\/.+/i.test(imgVal)) {
        newErrors.image = "Image must be a valid web URL starting with http:// or https://";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      image: formData.image ? formData.image.trim() : "",
      sortOrder: formData.sortOrder !== "" ? Number(formData.sortOrder) : 0,
      isActive: Boolean(formData.isActive),
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

      {/* Row 1: Name & Sort Order */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="cat-name"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Category Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="cat-name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Snacks & Bites"
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
            htmlFor="cat-sortorder"
            className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
          >
            Sort Order
          </label>
          <input
            id="cat-sortorder"
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

      {/* Row 2: Image Upload + Preview */}
      <ImageUpload
        value={formData.image}
        onChange={(url) => {
          setFormData((prev) => ({ ...prev, image: url }));
          if (errors.image) {
            setErrors((prev) => ({ ...prev, image: null }));
          }
        }}
        folder="categories"
        label="Category Image"
        placeholder="https://images.unsplash.com/... or upload via Cloudinary"
        error={errors.image}
        disabled={submitting}
      />

      {/* Row 3: Description */}
      <div>
        <label
          htmlFor="cat-desc"
          className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-1.5"
        >
          Description
        </label>
        <textarea
          id="cat-desc"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          placeholder="Brief description of the menu category..."
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

      {/* Row 4: Active Status Toggle */}
      <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] flex items-center justify-between">
        <div>
          <label htmlFor="cat-active" className="text-sm font-semibold text-[#352431] block cursor-pointer">
            Active Category
          </label>
          <p className="text-xs text-[#735A67] mt-0.5">
            When active, students can browse this category and its products in the storefront.
          </p>
        </div>
        <input
          id="cat-active"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={handleChange}
          className="w-5 h-5 rounded text-[#C94F78] border-[#EBD4DC] accent-[#C94F78] cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
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
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sakura-sm"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Category" : "Create Category"}</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;
