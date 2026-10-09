import React from "react";

const StockBadge = ({ stock = 0, lowStockThreshold = 5, isAvailable = true }) => {
  if (!isAvailable || stock === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-xs backdrop-blur-xs">
        Out of stock
      </span>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs backdrop-blur-xs">
        Only {stock} left
      </span>
    );
  }

  return null; // Don't clutter product card if abundant stock
};

export default StockBadge;

