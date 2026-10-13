import React, { useState, useRef } from "react";
import uploadService from "../../services/uploadService";
import { getThumbnailUrl } from "../../utils/imageUtils";

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
        <label className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || uploading}
            className="text-xs text-[#927681] hover:text-[#C94F78] transition-colors disabled:opacity-50 cursor-pointer"
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
        className={`relative p-3.5 border-2 border-dashed rounded-2xl transition-all ${
          isDragOver
            ? "border-[#C94F78] bg-[#FBE7EE]"
            : "border-[#EBD4DC] hover:border-[#C94F78]/50 bg-[#FFF9F2]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Preview Thumbnail */}
          <div className="w-16 h-16 rounded-xl bg-white border border-[#EBD4DC] flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-2xs">
            {value && !previewError ? (
              <img
                src={getThumbnailUrl(value, 128)}
                alt="Preview"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <svg
                className="w-6 h-6 text-[#927681]"
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
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                <svg
                  className="animate-spin w-5 h-5 text-[#C94F78]"
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#C94F78] hover:bg-[#B33D65] text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-sakura-sm"
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
                    <span>Uploading...</span>
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
              <span className="text-xs text-[#735A67]">
                or drag & drop here
              </span>
            </div>
            <p className="text-[11px] text-[#927681]">
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
          className={`w-full px-3.5 py-2.5 bg-[#FFF9F2] border rounded-xl text-[#352431] placeholder-[#927681] text-xs focus:outline-none focus:ring-2 transition-colors ${
            error || uploadError
              ? "border-rose-300 focus:ring-rose-200"
              : "border-[#EBD4DC] focus:ring-[#C94F78]/20 focus:border-[#C94F78]"
          }`}
        />
      </div>

      {/* Error message */}
      {(uploadError || error) && (
        <p className="text-xs text-rose-600 flex items-center gap-1">
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
