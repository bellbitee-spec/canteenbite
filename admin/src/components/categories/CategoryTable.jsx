import React from "react";
import CategoryStatusBadge from "./CategoryStatusBadge";

/**
 * CategoryTable
 * Displays categories in a compact table on desktop/tablet (md+) and cards on mobile (< md).
 */
const CategoryTable = ({
  categories = [],
  productCounts = {},
  onEdit,
  onDelete,
  onToggleStatus,
  togglingIds = new Set(),
}) => {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div>
      {/* 1. Desktop & Tablet Table (md and up) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-[#EBD4DC] bg-white shadow-sakura-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EBD4DC] bg-[#FFF9F2] text-[11px] font-bold text-[#735A67] uppercase tracking-wider">
                <th scope="col" className="py-4 pl-5 pr-3">Category</th>
                <th scope="col" className="px-3 py-4">Description</th>
                <th scope="col" className="px-3 py-4">Products</th>
                <th scope="col" className="px-3 py-4">Sort Order</th>
                <th scope="col" className="px-3 py-4">Status</th>
                <th scope="col" className="py-4 pl-3 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBD4DC] text-sm">
              {categories.map((category) => {
                const count = productCounts[category.id] || 0;
                const isToggling = togglingIds.has(category.id);

                return (
                  <tr
                    key={category.id}
                    className="hover:bg-[#FBE7EE]/30 transition-colors group"
                  >
                    {/* Category: Thumbnail + Name */}
                    <td className="py-3.5 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <svg className="w-5 h-5 text-[#927681]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[200px]">
                          <p className="font-semibold text-[#352431] truncate text-sm">
                            {category.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-3.5 text-xs text-[#735A67] max-w-xs">
                      {category.description ? (
                        <span className="line-clamp-2">{category.description}</span>
                      ) : (
                        <span className="text-[#927681] italic">No description</span>
                      )}
                    </td>

                    {/* Product count */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#FFF9F2] text-[#352431] border border-[#EBD4DC]">
                        <span>{count}</span>
                        <span className="text-[#735A67] font-normal">
                          {count === 1 ? "product" : "products"}
                        </span>
                      </span>
                    </td>

                    {/* Sort order */}
                    <td className="px-3 py-3.5 whitespace-nowrap text-xs text-[#735A67] font-mono">
                      {category.sortOrder !== undefined ? category.sortOrder : 0}
                    </td>

                    {/* Status badge & toggle */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <CategoryStatusBadge
                        isActive={category.isActive}
                        onToggle={() => onToggleStatus(category)}
                        loading={isToggling}
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(category)}
                          title="Edit category"
                          className="px-2.5 py-1.5 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#C94F78] border border-[#EBD4DC] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(category)}
                          title={count > 0 ? "Category has products (options available)" : "Delete category"}
                          className="p-1.5 rounded-xl bg-[#FFF9F2] hover:bg-rose-50 text-[#735A67] hover:text-rose-600 border border-[#EBD4DC] transition-all cursor-pointer"
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
        {categories.map((category) => {
          const count = productCounts[category.id] || 0;
          const isToggling = togglingIds.has(category.id);

          return (
            <div
              key={category.id}
              className="p-4 rounded-3xl bg-white border border-[#EBD4DC] shadow-sakura-card space-y-3.5"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <svg className="w-6 h-6 text-[#927681]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-[#352431] text-base truncate leading-tight">
                      {category.name}
                    </h4>
                    <span className="text-xs text-[#735A67] font-mono">
                      #{category.sortOrder || 0}
                    </span>
                  </div>

                  <p className="text-xs text-[#735A67] mt-1 line-clamp-2">
                    {category.description || "No description provided"}
                  </p>
                </div>
              </div>

              {/* Status and count row */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#EBD4DC] text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#FFF9F2] text-[#352431] border border-[#EBD4DC]">
                  <span>{count}</span>
                  <span className="text-[#735A67] font-normal">
                    {count === 1 ? "product" : "products"}
                  </span>
                </span>

                <CategoryStatusBadge
                  isActive={category.isActive}
                  onToggle={() => onToggleStatus(category)}
                  loading={isToggling}
                />
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#352431] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#EBD4DC] cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  className="p-2 rounded-xl bg-[#FFF9F2] hover:bg-rose-50 text-[#735A67] hover:text-rose-600 transition-colors border border-[#EBD4DC] cursor-pointer"
                  title="Delete or deactivate category"
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

export default CategoryTable;
