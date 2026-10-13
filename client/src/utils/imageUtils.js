/**
 * Image URL Optimization Utility for BellBite
 * Supports Cloudinary delivery transformations and Unsplash query optimizations.
 * Leaves other hosts (e.g. img.sanishtech.com, local public paths) safe and untouched.
 */

export const IMAGE_SIZES = {
  THUMBNAIL: 80, // Table rows, pills, circular avatars, cart icons
  CARD: 400, // Product & combo grid cards
  HERO: 800, // Detail pages, hero showcase
};

/**
 * Validates if a string looks like a renderable image URL.
 * Catches web pages mistakenly entered as image URLs (e.g. blog post URLs ending in '/')
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (
    !trimmed.startsWith("http://") &&
    !trimmed.startsWith("https://") &&
    !trimmed.startsWith("/")
  ) {
    return false;
  }
  // Catch webpage URLs like https://www.cookwithmanali.com/vada-pav/vada-pav/
  if (trimmed.endsWith("/") && !trimmed.includes("cloudinary.com")) {
    return false;
  }
  return true;
};

/**
 * Optimizes Cloudinary URLs by injecting transformation parameters.
 * Preserves existing version/path, avoids duplicate transformations.
 */
export const optimizeCloudinaryUrl = (
  url,
  {
    width = 400,
    height,
    crop = "limit",
    quality = "auto",
    format = "auto",
  } = {}
) => {
  if (!url || typeof url !== "string" || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const match = url.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/
  );
  if (!match) return url;

  const prefix = match[1];
  let rest = match[2];

  // If transformations already exist at start of path, strip them to avoid duplicates
  const existingTransformMatch = rest.match(
    /^([a-z]_[^/]+(?:,[a-z]_[^/]+)*)\/(.*)$/
  );
  if (existingTransformMatch) {
    rest = existingTransformMatch[2];
  }

  const parts = [];
  if (format) parts.push(`f_${format}`);
  if (quality) parts.push(`q_${quality}`);
  if (crop && (width || height)) parts.push(`c_${crop}`);
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if (crop === "thumb" && (width || height)) parts.push("g_auto");

  return `${prefix}${parts.join(",")}/${rest}`;
};

/**
 * Optimizes Unsplash image URLs by setting width, auto format, and quality.
 */
export const optimizeUnsplashUrl = (
  url,
  { width = 400, quality = 75 } = {}
) => {
  if (!url || typeof url !== "string" || !url.includes("images.unsplash.com")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (width) parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("auto", "format");
    if (quality) parsed.searchParams.set("q", String(quality));
    return parsed.toString();
  } catch (_) {
    return url;
  }
};

/**
 * Universal image URL optimization helper.
 * Applies host-specific optimizations; passes through non-Cloudinary/non-Unsplash hosts untouched.
 */
export const optimizeImageUrl = (url, options = {}) => {
  if (!url || typeof url !== "string") return url || "";
  const trimmed = url.trim();

  if (!isValidImageUrl(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes("res.cloudinary.com")) {
    return optimizeCloudinaryUrl(trimmed, options);
  }

  if (trimmed.includes("images.unsplash.com")) {
    return optimizeUnsplashUrl(trimmed, options);
  }

  // Non-Cloudinary hosts (e.g. img.sanishtech.com, local assets) are preserved safely
  return trimmed;
};

/**
 * Convenient presets
 */
export const getThumbnailUrl = (url, size = 80) =>
  optimizeImageUrl(url, { width: size, height: size, crop: "thumb" });

export const getCardImageUrl = (url, width = 400) =>
  optimizeImageUrl(url, { width, crop: "limit" });

export const getHeroImageUrl = (url, width = 800) =>
  optimizeImageUrl(url, { width, crop: "limit" });

/**
 * Returns a responsive srcSet string for Cloudinary and Unsplash URLs.
 * Returns undefined for other hosts to preserve original behavior.
 */
export const getResponsiveSrcSet = (url, widths = [320, 480, 768]) => {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (
    !trimmed.includes("res.cloudinary.com") &&
    !trimmed.includes("images.unsplash.com")
  ) {
    return undefined;
  }
  return widths
    .map((w) => `${optimizeImageUrl(trimmed, { width: w, crop: "limit" })} ${w}w`)
    .join(", ");
};
