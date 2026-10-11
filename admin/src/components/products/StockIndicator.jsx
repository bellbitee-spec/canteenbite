import React from "react";

/**
 * StockIndicator
 * Displays stock count with contextual status badge (Out of stock, Low stock, In stock)
 * based on the product's individual lowStockThreshold.
 */
const StockIndicator = ({ stock = 0, lowStockThreshold = 5 }) => {
  const numericStock = Number(stock) || 0;
  const threshold = Number(lowStockThreshold) >= 0 ? Number(lowStockThreshold) : 5;

  if (numericStock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Out of stock</span>
      </span>
    );
  }

  if (numericStock <= threshold) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Low stock ({numericStock})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#735A67]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#5F9A68]" />
      <span>{numericStock} in stock</span>
    </span>
  );
};

export default StockIndicator;
