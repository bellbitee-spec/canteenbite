import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import StockBadge from "../components/product/StockBadge";
import Loader, { ProductCardSkeleton } from "../components/common/Loader";
import ErrorState from "../components/common/ErrorState";
import { getProductById } from "../services/productService";
import useCart from "../hooks/useCart";
import { getFoodImage } from "../utils/foodImages";
import { getHeroImageUrl, getResponsiveSrcSet } from "../utils/imageUtils";

const Product = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addedMessage, setAddedMessage] = useState("");

  const {
    addProduct,
    increaseQuantity,
    decreaseQuantity,
    getItemQuantity,
    openDrawer,
  } = useCart();

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProductById(id);
      if (!data) {
        throw new Error("Product not found");
      }
      setProduct(data);
    } catch (err) {
      setError(err.message || "Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const isOutOfStock = product && (!product.isAvailable || product.stock === 0);
  const quantity = product ? getItemQuantity(product.id, "PRODUCT") : 0;
  const inCart = quantity > 0;

  const handleAddToCart = () => {
    if (product && !isOutOfStock) {
      const res = addProduct(product);
      if (res?.success) {
        setAddedMessage("Added to your cart!");
        const timer = setTimeout(() => setAddedMessage(""), 2500);
        return () => clearTimeout(timer);
      }
    }
  };

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#735A67] hover:text-[#352431] transition-colors px-3 py-1.5 rounded-full hover:bg-[#FBE7EE]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        {inCart && (
          <button
            type="button"
            onClick={openDrawer}
            className="text-xs font-bold text-[#C94F78] hover:text-[#B33D65] bg-[#FBE7EE] px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-[#EBD4DC] transition cursor-pointer"
          >
            <span>In your cart ({quantity})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl border border-[#EBD4DC] shadow-sm animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-[#FBE7EE] rounded-2xl" />
            <div className="space-y-4">
              <div className="h-4 bg-[#FBE7EE] rounded w-24" />
              <div className="h-8 bg-[#FBE7EE] rounded w-3/4" />
              <div className="h-10 bg-[#FBE7EE] rounded w-1/3" />
              <div className="h-20 bg-[#FBE7EE]/50 rounded" />
            </div>
          </div>
        </div>
      ) : error ? (
        <ErrorState
          title="Could not load food item"
          message={error}
          onRetry={fetchProduct}
        />
      ) : !product ? (
        <ErrorState
          title="Food Item Not Found"
          message="The requested canteen item does not exist or has been removed."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-10 shadow-sm max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Large Product Image */}
            <div className="relative aspect-square w-full rounded-2xl bg-[#FBE7EE] overflow-hidden border border-[#EBD4DC]">
              <img
                src={getHeroImageUrl(product.image || getFoodImage(product), 800)}
                srcSet={getResponsiveSrcSet(product.image || getFoodImage(product), [400, 600, 800, 1000])}
                sizes="(max-width: 768px) 100vw, 50vw"
                alt={product.name}
                width="600"
                height="600"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getFoodImage(product);
                }}
              />

              {/* Badges on image */}
              <div className="absolute top-4 left-4">
                <StockBadge
                  stock={product.stock}
                  lowStockThreshold={product.lowStockThreshold}
                  isAvailable={product.isAvailable}
                />
              </div>

              {product.preparationTime !== undefined && (
                <div className="absolute top-4 right-4 bg-[#352431]/80 backdrop-blur-xs text-[#FFF9F2] text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#F3A6BF]" />
                  <span>{product.preparationTime} mins prep</span>
                </div>
              )}
            </div>

            {/* Product Meta & Details */}
            <div className="flex flex-col h-full">
              {/* Veg / Non-Veg Badge & Category Tag */}
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <div
                  className={`w-4.5 h-4.5 rounded-sm border bg-white flex items-center justify-center shadow-xs ${
                    product.isVeg !== false ? "border-[#5F9A68]" : "border-rose-600"
                  }`}
                  title={product.isVeg !== false ? "Pure Vegetarian" : "Non-Vegetarian"}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.isVeg !== false ? "bg-[#5F9A68]" : "bg-rose-600"
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    product.isVeg !== false ? "text-[#5F9A68]" : "text-rose-700"
                  }`}
                >
                  {product.isVeg !== false ? "Pure Veg" : "Non-Veg"}
                </span>

                {product.category?.name && (
                  <>
                    <span className="text-[#EBD4DC]">·</span>
                    <span className="text-xs font-bold text-[#C94F78] uppercase tracking-widest">
                      {product.category.name}
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#352431] mt-1">
                {product.name}
              </h1>

              {/* Price Tag */}
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#352431]">
                  ₹{product.price}
                </span>
                <span className="text-xs text-[#927681] font-medium">
                  Subsidized campus pricing
                </span>
              </div>

              {/* Campus Counter Pickup Notice */}
              <div className="mt-4 p-3.5 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#735A67] text-xs flex items-center gap-2">
                <span className="text-base">📍</span>
                <span className="font-semibold text-[11px]">
                  Collect at Counter 1 & 2 • Live order status tracking on your phone
                </span>
              </div>

              {/* Description */}
              <div className="mt-6 pt-6 border-t border-[#EBD4DC]/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#927681]">
                  About this item
                </h3>
                <p className="mt-2 text-sm text-[#735A67] leading-relaxed whitespace-pre-line">
                  {product.description ||
                    "Freshly prepared canteen item made with campus quality standards."}
                </p>
              </div>

              {/* Key Specs */}
              <div className="mt-6 pt-6 border-t border-[#EBD4DC]/60 grid grid-cols-2 gap-4 text-xs">
                <div className="bg-[#FFF9F2] p-3.5 rounded-2xl border border-[#EBD4DC]">
                  <span className="text-[#927681] block font-medium">
                    Average Wait
                  </span>
                  <span className="font-extrabold text-[#352431] text-sm flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-[#C94F78]" />
                    <span>{product.preparationTime || 10} minutes</span>
                  </span>
                </div>
                <div className="bg-[#FFF9F2] p-3.5 rounded-2xl border border-[#EBD4DC]">
                  <span className="text-[#927681] block font-medium">
                    Stock Units
                  </span>
                  <span className="font-extrabold text-[#352431] text-sm block mt-0.5">
                    {product.stock > 0
                      ? `${product.stock} available`
                      : "0 left"}
                  </span>
                </div>
              </div>

              {/* Interactive Add-to-Cart Row */}
              <div className="mt-8 pt-6 border-t border-[#EBD4DC]/60 space-y-3">
                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-6 rounded-full font-bold text-sm bg-[#FBE7EE] text-[#927681] cursor-not-allowed border border-[#EBD4DC] flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Currently Unavailable</span>
                  </button>
                ) : inCart ? (
                  <div className="flex items-center justify-between gap-4 bg-[#FBE7EE] border border-[#EBD4DC] p-2 rounded-full">
                    <span className="text-xs font-bold text-[#352431] ml-3">
                      In Your Cart:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(product.id, "PRODUCT")
                        }
                        className="w-9 h-9 rounded-full bg-white text-[#352431] font-bold hover:bg-[#FFF9F2] active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-extrabold text-base text-[#352431]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(product.id, "PRODUCT")
                        }
                        className="w-9 h-9 rounded-full bg-[#C94F78] text-white font-bold hover:bg-[#B33D65] active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full py-3.5 px-6 rounded-full font-bold text-sm bg-[#C94F78] hover:bg-[#B33D65] text-white shadow-md shadow-[#C94F78]/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart — ₹{product.price}</span>
                  </button>
                )}

                {/* Subtle confirmation feedback */}
                {addedMessage && (
                  <div
                    role="status"
                    className="text-xs font-bold text-center text-[#5F9A68] bg-[#FBE7EE] py-2 px-3 rounded-full border border-[#EBD4DC] animate-fade-in flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#5F9A68]" />
                    <span>{addedMessage}</span>
                  </div>
                )}

                <p className="text-[11px] text-center text-[#927681] font-medium">
                  {isOutOfStock
                    ? "This item is sold out. Please check back later!"
                    : "Item will be saved in your student cart across browser sessions."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Product;
