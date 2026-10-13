/**
 * Image URL Optimization Utility for BellBite
 * Supports Cloudinary delivery transformations and Unsplash query optimizations.
 * Maps known heavy unoptimized assets to lightweight, responsive local WebPs.
 * Leaves other hosts (e.g. img.sanishtech.com, local public paths) safe and untouched.
 */

export const IMAGE_SIZES = {
  THUMBNAIL: 80, // Table rows, pills, circular avatars, cart icons
  CARD: 400, // Product & combo grid cards
  HERO: 800, // Detail pages, hero showcase
};

/**
 * Local pre-compressed WebP assets for known production items.
 * Drastically reduces payload for oversized uploads (e.g. 6.07 MB down to ~103 KB / 2.5 KB)
 * without requiring production database mutations.
 */
const KNOWN_OPTIMIZED_ASSETS = {
  // Chilli Garlic Vada Pav (original was 6.07 MB PNG on img.sanishtech.com)
  "https://img.sanishtech.com/u/b0336ef33366c6784070f94448451144.png": {
    hero: "/images/chilli-garlic-vada-pav.webp",
    card: "/images/chilli-garlic-vada-pav-card.webp",
    thumb: "/images/chilli-garlic-vada-pav-thumb.webp",
  },
  // Tandoori Vada Pav (original was 1.73 MB PNG on img.sanishtech.com)
  "https://img.sanishtech.com/u/4cf13a5c0ff7c1e280915dcfe445d79f.png": {
    hero: "/images/tandoori-vada-pav.webp",
    card: "/images/tandoori-vada-pav-card.webp",
    thumb: "/images/tandoori-vada-pav-thumb.webp",
  },
  // Classic Vada Pav (original was 157 KB JPEG on img.sanishtech.com)
  "https://img.sanishtech.com/u/af087ee9c0f28b490c998dbf551f6c30.jpeg": {
    hero: "/images/classic-vada-pav.webp",
    card: "/images/classic-vada-pav-card.webp",
    thumb: "/images/classic-vada-pav-thumb.webp",
  },
  // Cheese Vada Pav (original was 164 KB JPEG on img.sanishtech.com)
  "https://img.sanishtech.com/u/f1edc8728219ea798fb48040d5d7e007.jpeg": {
    hero: "/images/cheese-vada-pav.webp",
    card: "/images/cheese-vada-pav-card.webp",
    thumb: "/images/cheese-vada-pav-thumb.webp",
  },
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

  // Check for local pre-compressed WebP asset
  const localMatch = KNOWN_OPTIMIZED_ASSETS[trimmed];
  if (localMatch) {
    const width = options.width || 400;
    if (width <= 120 || options.crop === "thumb") {
      return localMatch.thumb;
    }
    if (width <= 480) {
      return localMatch.card;
    }
    return localMatch.hero;
  }

  if (trimmed.includes("res.cloudinary.com")) {
    return optimizeCloudinaryUrl(trimmed, options);
  }

  if (trimmed.includes("images.unsplash.com")) {
    return optimizeUnsplashUrl(trimmed, options);
  }

  // Non-Cloudinary hosts (e.g. other unmapped img.sanishtech.com, local assets) are preserved safely
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
 * Returns a responsive srcSet string for Cloudinary, Unsplash, or known local WebP assets.
 * Returns undefined for other hosts to preserve original behavior.
 */
export const getResponsiveSrcSet = (url, widths = [320, 480, 768]) => {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();

  const localMatch = KNOWN_OPTIMIZED_ASSETS[trimmed];
  if (localMatch) {
    return `${localMatch.card} 400w, ${localMatch.hero} 800w`;
  }

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
