import React from "react";
import ComboStatusBadge from "./ComboStatusBadge";

/**
 * ComboTable
 * Displays combos in a compact desktop table (md+) and cards on mobile (< md).
 */
const ComboTable = ({
  combos = [],
  onEdit,
  onDelete,
  onToggleAvailability,
  togglingIds = new Set(),
}) => {
  if (combos.length === 0) {
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
                <th scope="col" className="py-3.5 pl-5 pr-3">Combo</th>
                <th scope="col" className="px-3 py-3.5">Included Items</th>
                <th scope="col" className="px-3 py-3.5">Price</th>
                <th scope="col" className="px-3 py-3.5">Preparation</th>
                <th scope="col" className="px-3 py-3.5">Availability</th>
                <th scope="col" className="py-3.5 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {combos.map((combo) => {
                const isToggling = togglingIds.has(combo.id);

                return (
                  <tr
                    key={combo.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Combo Info */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {combo.image ? (
                            <img
                              src={combo.image}
                              alt={combo.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <p className="font-semibold text-white truncate text-sm">
                            {combo.name}
                          </p>
                          {combo.description ? (
                            <p className="text-[11px] text-slate-400 truncate">
                              {combo.description}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">
                              No description
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Included Items list */}
                    <td className="px-3 py-3.5">
                      <div className="space-y-1 max-w-xs">
                        {(combo.items || []).map((item, idx) => {
                          const prodName =
                            typeof item.product === "object" && item.product !== null
                              ? item.product.name
                              : "Item";
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1.5 mr-2 mb-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700/60"
                            >
                              <span className="font-medium truncate max-w-[120px]">{prodName}</span>
                              <span className="text-slate-400 font-bold">× {item.quantity}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-3 py-3.5 whitespace-nowrap font-bold text-white">
                      ₹{combo.price}
                    </td>

                    {/* Preparation Time */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-xs text-slate-300">
                      {combo.preparationTime !== undefined ? `${combo.preparationTime} min` : "10 min"}
                    </td>

                    {/* Availability */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <ComboStatusBadge
                        isAvailable={combo.isAvailable}
                        onToggle={() => onToggleAvailability(combo)}
                        loading={isToggling}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEdit(combo)}
                          title="Edit combo"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-300 border border-slate-700/60 hover:border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        {/* Disable Button */}
                        <button
                          type="button"
                          onClick={() => onDelete(combo)}
                          title="Disable combo"
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
        {combos.map((combo) => {
          const isToggling = togglingIds.has(combo.id);

          return (
            <div
              key={combo.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {combo.image ? (
                    <img
                      src={combo.image}
                      alt={combo.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-white text-base truncate leading-tight">
                      {combo.name}
                    </h4>
                    <span className="font-bold text-white text-base whitespace-nowrap">
                      ₹{combo.price}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {combo.description || "Combo deal"}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">
                      ⏱ {combo.preparationTime || 10} min
                    </span>
                  </div>
                </div>
              </div>

              {/* Items chips */}
              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Included Items:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(combo.items || []).map((item, idx) => {
                    const prodName =
                      typeof item.product === "object" && item.product !== null
                        ? item.product.name
                        : "Item";
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-750"
                      >
                        <span>{prodName}</span>
                        <span className="text-slate-400 font-bold">× {item.quantity}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Availability & Actions row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <ComboStatusBadge
                  isAvailable={combo.isAvailable}
                  onToggle={() => onToggleAvailability(combo)}
                  loading={isToggling}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(combo)}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(combo)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700"
                    title="Disable combo"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComboTable;
