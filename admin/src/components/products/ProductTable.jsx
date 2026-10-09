import React from "react";
import ProductStatusBadge from "./ProductStatusBadge";
import StockIndicator from "./StockIndicator";

/**
 * ProductTable
 * Renders compact table on desktop/tablet (md+) and cards on mobile (< md).
 */
const ProductTable = ({
  products = [],
  onEdit,
  onDelete,
  onToggleAvailability,
  togglingIds = new Set(),
}) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <div>
      {/* 1. Desktop & Tablet Table (md and up) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th scope="col" className="py-3.5 pl-5 pr-3">Product</th>
                <th scope="col" className="px-3 py-3.5">Category</th>
                <th scope="col" className="px-3 py-3.5">Price</th>
                <th scope="col" className="px-3 py-3.5">Stock</th>
                <th scope="col" className="px-3 py-3.5">Preparation</th>
                <th scope="col" className="px-3 py-3.5">Availability</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {products.map((product) => {
                const isToggling = togglingIds.has(product.id);
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Product: Thumbnail + Name + Slug */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <p className="font-semibold text-white truncate text-sm">
                            {product.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            /{product.slug || product.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {product.category?.name || "Uncategorized"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3.5 whitespace-nowrap font-semibold text-white">
                      ₹{product.price}
                    </td>

                    {/* Stock */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <StockIndicator
                        stock={product.stock}
                        lowStockThreshold={product.lowStockThreshold}
                      />
                    </td>

                    {/* Preparation Time */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-300">
                      {product.preparationTime !== undefined ? `${product.preparationTime} min` : "10 min"}
                    </td>

                    {/* Availability Status Badge & Quick Toggle */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <ProductStatusBadge
                        isAvailable={product.isAvailable}
                        onToggle={() => onToggleAvailability(product)}
                        loading={isToggling}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          title="Edit product"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-300 border border-slate-700/60 hover:border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        {/* Disable / Delete Button */}
                        <button
                          type="button"
                          onClick={() => onDelete(product)}
                          title="Disable product"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/15 hover:text-rose-400 text-slate-400 border border-slate-700/60 hover:border-rose-500/30 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mobile Cards Layout (under md) */}
      <div className="md:hidden space-y-3.5">
        {products.map((product) => {
          const isToggling = togglingIds.has(product.id);
          return (
            <div
              key={product.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-white text-base truncate leading-tight">
                      {product.name}
                    </h4>
                    <span className="font-bold text-white text-base whitespace-nowrap">
                      ₹{product.price}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                      {product.category?.name || "Uncategorized"}
                    </span>
                    <span className="text-xs text-slate-400">
                      ⏱ {product.preparationTime || 10} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Stock row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <StockIndicator
                  stock={product.stock}
                  lowStockThreshold={product.lowStockThreshold}
                />

                <ProductStatusBadge
                  isAvailable={product.isAvailable}
                  onToggle={() => onToggleAvailability(product)}
                  loading={isToggling}
                />
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onEdit(product)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700"
                  title="Disable product"
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
    </div>
  );
};

export default ProductTable;
