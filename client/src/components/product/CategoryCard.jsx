import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getFoodImage, getCategoryIcon } from "../../utils/foodImages";
import { getThumbnailUrl } from "../../utils/imageUtils";

const PASTEL_THEMES = [
  { bg: "bg-amber-100/70 border-amber-200/60 text-amber-800" },
  { bg: "bg-orange-100/70 border-orange-200/60 text-orange-800" },
  { bg: "bg-emerald-100/70 border-emerald-200/60 text-emerald-800" },
  { bg: "bg-purple-100/70 border-purple-200/60 text-purple-800" },
  { bg: "bg-rose-100/70 border-rose-200/60 text-rose-800" },
  { bg: "bg-sky-100/70 border-sky-200/60 text-sky-800" },
];

const CategoryCard = ({ category, isSelected = false }) => {
  const [imgError, setImgError] = useState(false);
  const fallbackUrl = getFoodImage(category);
  const icon = getCategoryIcon(category?.name);

  const hash = (category.name || category.id || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const theme = PASTEL_THEMES[hash % PASTEL_THEMES.length];

  return (
    <Link
      to={`/categories?category=${category.id}`}
      className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer w-[72px] sm:w-[80px] select-none"
    >
      {/* Soft Sakura Container */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-105 group-hover:-translate-y-1 border ${
          isSelected
            ? "bg-[#C94F78] text-white shadow-md shadow-[#C94F78]/25 border-[#C94F78]"
            : "bg-[#FBE7EE] border-[#EBD4DC] text-[#352431] group-hover:border-[#C94F78]/60"
        }`}
      >
        {category.image && !imgError ? (
          <img
            src={getThumbnailUrl(category.image, 80)}
            alt={category.name}
            width="36"
            height="36"
            decoding="async"
            className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-xl"
            onError={(e) => {
              if (!imgError) setImgError(true);
              else e.currentTarget.onerror = null;
            }}
          />
        ) : fallbackUrl && !imgError ? (
          <img
            src={getThumbnailUrl(fallbackUrl, 80)}
            alt={category.name}
            width="36"
            height="36"
            decoding="async"
            className="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-xl"
            onError={(e) => {
              if (!imgError) setImgError(true);
              else e.currentTarget.onerror = null;
            }}
          />
        ) : (
          <span className="text-2xl sm:text-3xl select-none">{icon}</span>
        )}
      </div>

      {/* Category Label Underneath */}
      <span
        className={`font-bold text-[11px] sm:text-xs truncate tracking-tight text-center w-full block transition-colors leading-tight ${
          isSelected ? "text-[#C94F78] font-black" : "text-[#735A67] group-hover:text-[#C94F78]"
        }`}
        title={category.name}
      >
        {category.name}
      </span>
    </Link>
  );
};

export default CategoryCard;
