import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, Clock, Flame } from "lucide-react";
import useCart from "../../hooks/useCart";
import { getFoodImage } from "../../utils/foodImages";

const ProductCard = ({ product }) => {
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
  const imageUrl = !imageError && product.image ? product.image : getFoodImage(product);

  return (
    <div className="group flex flex-col justify-between h-full bg-white rounded-3xl border border-slate-100/90 shadow-2xs hover:shadow-card hover:-translate-y-1 transition-all duration-300 overflow-hidden select-none">
      {/* Top Food Image Container (Reference Inspired) */}
      <Link
        to={`/product/${product.id}`}
        className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden block"
        aria-label={`View details for ${product.name}`}
      >
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImageError(true)}
        />

        {/* Veg/Non-Veg Badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <div
            className={`w-4 h-4 rounded-xs border bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-2xs ${
              isVeg ? "border-emerald-600" : "border-rose-600"
            }`}
            title={isVeg ? "Pure Vegetarian" : "Non-Vegetarian"}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isVeg ? "bg-emerald-600" : "bg-rose-600"
              }`}
            />
          </div>
        </div>

        {/* Prep Time Pill (Top Right) */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold shadow-xs">
            <Clock className="w-2.5 h-2.5 text-brand-300" />
            <span>{product.preparationTime ? `${product.preparationTime}m` : "10m"}</span>
          </span>
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-white text-slate-800 font-black text-xs shadow-xs">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Card Content Surface */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
        <div>
          {/* Category Tag */}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            {product.category?.name || "Campus Specialty"}
          </span>

          {/* Dish Name */}
          <Link
            to={`/product/${product.id}`}
            className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1 tracking-tight mt-0.5 block"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Description */}
          <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5 leading-relaxed">
            {product.description || "Freshly made made-to-order campus food."}
          </p>
        </div>

        {/* Bottom Row: Price & Add Stepper / Button */}
        <div className="mt-3.5 pt-2.5 flex items-center justify-between border-t border-slate-50 gap-2">
          <div>
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight block leading-tight">
              ₹{product.price}
            </span>
          </div>

          {/* Action Button */}
          {isOutOfStock ? (
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed">
              Unavailable
            </span>
          ) : inCart ? (
            <div className="flex items-center gap-1.5 bg-brand-500 text-white rounded-full px-1.5 py-1 shadow-xs">
              <button
                type="button"
                onClick={handleDecrease}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                aria-label={`Decrease ${product.name} quantity`}
              >
                <Minus className="w-3 h-3 stroke-[2.5]" />
              </button>
              <span className="w-4 text-center font-black text-xs">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrease}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                aria-label={`Increase ${product.name} quantity`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-all duration-200 active:scale-90 shadow-sm shadow-brand-500/30 cursor-pointer"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
