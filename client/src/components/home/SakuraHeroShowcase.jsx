import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Clock, Flame, Star, ArrowRight, Heart } from "lucide-react";

const SAKURA_DISHES = [
  {
    id: "katsu-donburi",
    name: "Sakura Crispy Katsu Bowl",
    tagline: "Crisp panko chicken · Teriyaki drizzle · Poached egg",
    price: 149,
    originalPrice: 179,
    prepTime: "10-12 min",
    rating: "4.9",
    reviewsCount: "1.2k+",
    tag: "Chef's Sakura Signature",
    dietary: "NON-VEG",
    image: "/images/sakura-katsu-bowl.jpg",
    accentColor: "#C94F78",
    hotDish: true,
  },
  {
    id: "artisan-ramen",
    name: "Artisan Blossom Ramen",
    tagline: "Slow-simmered broth · Chashu · Ajitsuke egg",
    price: 169,
    originalPrice: 199,
    prepTime: "12-15 min",
    rating: "4.8",
    reviewsCount: "980+",
    tag: "Steaming Fresh Broth",
    dietary: "NON-VEG",
    image: "/images/sakura-ramen-bowl.jpg",
    accentColor: "#B33D65",
    hotDish: true,
  },
  {
    id: "matcha-latte",
    name: "Iced Sakura Matcha Latte",
    tagline: "Ceremonial matcha · Strawberry berry cream",
    price: 89,
    originalPrice: 110,
    prepTime: "3-5 min",
    rating: "4.9",
    reviewsCount: "2.1k+",
    tag: "Campus Favorite",
    dietary: "VEG",
    image: "/images/sakura-matcha-latte.jpg",
    accentColor: "#5F9A68",
    hotDish: false,
  },
];

// Predefined petal configurations for organic natural drift
const PETALS = [
  { id: 1, left: "10%", size: 14, duration: 8, delay: 0, opacity: 0.75 },
  { id: 2, left: "28%", size: 10, duration: 11, delay: 2, opacity: 0.6 },
  { id: 3, left: "46%", size: 16, duration: 9.5, delay: 1, opacity: 0.7 },
  { id: 4, left: "68%", size: 12, duration: 12, delay: 3.5, opacity: 0.65 },
  { id: 5, left: "84%", size: 15, duration: 10, delay: 1.5, opacity: 0.8 },
  { id: 6, left: "92%", size: 11, duration: 7.5, delay: 4, opacity: 0.5 },
];

