import React, { useState } from "react";
import { Plus, Minus, Trash2, Clock, Layers, UtensilsCrossed } from "lucide-react";
import useCart from "../../hooks/useCart";
import { calculateItemSubtotal } from "../../utils/cartUtils";
import { getFoodImage } from "../../utils/foodImages";

const CartItem = ({ item }) => {
  const { increaseQuantity, decreaseQuantity, removeItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const itemSubtotal = calculateItemSubtotal(item);
  const isCombo = item.itemType === "COMBO";
  const imageUrl = (!imageError && item.image) ? item.image : getFoodImage(item);

  return (
    <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EBD4DC] shadow-sm hover:shadow-md transition-all">
      {/* Left Column: Image & Details */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#FBE7EE] overflow-hidden shrink-0 flex items-center justify-center text-[#927681] border border-[#EBD4DC]">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : isCombo ? (
            <Layers className="w-6 h-6 text-[#C94F78]" />
          ) : (
            <UtensilsCrossed className="w-6 h-6 text-[#927681]" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC]/60">
              {isCombo ? "Combo" : "Dish"}
            </span>
            {item.preparationTime && (
              <span className="text-[11px] text-[#927681] font-medium flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-[#C94F78]" />
                <span>{item.preparationTime}m</span>
              </span>
            )}
          </div>

          <h4 className="font-extrabold text-xs sm:text-sm text-[#352431] truncate mt-0.5 tracking-tight">
            {item.name}
          </h4>

          <span className="text-xs text-[#735A67] font-bold block mt-0.5">
            ₹{item.price} <span className="text-[10px] text-[#927681] font-normal">each</span>
          </span>
        </div>
      </div>

      {/* Right Column: Quantity Controls & Subtotal */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 bg-[#FBE7EE] p-1 rounded-full border border-[#EBD4DC]">
          <button
            type="button"
            onClick={() => decreaseQuantity(item.id, item.itemType)}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white text-[#352431] font-bold hover:bg-[#FFF9F2] active:scale-90 transition-all text-xs shadow-xs"
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <Minus className="w-3 h-3" />
          </button>

          <span
            className="w-5 text-center font-bold text-xs text-[#352431]"
            aria-label={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseQuantity(item.id, item.itemType)}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-[#C94F78] text-white font-bold hover:bg-[#B33D65] active:scale-90 transition-all text-xs shadow-xs"
            aria-label={`Increase quantity of ${item.name}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Subtotal & Remove */}
        <div className="text-right sm:min-w-[75px]">
          <span className="font-extrabold text-sm sm:text-base text-[#352431] block tracking-tight">
            ₹{itemSubtotal}
          </span>
          <button
            type="button"
            onClick={() => removeItem(item.id, item.itemType)}
            className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition-colors inline-flex items-center gap-1 mt-0.5"
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;

