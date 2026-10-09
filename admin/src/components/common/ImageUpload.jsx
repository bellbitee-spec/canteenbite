import React, { useState, useRef } from "react";
import uploadService from "../../services/uploadService";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ImageUpload = ({
  value = "",
  onChange,
  folder = "products",
  label = "Image",
  placeholder = "https://images.unsplash.com/... or upload new image",
  error = null,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;

    setUploadError(null);

    // Client-side file type validation
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      setUploadError(
        "Invalid file format. Only JPEG, PNG, and WebP images are supported."
      );
      return;
    }

    // Client-side file size validation (5 MB)
    if (file.size > MAX_SIZE_BYTES) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit. Please select a smaller image.`
      );
      return;
    }

    try {
      setUploading(true);
      const result = await uploadService.uploadImage(file, folder);
      const url = typeof result === "string" ? result : result.url;
      setPreviewError(false);
      if (onChange) {
        onChange(url);
      }
    } catch (err) {
      setUploadError(
        err?.message || "Failed to upload image to Cloudinary. Please try again."
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleUrlChange = (e) => {
    setUploadError(null);
    setPreviewError(false);
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleClear = () => {
    setUploadError(null);
    setPreviewError(false);
    if (onChange) {
      onChange("");
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            Remove Image
          </button>
        )}
      </div>

      {/* Upload Dropzone & Controls */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative p-3.5 border-2 border-dashed rounded-xl transition-all ${
          isDragOver
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Preview Thumbnail */}
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
            {value && !previewError ? (
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <svg
                className="w-6 h-6 text-slate-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}

            {/* Uploading Spinner Overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center">
                <svg
                  className="animate-spin w-5 h-5 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Action Button & Instructions */}
          <div className="flex-1 w-full text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInputChange}
                disabled={disabled || uploading}
                className="hidden"
                id={`file-upload-${folder}`}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {uploading ? (
                  <>
                    <svg
                      className="animate-spin w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Uploading to Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    <span>{value ? "Replace Image" : "Upload Image"}</span>
                  </>
                )}
              </button>
              <span className="text-xs text-slate-400">
                or drag & drop here
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Supports JPEG, PNG, WebP up to 5 MB.
            </p>
          </div>
        </div>
      </div>

      {/* Manual URL input fallback to preserve support for external/existing URLs */}
      <div>
        <input
          type="url"
          value={value}
          onChange={handleUrlChange}
          disabled={disabled || uploading}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 transition-colors ${
            error || uploadError
              ? "border-red-500/60 focus:ring-red-500"
              : "border-slate-800 focus:ring-indigo-500 focus:border-indigo-500"
          }`}
        />
      </div>

      {/* Error message */}
      {(uploadError || error) && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{uploadError || error}</span>
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
