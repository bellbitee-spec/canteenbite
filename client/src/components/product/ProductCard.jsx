import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, Clock, Flame } from "lucide-react";
import useCart from "../../hooks/useCart";
import { getFoodImage } from "../../utils/foodImages";
import { getCardImageUrl, getResponsiveSrcSet } from "../../utils/imageUtils";

const ProductCard = ({ product, priority = false }) => {
  const { addProduct, increaseQuantity, decreaseQuantity, getItemQuantity } =
    useCart();
  const [imageError, setImageError] = useState(false);

  const isOutOfStock = !product.isAvailable || product.stock === 0;
  const quantity = getItemQuantity(product.id, "PRODUCT");
  const inCart = quantity > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addProduct(product);
    }
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    increaseQuantity(product.id, "PRODUCT");
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    e.stopPropagation();
    decreaseQuantity(product.id, "PRODUCT");
  };

  const isVeg = product.isVeg !== undefined ? Boolean(product.isVeg) : true;
  const rawImageUrl = !imageError && product.image ? product.image : getFoodImage(product);
  const imageUrl = getCardImageUrl(rawImageUrl);
  const srcSet = getResponsiveSrcSet(rawImageUrl, [280, 400, 600]);

  return (
    <article className="group flex flex-col justify-between h-full rounded-2xl border border-[#EBD4DC] bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#C94F78]/10 overflow-hidden select-none">
      {/* Top Food Image Container */}
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-[1.18] overflow-hidden rounded-xl bg-[#FBE7EE] block"
        aria-label={`View details for ${product.name}`}
      >
        <img
          src={imageUrl}
          srcSet={srcSet}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          alt={product.name}
          width="400"
          height="340"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? { fetchPriority: "high" } : { fetchPriority: "low" })}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
          onError={(e) => {
            if (!imageError) {
              setImageError(true);
            } else {
              e.currentTarget.onerror = null;
            }
          }}
        />

        {/* Tag / Category Badge (Top Left) */}
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
          <span className="rounded-full bg-[#FFF9F2]/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-[#C94F78] shadow-xs">
            {product.category?.name || "Campus Special"}
          </span>
          {product.stock > 0 && product.stock <= (product.lowStockThreshold || 5) && !isOutOfStock && (
            <span className="rounded-full bg-[#C94F78] text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-xs">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Prep Time Pill (Top Right) */}
        <div className="absolute right-2 top-2 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#352431]/80 backdrop-blur-xs text-[#FFF9F2] text-[10px] font-bold shadow-xs">
            <Clock className="w-2.5 h-2.5 text-[#F3A6BF]" />
            <span>{product.preparationTime ? `${product.preparationTime}m` : "10m"}</span>
          </span>
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-[#352431]/70 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3.5 py-1.5 rounded-full bg-[#FFF9F2] text-[#352431] font-bold text-xs shadow-md tracking-wide">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Card Content Surface */}
      <div className="p-1 pt-3 flex flex-col justify-between flex-1">
        <div>
          {/* Header Row: Title & Veg Indicator */}
          <div className="flex items-start justify-between gap-1">
            <Link
              to={`/product/${product.id}`}
              className="text-base sm:text-lg font-extrabold leading-tight text-[#352431] group-hover:text-[#C94F78] transition-colors line-clamp-1"
              title={product.name}
            >
              {product.name}
            </Link>
            <span
              className={`mt-1 flex size-3 shrink-0 items-center justify-center rounded-sm border ${
                isVeg ? "border-[#5F9A68]" : "border-rose-600"
              }`}
              title={isVeg ? "Pure Vegetarian" : "Non-Vegetarian"}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isVeg ? "bg-[#5F9A68]" : "bg-rose-600"
                }`}
              />
            </span>
          </div>

          {/* Description */}
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#927681]">
            {product.description || "Freshly prepared made-to-order campus food."}
          </p>
        </div>

        {/* Bottom Row: Price & Add Stepper / Button */}
        <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-[#EBD4DC]/60 gap-2">
          <strong className="text-base sm:text-lg font-extrabold text-[#352431]">
            ₹{product.price}
          </strong>

          {/* Action Button / Stepper */}
          {isOutOfStock ? (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#FBE7EE] text-[#927681] cursor-not-allowed">
              Unavailable
            </span>
          ) : inCart ? (
            <div className="flex items-center gap-2 rounded-full bg-[#FBE7EE] px-2.5 py-1 text-[#352431]">
              <button
                type="button"
                onClick={handleDecrease}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white text-[#352431] active:scale-90 transition-all cursor-pointer"
                aria-label={`Decrease ${product.name} quantity`}
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
              </button>
              <span className="w-4 text-center font-bold text-xs text-[#352431]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrease}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white text-[#352431] active:scale-90 transition-all cursor-pointer"
                aria-label={`Increase ${product.name} quantity`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-full border border-[#C94F78] px-3.5 py-1.5 text-xs font-bold text-[#C94F78] transition hover:bg-[#C94F78] hover:text-white active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
