import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  Flame,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import ProductGrid from "../components/product/ProductGrid";
import CategoryCard from "../components/product/CategoryCard";
import ComboCard from "../components/product/ComboCard";
import Loader, {
  ProductCardSkeleton,
  CategoryPillSkeleton,
} from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import {
  getProducts,
  getCategories,
  searchProducts,
} from "../services/productService";
import { getCombos } from "../services/comboService";

const POPULAR_TAGS = [
  "Masala Dosa",
  "Cold Coffee",
  "Veg Burger",
  "Paneer Roll",
  "Samosa",
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Sync search query param
  useEffect(() => {
    if (queryParam !== searchTerm) {
      setSearchTerm(queryParam);
    }
  }, [queryParam]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [catsData, prodsData, combosData] = await Promise.all([
        getCategories(),
        getProducts(),
        getCombos(),
      ]);

      setCategories(catsData || []);
      setProducts(prodsData || []);
      setCombos(combosData || []);
    } catch (err) {
      setError(err.message || "Failed to load canteen menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      if (searching) {
        setSearching(false);
        getProducts()
          .then((data) => setProducts(data || []))
          .catch((err) => setError(err.message));
      }
      return;
    }

    setSearching(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchProducts(searchTerm.trim());
        setProducts(results || []);
      } catch (err) {
        setError(err.message);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchParams({});
  };

  const handleTagClick = (tag) => {
    setSearchTerm(tag);
    setSearchParams({ q: tag });
  };

  // Filter products by selected pill
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (selectedFilter === "VEG") {
      return products.filter((p) => p.isVeg !== false);
    }
    if (selectedFilter === "QUICK") {
      return products.filter((p) => (p.preparationTime || 10) <= 10);
    }
    if (selectedFilter === "BUDGET") {
      return products.filter((p) => Number(p.price) <= 50);
    }
    return products;
  }, [products, selectedFilter]);

  return (
    <PageContainer>
      {/* Mobile-Only Search Bar (Matches Reference Screen 2) */}
      <div className="lg:hidden mb-5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) {
                setSearchParams({ q: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            placeholder="Search meals, snacks, drinks..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white text-slate-900 placeholder-slate-400 font-medium text-xs sm:text-sm border border-slate-200/70 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/10 shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= PROMO / TODAY'S SPECIAL BANNER (Reference Screen 2 Inspired) ================= */}
      {!searchTerm && (
        <section className="mb-8 lg:mb-10">
          <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-zinc-900 to-neutral-900 text-white p-6 sm:p-8 md:p-10 shadow-card overflow-hidden">
            {/* Subtle warm amber radial glow */}
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
              {/* Left Column: Headline & CTA */}
              <div className="md:col-span-7 space-y-3.5 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-amber-300 text-xs font-black tracking-wide">
                  <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Today's Special</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.15]">
                  Big Flavor, <br className="hidden sm:inline" />
                  Bigger Happiness.
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md leading-relaxed">
                  Hot & fresh campus meals prepped to order. Skip the crowd and collect at Counter 1 & 2.
                </p>

                <div className="pt-1">
                  <a
                    href="#menu"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-brand-500/30 active:scale-95"
                  >
                    <span>Order Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Right Column: High-Res Food Cutout */}
              <div className="hidden md:flex md:col-span-5 justify-end">
                <div className="relative w-48 h-48 lg:w-56 lg:h-56 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/10">
                  <img
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
                    alt="Campus Burger Special"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search Tags */}
          <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">
              Popular:
            </span>
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="text-[11px] font-semibold text-slate-600 hover:text-brand-600 bg-white hover:bg-brand-50 border border-slate-200/60 px-3 py-1 rounded-full transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {tag}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main State Handling */}
      {loading ? (
        <div className="space-y-12">
          {/* Skeleton category capsules */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-16 h-20 rounded-2xl bg-slate-100 animate-pulse shrink-0"
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="h-6 bg-slate-200 rounded-lg w-48 animate-pulse" />
            <ProductGrid loading={true} products={[]} />
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInitialData} />
      ) : (
        <div className="space-y-10 sm:space-y-12" id="menu">
          {/* ================= CATEGORIES SECTION (Pastel Soft Squares) ================= */}
          {!searchTerm && categories.length > 0 && (
            <section aria-labelledby="categories-heading">
              <div className="flex items-center justify-between mb-3.5">
                <h2
                  id="categories-heading"
                  className="text-lg sm:text-xl font-black text-slate-900 tracking-tight"
                >
                  Categories
                </h2>
                <Link
                  to="/categories"
                  className="text-xs font-bold text-slate-400 hover:text-brand-600 inline-flex items-center gap-1 transition-colors"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Pastel Category Row (Horizontal Scroll Rail on Mobile & Desktop) */}
              <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth">
                {/* "All" Category Pill */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFilter("ALL");
                    setSearchTerm("");
                    setSearchParams({});
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer w-[72px] sm:w-[80px] select-none"
                >
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all duration-300 shadow-2xs group-hover:scale-105 group-hover:-translate-y-1 border ${
                      !searchTerm && selectedFilter === "ALL"
                        ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/20"
                        : "bg-slate-100 hover:bg-slate-200/70 border-slate-200/50 text-slate-800"
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl select-none">🍱</span>
                  </div>
                  <span
                    className={`font-bold text-[11px] sm:text-xs truncate tracking-tight text-center w-full block transition-colors leading-tight ${
                      !searchTerm && selectedFilter === "ALL"
                        ? "text-brand-600 font-black"
                        : "text-slate-700 group-hover:text-brand-600"
                    }`}
                  >
                    All
                  </span>
                </button>

                {categories.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </div>
            </section>
          )}

          {/* ================= POPULAR TODAY / CAMPUS FAVORITES ================= */}
          <section aria-labelledby="products-heading">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2
                  id="products-heading"
                  className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"
                >
                  <span>{searchTerm ? `Search: "${searchTerm}"` : "Popular today"}</span>
                  {!searchTerm && <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {searchTerm
                    ? `Found ${filteredProducts.length} item${filteredProducts.length === 1 ? "" : "s"}`
                    : "Freshly prepped campus favorites made to order"}
                </p>
              </div>

              {/* Filter Chips */}
              {!searchTerm && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("ALL")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
                      selectedFilter === "ALL"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 shadow-2xs hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("VEG")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      selectedFilter === "VEG"
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "bg-white text-emerald-700 shadow-2xs hover:bg-emerald-50 border border-emerald-100"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Veg</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("QUICK")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                      selectedFilter === "QUICK"
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-white text-slate-600 shadow-2xs hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>&lt;10m</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("BUDGET")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
                      selectedFilter === "BUDGET"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 shadow-2xs hover:bg-slate-50 border border-slate-100"
                    }`}
                  >
                    Under ₹50
                  </button>
                </div>
              )}
            </div>

            {/* Product Grid with Overlapping Food Cards */}
            <ProductGrid
              products={filteredProducts}
              emptyTitle={
                searchTerm
                  ? "No matching food found"
                  : selectedFilter !== "ALL"
                  ? "No dishes match this filter"
                  : "No products available"
              }
              emptyMessage={
                searchTerm
                  ? `We couldn't find any dishes matching "${searchTerm}". Try another search or explore categories.`
                  : "Try switching back to 'All' to view the entire menu."
              }
              onResetSearch={
                searchTerm
                  ? handleClearSearch
                  : selectedFilter !== "ALL"
                  ? () => setSelectedFilter("ALL")
                  : undefined
              }
            />
          </section>

          {/* ================= STUDENT COMBOS SECTION ================= */}
          {!searchTerm && combos.length > 0 && (
            <section aria-labelledby="combos-heading" className="pt-4">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2
                    id="combos-heading"
                    className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"
                  >
                    <Sparkles className="w-5 h-5 text-brand-500" />
                    <span>Student combos</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Curated student meal packs bundled at best value
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {combos.map((combo) => (
                  <ComboCard key={combo.id} combo={combo} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default Home;
