import React, { useState } from "react";
import { Sparkles, Clock, Plus, Minus, Layers } from "lucide-react";
import useCart from "../../hooks/useCart";
import { getFoodImage } from "../../utils/foodImages";

const ComboCard = ({ combo }) => {
  const { addCombo, increaseQuantity, decreaseQuantity, getItemQuantity } =
    useCart();
  const [imageError, setImageError] = useState(false);

  const isUnavailable = combo.isAvailable === false;
  const quantity = getItemQuantity(combo.id, "COMBO");
  const inCart = quantity > 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!isUnavailable) {
      addCombo(combo);
    }
  };

  const handleIncrease = (e) => {
    e.preventDefault();
    increaseQuantity(combo.id, "COMBO");
  };

  const handleDecrease = (e) => {
    e.preventDefault();
    decreaseQuantity(combo.id, "COMBO");
  };

  const imageUrl = !imageError && combo.image ? combo.image : getFoodImage(combo);

  return (
    <div className="bg-white rounded-[2rem] p-5 shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between relative overflow-hidden group border border-slate-100/70 select-none">
      {/* Top Value Tag */}
      <div className="absolute top-0 right-0 bg-brand-500 text-white font-black text-[10px] uppercase px-3.5 py-1 rounded-bl-2xl tracking-wider flex items-center gap-1 shadow-xs z-10">
        <Sparkles className="w-3 h-3" />
        <span>Best Value</span>
      </div>

      <div>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-50 overflow-hidden shrink-0 shadow-dish ring-3 ring-white group-hover:scale-105 transition-transform duration-300">
            <img
              src={imageUrl}
              alt={combo.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>

          <div className="min-w-0 pr-12">
            <h3 className="font-black text-base text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight">
              {combo.name}
            </h3>
            {combo.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {combo.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{combo.preparationTime || 12} min prep</span>
              </span>
              <span>•</span>
              <span className="text-brand-600 font-extrabold">
                {combo.items?.length || 0} items included
              </span>
            </div>
          </div>
        </div>

        {/* Included Items Tag List */}
        {combo.items && combo.items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-50 flex flex-wrap gap-1.5">
            {combo.items.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-50 text-slate-700 px-2.5 py-1 rounded-xl"
              >
                <span>{item.product?.name || "Dish"}</span>
                <span className="font-extrabold text-brand-600">
                  ×{item.quantity}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Price & Add Controls */}
      <div className="mt-5 pt-3.5 border-t border-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none mb-0.5">
            Bundle Price
          </span>
          <span className="text-xl font-black text-slate-900 tracking-tight">
            ₹{combo.price}
          </span>
        </div>

        {isUnavailable ? (
          <span className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 text-slate-400 cursor-not-allowed">
            Unavailable
          </span>
        ) : inCart ? (
          <div className="flex items-center gap-1 bg-brand-500 text-white rounded-full p-1 shadow-xs">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
              aria-label={`Decrease ${combo.name} quantity`}
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="w-5 text-center font-black text-xs text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrease}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
              aria-label={`Increase ${combo.name} quantity`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-brand-500 text-white font-black text-xs transition-all active:scale-95 shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Combo</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ComboCard;