const SakuraHeroShowcase = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Auto-rotate every 5 seconds unless hovered
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SAKURA_DISHES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [isHovered]);

  // Handle subtle 3D tilt interaction
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x: x * 10, y: y * 10 });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const currentDish = SAKURA_DISHES[activeIndex];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="relative z-10 w-full aspect-[1.18] sm:aspect-[1.25] lg:aspect-[1.12] overflow-hidden rounded-[32px] bg-gradient-to-b from-[#FFF0F5] via-[#FBE7EE] to-[#FFF9F2] border border-[#EBD4DC] shadow-[0_24px_60px_-25px_rgba(201,79,120,0.35)] select-none transition-all duration-300"
    >
      {/* 1. Ambient Background Atmosphere: Zen Halo Rings & Radial Aura */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Pulsing Sakura Radial Glow */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(243, 166, 191, 0.45) 0%, rgba(251, 231, 238, 0.25) 45%, transparent 70%)",
            animation: "sakuraAuraPulse 6s ease-in-out infinite",
          }}
        />

        {/* Concentric Zen Ripple Rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78%] aspect-square rounded-full border border-[#C94F78]/15 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] aspect-square rounded-full border border-[#EBD4DC]/70 border-dashed pointer-events-none" />

        {/* Drifting Sakura Petals */}
        {PETALS.map((petal) => (
          <div
            key={petal.id}
            className="absolute -top-6 pointer-events-none will-change-transform"
            style={{
              left: petal.left,
              animation: `sakuraPetalFall ${petal.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite`,
              animationDelay: `${petal.delay}s`,
              opacity: petal.opacity,
            }}
          >
            <svg
              width={petal.size}
              height={petal.size * 1.2}
              viewBox="0 0 24 28"
              fill="none"
              className="drop-shadow-xs"
            >
              <path
                d="M12 2C8 6 3 10 3 17C3 22 7 26 12 26C17 26 21 22 21 17C21 10 16 6 12 2Z"
                fill="url(#petalGradient)"
              />
              <defs>
                <linearGradient id="petalGradient" x1="12" y1="2" x2="12" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F9C2D4" />
                  <stop offset="0.7" stopColor="#ECA0BA" />
                  <stop offset="1" stopColor="#C94F78" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        ))}
      </div>

      {/* 2. Central Dish Showcase with Interactive 3D Tilt & Organic Float */}
      <div
        className="relative z-10 size-full flex items-center justify-center p-6 sm:p-8"
        style={{
          transform: `perspective(1000px) rotateX(${-mouseOffset.y}deg) rotateY(${mouseOffset.x}deg)`,
          transition: "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {/* Floating Dish Unit */}
        <div className="relative w-[78%] sm:w-[72%] max-w-[340px] aspect-square flex items-center justify-center">
          {/* Animated Cast Shadow Beneath Platter */}
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-8 rounded-full bg-[#352431]/25 blur-md pointer-events-none"
            style={{
              animation: "sakuraShadow 4s ease-in-out infinite",
            }}
          />

          {/* Steaming Wisps for Hot Dishes */}
          {currentDish.hotDish && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-none z-20">
              <span
                className="w-1.5 h-6 bg-white/70 rounded-full blur-[1px]"
                style={{ animation: "steamRise 2.8s ease-in-out infinite" }}
              />
              <span
                className="w-2 h-7 bg-white/60 rounded-full blur-[1px]"
                style={{ animation: "steamRise 3.2s ease-in-out infinite 0.7s" }}
              />
              <span
                className="w-1.5 h-5 bg-white/70 rounded-full blur-[1px]"
                style={{ animation: "steamRise 2.5s ease-in-out infinite 1.4s" }}
              />
            </div>
          )}

          {/* Main Dish Image on Elevated Lacquer Platter */}
          <div
            className="relative size-full rounded-full p-2 bg-gradient-to-tr from-white via-[#FFF9F2] to-[#FBE7EE] border-2 border-white shadow-2xl overflow-hidden cursor-pointer group"
            style={{
              animation: "sakuraFloat 4s ease-in-out infinite",
            }}
            onClick={() => {
              const menuSection = document.getElementById("menu");
              if (menuSection) menuSection.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {/* Dish Plate Surface */}
            <div className="relative size-full rounded-full overflow-hidden">
              {SAKURA_DISHES.map((dish, idx) => (
                <img
                  key={dish.id}
                  src={dish.image}
                  alt={dish.name}
                  className={`absolute inset-0 size-full object-cover transition-all duration-700 ease-out ${
                    idx === activeIndex
                      ? "opacity-100 scale-100 rotate-0"
                      : "opacity-0 scale-90 rotate-6 pointer-events-none"
                  }`}
                  loading="eager"
                />
              ))}

              {/* Glossy Rim Light Overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-white/30 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Zomato-Style Signature Floating Micro-Badges */}

      {/* Top Left: Live Status Tag */}
      <div
        className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#EBD4DC] shadow-sm text-xs"
        style={{ animation: "sakuraBadgeFloat 3.5s ease-in-out infinite" }}
      >
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5F9A68] opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-[#5F9A68]" />
        </span>
        <span className="font-bold text-[#352431] text-[11px] sm:text-xs tracking-tight">
          Live Kitchen
        </span>
        <span className="text-[#927681] text-[10px] hidden sm:inline">·</span>
        <span className="text-[#C94F78] font-bold text-[11px] hidden sm:inline">
          {currentDish.prepTime}
        </span>
      </div>

      {/* Top Right: Sakura Signature Badge */}
      <div
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#C94F78] text-white shadow-md shadow-[#C94F78]/25 text-xs font-bold"
        style={{ animation: "sakuraBadgeFloat 4s ease-in-out infinite 0.5s" }}
      >
        <Sparkles className="w-3.5 h-3.5 fill-white/30 text-white" />
        <span className="text-[11px] sm:text-xs truncate max-w-[130px] sm:max-w-none">
          {currentDish.tag}
        </span>
      </div>

      {/* Bottom Left: Floating Rating & Orders Badge (Zomato App Hallmark) */}
      <div
        className="absolute bottom-16 sm:bottom-14 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#EBD4DC] shadow-lg shadow-[#352431]/5"
        style={{ animation: "sakuraBadgeFloat 3.8s ease-in-out infinite 1s" }}
      >
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#5F9A68] text-white text-[10px] font-black">
          <span>{currentDish.rating}</span>
          <Star className="w-2.5 h-2.5 fill-white text-white" />
        </div>
        <div className="leading-tight">
          <span className="text-[11px] font-bold text-[#352431] block">
            {currentDish.reviewsCount} ordered
          </span>
          <span className="text-[9px] text-[#927681] font-semibold block">
            Campus rated
          </span>
        </div>
      </div>

      {/* Bottom Right: Dynamic Dish Price & Name Pill */}
      <div
        className="absolute bottom-16 sm:bottom-14 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#352431]/95 text-white backdrop-blur-md shadow-xl"
        style={{ animation: "sakuraBadgeFloat 4.2s ease-in-out infinite 1.5s" }}
      >
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-xs sm:text-sm font-black text-white">
              ₹{currentDish.price}
            </span>
            <span className="text-[10px] text-[#927681] line-through font-normal">
              ₹{currentDish.originalPrice}
            </span>
          </div>
          <span className="text-[9px] font-bold text-[#F3A6BF] uppercase tracking-wider block">
            Special Value
          </span>
        </div>
        <a
          href="#menu"
          className="size-7 rounded-full bg-[#C94F78] hover:bg-[#B33D65] flex items-center justify-center transition-transform active:scale-90"
          aria-label={`Order ${currentDish.name}`}
        >
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </a>
      </div>

      {/* 4. Bottom Switcher Bar: Interactive Dish Capsules (Zomato-style) */}
      <div className="absolute bottom-3 inset-x-3 z-30 flex items-center justify-between px-3 py-1.5 rounded-2xl bg-white/80 backdrop-blur-md border border-[#EBD4DC]/80">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {SAKURA_DISHES.map((dish, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={dish.id}
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#C94F78] text-white shadow-xs scale-102"
                    : "bg-[#FFF9F2] text-[#735A67] hover:bg-[#FBE7EE] hover:text-[#352431]"
                }`}
              >
                <img
                  src={dish.image}
                  alt=""
                  className="size-4 rounded-full object-cover shrink-0"
                />
                <span className="text-[11px] truncate max-w-[90px] sm:max-w-none">
                  {dish.name.split(" ")[0]} {dish.name.split(" ")[1] || ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress Dots Indicator */}
        <div className="flex items-center gap-1 pl-2 shrink-0">
          {SAKURA_DISHES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? "w-4 h-1.5 bg-[#C94F78]"
                  : "w-1.5 h-1.5 bg-[#EBD4DC] hover:bg-[#C94F78]/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SakuraHeroShowcase;
