import React from "react";
import ProductCard from "./ProductCard";
import EmptyState from "../common/EmptyState";
import { ProductCardSkeleton } from "../common/Loader";

const ProductGrid = ({
  products = [],
  loading = false,
  emptyTitle = "No dishes found",
  emptyMessage = "There are no products available in this section right now.",
  onResetSearch,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <ProductCardSkeleton key={n} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionText={onResetSearch ? "Clear Filters" : undefined}
        onAction={onResetSearch}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3.5 sm:gap-x-5 gap-y-6 sm:gap-y-8 pt-2">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
        />
      ))}
    </div>
  );
};

export default ProductGrid;

