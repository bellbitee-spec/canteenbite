import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Layers, ShoppingBag } from "lucide-react";
import { getThumbnailUrl } from "../../utils/imageUtils";
import { getFoodImage } from "../../utils/foodImages";

/**
 * OrderSummary Component
 * Displays order items breakdown, product/combo distinction, quantities, subtotals,
 * and authoritative final amount for student checkout.
 * Supports variant="items" | "breakdown" | "full" (default: "full").
 */
const OrderSummary = ({
  items = [],
  subtotal = 0,
  itemCount = 0,
  showEditLink = true,
  variant = "full",
  className = "",
}) => {
  const renderItemsList = () => (
    <div className="bg-white rounded-3xl border border-[#EBD4DC] p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#EBD4DC] pb-3">
        <h2 className="text-base font-bold text-[#352431] tracking-tight flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-[#C94F78]" />
          <span>Items in Your Order ({itemCount})</span>
        </h2>
        {showEditLink && (
          <Link
            to="/cart"
            className="text-xs font-bold text-[#C94F78] hover:text-[#B33D65] hover:underline"
          >
            Edit tray
          </Link>
        )}
      </div>

      <div className="divide-y divide-[#EBD4DC]/60">
        {items.map((item) => {
          const lineSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          const isCombo = item.itemType === "COMBO";

          return (
            <div
              key={`${item.itemType || "PRODUCT"}_${item.id}`}
              className="py-3 flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.image ? (
                  <img
                    src={getThumbnailUrl(item.image, 96)}
                    alt={item.name}
                    width="48"
                    height="48"
                    loading="lazy"
                    decoding="async"
                    className="w-12 h-12 rounded-2xl object-cover bg-[#FBE7EE] shrink-0 border border-[#EBD4DC]"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFoodImage(item);
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center shrink-0 border border-[#EBD4DC]">
                    {isCombo ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <UtensilsCrossed className="w-5 h-5" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[#352431] truncate text-xs sm:text-sm">
                      {item.name}
                    </span>
                    {isCombo && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#C94F78] bg-[#FBE7EE] border border-[#EBD4DC] px-1.5 py-0.5 rounded-md">
                        Combo Meal
                      </span>
                    )}
                  </div>
                  <span className="text-[#735A67] text-xs font-medium block mt-0.5">
                    ₹{item.price} × {item.quantity}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-[#352431] text-sm">
                  ₹{lineSubtotal}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBreakdown = () => (
    <div className="space-y-2.5 text-xs sm:text-sm">
      <div className="flex justify-between text-[#735A67]">
        <span>Total Items</span>
        <span className="font-bold text-[#352431]">{itemCount} items</span>
      </div>

      <div className="flex justify-between text-[#735A67]">
        <span>Subtotal</span>
        <span className="font-bold text-[#352431]">₹{subtotal}</span>
      </div>

      <div className="flex justify-between text-[#735A67]">
        <span>Counter Pickup</span>
        <span className="font-bold text-[#5F9A68] uppercase text-xs">FREE</span>
      </div>

      <div className="pt-3 border-t border-[#EBD4DC] flex justify-between items-baseline">
        <div>
          <span className="font-bold text-base text-[#352431] block">
            Total Due
          </span>
          <span className="text-[10px] text-[#927681] font-medium">
            Authoritative backend price
          </span>
        </div>
        <span className="font-bold text-2xl text-[#C94F78]">
          ₹{subtotal}
        </span>
      </div>
    </div>
  );

  if (variant === "items") {
    return <div className={className}>{renderItemsList()}</div>;
  }

  if (variant === "breakdown") {
    return <div className={className}>{renderBreakdown()}</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {renderItemsList()}
      <div className="bg-white rounded-3xl border border-[#EBD4DC] p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-[#352431] tracking-tight">
          Payment Breakdown
        </h3>
        {renderBreakdown()}
      </div>
    </div>
  );
};

export default OrderSummary;
