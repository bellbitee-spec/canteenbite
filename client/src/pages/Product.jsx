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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        {inCart && (
          <button
            type="button"
            onClick={openDrawer}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-brand-200 transition cursor-pointer"
          >
            <span>In your cart ({quantity})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl border border-slate-200/80 shadow-subtle animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-slate-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-8 bg-slate-200 rounded w-3/4" />
              <div className="h-10 bg-slate-200 rounded w-1/3" />
              <div className="h-20 bg-slate-100 rounded" />
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
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-float max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Large Product Image */}
            <div className="relative aspect-square w-full rounded-2xl bg-slate-100 overflow-hidden border border-slate-100">
              <img
                src={product.image || getFoodImage(product)}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
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
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-300" />
                  <span>{product.preparationTime} mins prep</span>
                </div>
              )}
            </div>

            {/* Product Meta & Details */}
            <div className="flex flex-col h-full">
              {product.category?.name && (
                <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">
                  {product.category.name}
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {product.name}
              </h1>

              {/* Price Tag */}
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  ₹{product.price}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Inclusive of all taxes
                </span>
              </div>

              {/* Description */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  About this item
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description ||
                    "Freshly prepared canteen item made with campus quality standards."}
                </p>
              </div>

              {/* Key Specs */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    Average Wait
                  </span>
                  <span className="font-extrabold text-slate-800 text-sm flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-brand-500" />
                    <span>{product.preparationTime || 10} minutes</span>
                  </span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block font-medium">
                    Stock Units
                  </span>
                  <span className="font-extrabold text-slate-800 text-sm block mt-0.5">
                    {product.stock > 0
                      ? `${product.stock} available`
                      : "0 left"}
                  </span>
                </div>
              </div>

              {/* Interactive Add-to-Cart Row */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Currently Unavailable</span>
                  </button>
                ) : inCart ? (
                  <div className="flex items-center justify-between gap-4 bg-brand-50/70 border border-brand-200/90 p-2.5 rounded-2xl">
                    <span className="text-xs font-extrabold text-brand-900 ml-2">
                      In Your Cart:
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(product.id, "PRODUCT")
                        }
                        className="w-9 h-9 rounded-xl bg-white text-slate-800 font-bold hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-black text-base text-brand-950">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(product.id, "PRODUCT")
                        }
                        className="w-9 h-9 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 active:scale-95 transition-all flex items-center justify-center shadow-xs cursor-pointer"
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
                    className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm bg-brand-500 hover:bg-brand-600 text-white shadow-elevated shadow-brand-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart — ₹{product.price}</span>
                  </button>
                )}

                {/* Subtle confirmation feedback */}
                {addedMessage && (
                  <div
                    role="status"
                    className="text-xs font-bold text-center text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200 animate-fade-in flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{addedMessage}</span>
                  </div>
                )}

                <p className="text-[11px] text-center text-slate-400 font-medium">
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
