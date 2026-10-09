import React from "react";
import { Link } from "react-router-dom";
import { UtensilsCrossed, Layers, ShoppingBag } from "lucide-react";

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
    <div className="bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-brand-500" />
          <span>Items in Your Order ({itemCount})</span>
        </h2>
        {showEditLink && (
          <Link
            to="/cart"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Edit tray
          </Link>
        )}
      </div>

      <div className="divide-y divide-slate-100">
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
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-12 h-12 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center shrink-0 border border-brand-100/50">
                    {isCombo ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <UtensilsCrossed className="w-5 h-5" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-slate-900 truncate text-xs sm:text-sm">
                      {item.name}
                    </span>
                    {isCombo && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200/60 px-1.5 py-0.5 rounded-md">
                        Combo Meal
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs font-medium block mt-0.5">
                    ₹{item.price} × {item.quantity}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-black text-slate-900 text-sm">
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
      <div className="flex justify-between text-slate-600">
        <span>Total Items</span>
        <span className="font-bold text-slate-900">{itemCount} items</span>
      </div>

      <div className="flex justify-between text-slate-600">
        <span>Subtotal</span>
        <span className="font-bold text-slate-900">₹{subtotal}</span>
      </div>

      <div className="flex justify-between text-slate-600">
        <span>Counter Pickup</span>
        <span className="font-black text-emerald-600 uppercase text-xs">FREE</span>
      </div>

      <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
        <div>
          <span className="font-black text-base text-slate-900 block">
            Total Due
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Authoritative backend price
          </span>
        </div>
        <span className="font-black text-2xl text-slate-900">
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
      <div className="bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-card space-y-3">
        <h3 className="font-black text-sm text-slate-900 tracking-tight">
          Payment Breakdown
        </h3>
        {renderBreakdown()}
      </div>
    </div>
  );
};

export default OrderSummary;
