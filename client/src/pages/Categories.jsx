import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Utensils } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import ProductGrid from "../components/product/ProductGrid";
import CategoryCard from "../components/product/CategoryCard";
import Loader, { CategoryPillSkeleton } from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import {
  getCategories,
  getProductsByCategory,
  getProducts,
} from "../services/productService";

const Categories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryId = searchParams.get("category");

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories list
  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCategories(true);
        setError(null);
        const data = await getCategories();
        setCategories(data || []);
      } catch (err) {
        setError(err.message || "Failed to load categories");
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCats();
  }, []);

  // Fetch products when selected category changes
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoadingProducts(true);
        setError(null);

        if (selectedCategoryId) {
          const data = await getProductsByCategory(selectedCategoryId);
          setProducts(data || []);
        } else {
          const data = await getProducts();
          setProducts(data || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load products for category");
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCategoryProducts();
  }, [selectedCategoryId]);

  const handleSelectCategory = (catId) => {
    if (selectedCategoryId === catId) {
      setSearchParams({});
    } else {
      setSearchParams({ category: catId });
    }
  };

  const selectedCategoryObj = categories.find(
    (c) => c.id === selectedCategoryId
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl select-none">🥗</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#352431] tracking-tight">
            Categories
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#735A67] font-medium">
          Choose a section to browse freshly prepped dishes and drinks.
        </p>
      </div>

      {loadingCategories ? (
        <div className="space-y-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-20 h-28 rounded-3xl bg-[#FBE7EE]/60 border border-[#EBD4DC]/60 animate-pulse shrink-0"
              />
            ))}
          </div>
          <ProductGrid loading={true} products={[]} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : (
        <div className="space-y-8">
          {/* Capsule Category Row */}
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
            {/* "All" button */}
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer w-[72px] sm:w-[80px] select-none text-left"
              aria-pressed={!selectedCategoryId}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-105 group-hover:-translate-y-1 ${
                  !selectedCategoryId
                    ? "bg-[#C94F78] text-white shadow-md shadow-[#C94F78]/25 ring-2 ring-[#C94F78]/30 border-2 border-[#C94F78]"
                    : "bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 border border-[#EBD4DC] group-hover:border-[#C94F78]/60 text-[#352431]"
                }`}
              >
                <span className="text-2xl sm:text-3xl select-none">🍱</span>
              </div>
              <span
                className={`font-bold text-[11px] sm:text-xs truncate tracking-tight text-center w-full block transition-colors leading-tight ${
                  !selectedCategoryId ? "text-[#C94F78] font-black" : "text-[#735A67] group-hover:text-[#C94F78]"
                }`}
              >
                All
              </span>
            </button>

            {/* Category capsules */}
            {categories.map((cat) => {
              const isSelected = cat.id === selectedCategoryId;
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={isSelected}
                  onClick={() => handleSelectCategory(cat.id)}
                />
              );
            })}
          </div>

          {/* Active Category Header & Products */}
          <div className="pt-2">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#352431] tracking-tight">
                  {selectedCategoryObj
                    ? selectedCategoryObj.name
                    : "All Menu Items"}
                </h2>
                <p className="text-xs text-[#735A67] font-medium mt-0.5">
                  {selectedCategoryObj?.description
                    ? selectedCategoryObj.description
                    : `Showing ${products.length} dish${products.length === 1 ? "" : "es"} available today`}
                </p>
              </div>

              {selectedCategoryId && (
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className="text-xs font-bold text-[#C94F78] hover:text-[#B33D65] hover:underline self-start sm:self-auto cursor-pointer"
                >
                  Show all categories
                </button>
              )}
            </div>

            <ProductGrid
              products={products}
              loading={loadingProducts}
              emptyTitle="No items in this category"
              emptyMessage="There are currently no dishes listed in this section of the canteen."
              onResetSearch={
                selectedCategoryId ? () => setSearchParams({}) : undefined
              }
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Categories;
