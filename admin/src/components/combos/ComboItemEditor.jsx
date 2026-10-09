import React, { useMemo } from "react";

/**
 * ComboItemEditor
 * Manages the dynamic list of products and quantities included in a combo meal.
 */
const ComboItemEditor = ({
  items = [],
  onChange,
  availableProducts = [],
  error = null,
}) => {
  // Map of products by ID for fast lookup
  const productMap = useMemo(() => {
    const map = new Map();
    availableProducts.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [availableProducts]);

  // Check if any product in the combo is currently marked unavailable in the catalog
  const unavailableItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.product) return false;
      const prod = productMap.get(item.product);
      return prod && prod.isAvailable === false;
    });
  }, [items, productMap]);

  // Set of already selected product IDs
  const selectedProductIds = useMemo(() => {
    return new Set(items.map((i) => i.product).filter(Boolean));
  }, [items]);

  // Add new item row
  const handleAddItem = () => {
    // Pick the first product that is not already selected and is available
    const unusedProduct = availableProducts.find(
      (p) => !selectedProductIds.has(p.id) && p.isAvailable !== false
    ) || availableProducts[0];

    const nextItems = [
      ...items,
      {
        product: unusedProduct ? unusedProduct.id : "",
        quantity: 1,
      },
    ];
    onChange(nextItems);
  };

  // Remove item row
  const handleRemoveItem = (index) => {
    const nextItems = items.filter((_, idx) => idx !== index);
    onChange(nextItems);
  };

  // Change product in row
  const handleProductChange = (index, newProductId) => {
    const nextItems = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, product: newProductId };
      }
      return item;
    });
    onChange(nextItems);
  };

  // Change quantity in row
  const handleQuantityChange = (index, newQty) => {
    const nextItems = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, quantity: newQty };
      }
      return item;
    });
    onChange(nextItems);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Included Products <span className="text-red-400">*</span>
          </label>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Select at least one product. Inventory is deducted automatically from these component products.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddItem}
          disabled={availableProducts.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>+ Add Product</span>
        </button>
      </div>

      {/* Warning banner for unavailable components */}
      {unavailableItems.length > 0 && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="leading-snug">
            <span className="font-semibold">Notice:</span> One or more products in this combo are currently marked unavailable in the catalog. Students will not be able to order this combo until all component products are active.
          </div>
        </div>
      )}

      {/* Item rows */}
      {items.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-400 text-xs">
          No products added yet. Click &quot;+ Add Product&quot; to include items in this combo.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => {
            const currentProd = productMap.get(item.product);
            const isProdUnavailable = currentProd && currentProd.isAvailable === false;
            const isOutOfStock = currentProd && Number(currentProd.stock) === 0;

            return (
              <div
                key={index}
                className={`p-3 rounded-xl bg-slate-950/60 border transition-colors flex flex-col sm:flex-row sm:items-center gap-3 ${
                  isProdUnavailable
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-slate-800"
                }`}
              >
                {/* Product Select Dropdown */}
                <div className="flex-1">
                  <label
                    htmlFor={`combo-product-${index}`}
                    className="sr-only"
                  >
                    Select product for item {index + 1}
                  </label>
                  <select
                    id={`combo-product-${index}`}
                    value={item.product || ""}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      Select product...
                    </option>
                    {availableProducts.map((p) => {
                      const isSelectedElsewhere =
                        selectedProductIds.has(p.id) && p.id !== item.product;
                      return (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={isSelectedElsewhere}
                          className="bg-slate-900 text-white"
                        >
                          {p.name} (₹{p.price})
                          {p.isAvailable === false ? " — [Unavailable]" : ""}
                          {Number(p.stock) === 0 ? " — [Out of stock]" : ""}
                          {isSelectedElsewhere ? " (Already added)" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Informational pricing / warning status */}
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    {currentProd ? (
                      <>
                        <span>Catalog price: ₹{currentProd.price}</span>
                        {isOutOfStock && (
                          <span className="text-rose-400 font-medium">• 0 in stock</span>
                        )}
                        {isProdUnavailable && (
                          <span className="text-amber-400 font-semibold">• Currently Unavailable</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">Select a product</span>
                    )}
                  </div>
                </div>

                {/* Quantity input */}
                <div className="w-full sm:w-28 flex-shrink-0">
                  <div className="flex items-center rounded-lg border border-slate-750 bg-slate-900 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          index,
                          Math.max(1, (Number(item.quantity) || 1) - 1)
                        )
                      }
                      disabled={Number(item.quantity) <= 1}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white bg-slate-800 disabled:opacity-40 cursor-pointer text-xs"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(
                          index,
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className="w-full py-1 text-center bg-transparent text-slate-100 text-sm font-semibold focus:outline-none"
                      aria-label={`Quantity for item ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          index,
                          (Number(item.quantity) || 0) + 1
                        )
                      }
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white bg-slate-800 cursor-pointer text-xs"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Remove button */}
                <div className="flex-shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    title="Remove product from combo"
                    aria-label={`Remove ${currentProd?.name || "product"} from combo`}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
};

export default ComboItemEditor;
