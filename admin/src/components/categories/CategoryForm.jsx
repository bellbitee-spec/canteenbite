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
          className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400"
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
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
          >
            Category Name <span className="text-red-400">*</span>
          </label>
          <input
            id="cat-name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Snacks & Bites"
            className={`w-full px-3.5 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.name
                ? "border-red-500/60 focus:ring-red-500"
                : "border-slate-750 focus:ring-indigo-500 focus:border-indigo-500"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="cat-sortorder"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
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
            className={`w-full px-3.5 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-colors ${
              errors.sortOrder
                ? "border-red-500/60 focus:ring-red-500"
                : "border-slate-750 focus:ring-indigo-500 focus:border-indigo-500"
            }`}
          />
          {errors.sortOrder && (
            <p className="mt-1 text-xs text-red-400">{errors.sortOrder}</p>
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
          className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
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
          className={`w-full px-3.5 py-2.5 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition-colors resize-none ${
            errors.description
              ? "border-red-500/60 focus:ring-red-500"
              : "border-slate-750 focus:ring-indigo-500 focus:border-indigo-500"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Row 4: Active Status Toggle */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
        <div>
          <label htmlFor="cat-active" className="text-sm font-semibold text-white block cursor-pointer">
            Active Category
          </label>
          <p className="text-xs text-slate-400 mt-0.5">
            When active, students can browse this category and its products in the storefront.
          </p>
        </div>
        <input
          id="cat-active"
          name="isActive"
          type="checkbox"
          checked={formData.isActive}
          onChange={handleChange}
          className="w-5 h-5 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-950 cursor-pointer"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/25"
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
