import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  ArrowRight,
  Clock,
  Clock3,
  Zap,
  Flame,
  MapPin,
  Check,
  Award,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import ProductGrid from "../components/product/ProductGrid";
import CategoryCard from "../components/product/CategoryCard";
import ComboCard from "../components/product/ComboCard";
import SakuraHeroShowcase from "../components/home/SakuraHeroShowcase";
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
import { getFoodImage } from "../utils/foodImages";

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
  const [selectedCategory, setSelectedCategory] = useState("ALL");
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

  // Filter products by selected category and filter chip
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (selectedCategory !== "ALL") {
      list = list.filter(
        (p) =>
          p.categoryId === selectedCategory ||
          p.category?.id === selectedCategory ||
          p.category?.name?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (selectedFilter === "VEG") {
      return list.filter((p) => p.isVeg !== false);
    }
    if (selectedFilter === "QUICK") {
      return list.filter((p) => (p.preparationTime || 10) <= 10);
    }
    if (selectedFilter === "BUDGET") {
      return list.filter((p) => Number(p.price) <= 50);
    }
    return list;
  }, [products, selectedCategory, selectedFilter]);

  return (
    <PageContainer>
      {/* Mobile-Only Search Bar */}
      <div className="lg:hidden mb-5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#927681] absolute left-4 pointer-events-none" />
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
            placeholder="Search dishes, snacks, drinks..."
            className="w-full pl-11 pr-10 py-3 rounded-full bg-white text-[#352431] placeholder-[#927681] font-semibold text-xs sm:text-sm border border-[#EBD4DC] focus:border-[#C94F78] focus:outline-hidden focus:ring-2 focus:ring-[#C94F78]/15 shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 p-1 text-[#927681] hover:text-[#352431] transition"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= SAKURA HERO SECTION ================= */}
      {!searchTerm && (
        <section className="sakura-hero relative mx-auto grid max-w-7xl gap-6 pb-8 pt-4 sm:pt-6 sm:pb-12 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-14 lg:pb-16">
          {/* Left Column: Heading, Subtitle & Action */}
          <div className="relative z-10 order-2 lg:order-1">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#C94F78]">
              Made fresh at your campus
            </p>
            <h1 className="max-w-xl text-[clamp(2.5rem,5.5vw,4.5rem)] font-extrabold leading-[0.96] tracking-[-0.07em] text-[#352431]">
              Big Flavor.<br />
              <span className="text-[#C94F78]">Bigger</span> Happiness.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-[#735A67]">
              Fresh campus meals, made to order. Skip the queue and collect at your counter.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href="#menu"
                className="flex items-center gap-2 rounded-full bg-[#C94F78] hover:bg-[#B33D65] px-6 py-3.5 font-bold text-white shadow-lg shadow-[#C94F78]/25 transition-all active:scale-95"
              >
                <span>Explore the menu</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#735A67]">
                <Clock3 className="w-4 h-4 text-[#C94F78]" />
                <span>Ready in 10–15 min</span>
              </span>
            </div>
          </div>

          {/* Right Column: Zomato-Style Animated Sakura Hero Showcase */}
          <div className="order-1 lg:order-2">
            <SakuraHeroShowcase products={products} />
          </div>
        </section>
      )}

      {/* ================= SAKURA CATEGORY STRIP ================= */}
      {!searchTerm && categories.length > 0 && (
        <section className="border-y border-[#EBD4DC] bg-[#FBE7EE]/55 py-3.5 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
          <div className="category-strip max-w-7xl mx-auto flex items-center gap-3 overflow-x-auto">
            <span className="mr-2 shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-[#927681]">
              Browse
            </span>

            {/* "All" Category Pill */}
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition cursor-pointer ${
                selectedCategory === "ALL"
                  ? "border-[#C94F78] bg-[#C94F78] text-white shadow-xs"
                  : "border-[#EBD4DC] bg-[#FFF9F2] text-[#735A67] hover:border-[#C94F78]/60"
              }`}
            >
              <span className="size-7 rounded-full bg-[#FBE7EE] flex items-center justify-center text-sm">
                🍱
              </span>
              <span>All</span>
            </button>

            {/* Real Categories from API */}
            {categories.map((cat) => {
              const catImage = cat.image || getFoodImage(cat);
              const isCatActive = selectedCategory === cat.id || selectedCategory === cat.name;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(isCatActive ? "ALL" : cat.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition cursor-pointer ${
                    isCatActive
                      ? "border-[#C94F78] bg-[#C94F78] text-white shadow-xs"
                      : "border-[#EBD4DC] bg-[#FFF9F2] text-[#735A67] hover:border-[#C94F78]/60"
                  }`}
                >
                  <img
                    src={catImage}
                    alt=""
                    className="size-7 rounded-full object-cover"
                  />
                  <span>{cat.name}</span>
                </button>
              );
            })}
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
                className="w-24 h-10 rounded-full bg-[#FBE7EE]/60 animate-pulse shrink-0"
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="h-6 bg-[#FBE7EE] rounded-lg w-48 animate-pulse" />
            <ProductGrid loading={true} products={[]} />
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInitialData} />
      ) : (
        <div className="space-y-12 sm:space-y-16" id="menu">
          {/* ================= THE CANTEEN EDIT (MENU SECTION) ================= */}
          <section aria-labelledby="products-heading">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C94F78]">
                  The canteen edit
                </p>
                <h2
                  id="products-heading"
                  className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-[-0.06em] text-[#352431]"
                >
                  {searchTerm
                    ? `Search: "${searchTerm}"`
                    : selectedCategory !== "ALL"
                    ? `${categories.find((c) => c.id === selectedCategory)?.name || "Category"} Specials`
                    : "Good food, no waiting."}
                </h2>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-[#927681] absolute left-3.5 pointer-events-none" />
                  <input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value) {
                        setSearchParams({ q: e.target.value });
                      } else {
                        setSearchParams({});
                      }
                    }}
                    aria-label="Search dishes"
                    placeholder="Search dishes..."
                    className="h-10 w-full sm:w-56 rounded-full border border-[#EBD4DC] bg-white pl-9.5 pr-8 text-sm text-[#352431] outline-none focus:border-[#C94F78] focus:ring-2 focus:ring-[#C94F78]/15 placeholder-[#927681] shadow-2xs"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 text-[#927681] hover:text-[#352431]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "VEG", label: "Veg" },
                    { id: "QUICK", label: "<10m" },
                    { id: "BUDGET", label: "Under ₹50" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedFilter(id)}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        selectedFilter === id
                          ? "bg-[#C94F78] text-white shadow-xs"
                          : "border border-[#EBD4DC] bg-white text-[#735A67] hover:border-[#C94F78]/60 shadow-2xs"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <ProductGrid
              products={filteredProducts}
              emptyTitle={
                searchTerm
                  ? "No matching food found"
                  : selectedFilter !== "ALL" || selectedCategory !== "ALL"
                  ? "No dishes match this selection"
                  : "No products available"
              }
              emptyMessage={
                searchTerm
                  ? `We couldn't find any dishes matching "${searchTerm}". Try another search or explore categories.`
                  : "Try resetting your category or filter to view the entire menu."
              }
              onResetSearch={
                searchTerm
                  ? handleClearSearch
                  : selectedFilter !== "ALL" || selectedCategory !== "ALL"
                  ? () => {
                      setSelectedFilter("ALL");
                      setSelectedCategory("ALL");
                    }
                  : undefined
              }
            />
          </section>

          {/* ================= HOW IT WORKS (PICK UP YOUR WAY) ================= */}
          <section id="how-it-works" className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#FBE7EE] p-6 border border-[#EBD4DC]">
              <div className="flex items-center gap-2 text-[#C94F78]">
                <MapPin className="w-5 h-5" />
                <h3 className="text-xl font-extrabold text-[#352431]">Pick up your way</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#735A67]">
                We&apos;ll have it warm at Counter 1 & 2. Skip the counter rush and collect hot meals right on time.
              </p>
            </div>
            <div className="rounded-2xl bg-[#352431] p-6 text-[#FFF9F2]">
              <div className="flex items-center gap-2 text-[#F3A6BF]">
                <Check className="w-5 h-5" />
                <h3 className="text-xl font-extrabold text-white">Order, then exhale.</h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#EBD4DC]">
                Track your order from prep to pickup in real time. No crowded lines, no guesswork.
              </p>
            </div>
          </section>

          {/* ================= STUDENT COMBOS SECTION ================= */}
          {!searchTerm && combos.length > 0 && (
            <section aria-labelledby="combos-heading" className="pt-2">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#C94F78]">
                    Value Packs
                  </p>
                  <h2
                    id="combos-heading"
                    className="text-2xl sm:text-3xl font-extrabold text-[#352431] tracking-tight flex items-center gap-2 mt-0.5"
                  >
                    <Flame className="w-5 h-5 text-[#C94F78]" />
                    <span>Student combos</span>
                  </h2>
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
