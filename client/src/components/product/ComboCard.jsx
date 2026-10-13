import React, { useState } from "react";
import { Sparkles, Clock, Plus, Minus, Layers } from "lucide-react";
import useCart from "../../hooks/useCart";
import { getFoodImage } from "../../utils/foodImages";
import { getThumbnailUrl } from "../../utils/imageUtils";

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

  const rawImageUrl = !imageError && combo.image ? combo.image : getFoodImage(combo);
  const imageUrl = getThumbnailUrl(rawImageUrl, 200);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg hover:shadow-[#C94F78]/10 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group border border-[#EBD4DC] select-none">
      {/* Top Value Tag */}
      <div className="absolute top-0 right-0 bg-[#C94F78] text-white font-bold text-[10px] uppercase px-3.5 py-1 rounded-bl-2xl tracking-wider flex items-center gap-1 shadow-xs z-10">
        <Sparkles className="w-3 h-3" />
        <span>Best Value</span>
      </div>

      <div>
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-[#FBE7EE] overflow-hidden shrink-0 border border-[#EBD4DC] group-hover:scale-105 transition-transform duration-300">
            <img
              src={imageUrl}
              alt={combo.name}
              width="88"
              height="88"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
              onError={(e) => {
                if (!imageError) {
                  setImageError(true);
                } else {
                  e.currentTarget.onerror = null;
                }
              }}
            />
          </div>

          <div className="min-w-0 pr-12">
            <h3 className="font-extrabold text-base text-[#352431] group-hover:text-[#C94F78] transition-colors tracking-tight">
              {combo.name}
            </h3>
            {combo.description && (
              <p className="text-xs text-[#927681] mt-1 line-clamp-2 leading-relaxed">
                {combo.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-[#735A67]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#C94F78]" />
                <span>{combo.preparationTime || 12}m prep</span>
              </span>
              <span>•</span>
              <span className="text-[#C94F78] font-bold">
                {combo.items?.length || 0} items
              </span>
            </div>
          </div>
        </div>

        {/* Included Items Tag List */}
        {combo.items && combo.items.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#EBD4DC]/60 flex flex-wrap gap-1.5">
            {combo.items.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#FBE7EE] text-[#735A67] px-2.5 py-1 rounded-full border border-[#EBD4DC]/60"
              >
                <span>{item.product?.name || "Dish"}</span>
                <span className="font-bold text-[#C94F78]">
                  ×{item.quantity}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Price & Add Controls */}
      <div className="mt-5 pt-3.5 border-t border-[#EBD4DC]/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-[#927681] font-bold uppercase tracking-wider block leading-none mb-0.5">
            Bundle Price
          </span>
          <span className="text-xl font-extrabold text-[#352431] tracking-tight">
            ₹{combo.price}
          </span>
        </div>

        {isUnavailable ? (
          <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-[#FBE7EE] text-[#927681] cursor-not-allowed">
            Unavailable
          </span>
        ) : inCart ? (
          <div className="flex items-center gap-1 bg-[#FBE7EE] text-[#352431] rounded-full p-1 border border-[#EBD4DC]">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-[#352431] active:scale-90 transition-all cursor-pointer"
              aria-label={`Decrease ${combo.name} quantity`}
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="w-5 text-center font-bold text-xs text-[#352431]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrease}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-[#352431] active:scale-90 transition-all cursor-pointer"
              aria-label={`Increase ${combo.name} quantity`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-[#C94F78]/25 flex items-center gap-1.5 cursor-pointer"
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
