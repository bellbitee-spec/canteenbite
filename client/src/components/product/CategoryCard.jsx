import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getFoodImage, getCategoryIcon } from "../../utils/foodImages";
import { getThumbnailUrl } from "../../utils/imageUtils";

const CategoryCard = ({ category, isSelected = false, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const fallbackUrl = getFoodImage(category);
  const icon = getCategoryIcon(category?.name);
  const imageUrl = category.image || fallbackUrl;
  const hasImage = Boolean(imageUrl && !imgError);

  const cardContent = (
    <>
      {/* Full Cover Card Container */}
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl overflow-hidden relative flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-105 group-hover:-translate-y-1 ${
          isSelected
            ? "border-2 border-[#C94F78] ring-2 ring-[#C94F78]/30 shadow-md shadow-[#C94F78]/25"
            : "border border-[#EBD4DC] group-hover:border-[#C94F78]/60 bg-[#FBE7EE]"
        }`}
      >
        {hasImage ? (
          <img
            src={getThumbnailUrl(imageUrl, 160)}
            alt={category.name}
            decoding="async"
            className="w-full h-full object-cover block"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              isSelected ? "bg-[#C94F78] text-white" : "bg-[#FBE7EE] text-[#352431]"
            }`}
          >
            <span className="text-2xl sm:text-3xl select-none">{icon}</span>
          </div>
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
    </>
  );

  const containerClasses =
    "flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer w-[72px] sm:w-[80px] select-none text-left";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={containerClasses}
        aria-pressed={isSelected}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      to={`/categories?category=${category.id}`}
      className={containerClasses}
    >
      {cardContent}
    </Link>
  );
};

export default CategoryCard;
