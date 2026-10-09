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
    <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs hover:shadow-subtle transition-all">
      {/* Left Column: Image & Details */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border border-slate-100">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : isCombo ? (
            <Layers className="w-6 h-6 text-brand-500" />
          ) : (
            <UtensilsCrossed className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                isCombo
                  ? "bg-purple-100 text-purple-700"
                  : "bg-brand-100 text-brand-700"
              }`}
            >
              {isCombo ? "Combo" : "Dish"}
            </span>
            {item.preparationTime && (
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                <span>{item.preparationTime}m</span>
              </span>
            )}
          </div>

          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate mt-0.5 tracking-tight">
            {item.name}
          </h4>

          <span className="text-xs text-slate-500 font-bold block mt-0.5">
            ₹{item.price} <span className="text-[10px] text-slate-400 font-normal">each</span>
          </span>
        </div>
      </div>

      {/* Right Column: Quantity Controls & Subtotal */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
        {/* Quantity Controls */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={() => decreaseQuantity(item.id, item.itemType)}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 active:scale-90 transition-all text-xs shadow-subtle"
            aria-label={`Decrease quantity of ${item.name}`}
          >
            <Minus className="w-3 h-3" />
          </button>

          <span
            className="w-6 text-center font-black text-xs text-slate-800"
            aria-label={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => increaseQuantity(item.id, item.itemType)}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg bg-brand-500 text-white font-bold hover:bg-brand-600 active:scale-90 transition-all text-xs shadow-subtle"
            aria-label={`Increase quantity of ${item.name}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Subtotal & Remove */}
        <div className="text-right sm:min-w-[75px]">
          <span className="font-black text-sm sm:text-base text-slate-900 block tracking-tight">
            ₹{itemSubtotal}
          </span>
          <button
            type="button"
            onClick={() => removeItem(item.id, item.itemType)}
            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors inline-flex items-center gap-1 mt-0.5"
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

