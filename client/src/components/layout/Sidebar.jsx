import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  UtensilsCrossed,
  LayoutGrid,
  Receipt,
  User,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

const Sidebar = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Categories", path: "/categories", icon: LayoutGrid },
    { label: "Orders", path: "/orders", icon: Receipt },
    { label: "Account", path: isAuthenticated ? "/profile" : "/login", icon: User },
  ];

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 flex-col justify-between shrink-0 p-5 xl:p-6 bg-transparent select-none">
      {/* Top Section: User Profile & Main Nav Pills */}
      <div className="space-y-7">
        {/* User Card */}
        <Link
          to={isAuthenticated ? "/profile" : "/login"}
          className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl hover:bg-white/80 transition-all cursor-pointer group"
          aria-label={isAuthenticated ? "Open user profile" : "Sign in to account"}
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-brand-500/20 overflow-hidden ring-3 ring-white group-hover:scale-105 transition-transform">
            {user?.name ? (
              user.name.charAt(0).toUpperCase()
            ) : (
              <User className="w-6 h-6 stroke-[2]" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm text-slate-900 truncate tracking-tight group-hover:text-brand-600 transition-colors">
              {isAuthenticated && user?.name ? user.name : "Student Diner"}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 block tracking-wide">
              {isAuthenticated ? "Campus Member" : "Sign In / Join"}
            </span>
          </div>
        </Link>

        {/* Distinctive Pill Navigation (Inspired by reference) */}
        <nav aria-label="Desktop primary navigation" className="space-y-2.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-500/20 translate-x-1"
                    : "bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs hover:shadow-subtle"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Campus Helper Card (Playful & On-Brand) */}
      <div className="pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-brand-50 p-4 border border-brand-100/70 shadow-2xs">
          {/* Subtle floating badge */}
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-700 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full w-fit mb-2 shadow-2xs">
            <Zap className="w-3 h-3 text-brand-500 fill-brand-500" />
            <span>Express Pickup</span>
          </div>

          <h4 className="font-black text-sm text-slate-900 tracking-tight leading-snug">
            Order before you reach the counter!
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
            Skip the crowd. Your meal is prepped fresh & ready at Counter 1 & 2.
          </p>

          <Link
            to="/categories"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-brand-600 hover:text-brand-700 hover:underline"
          >
            <span>Explore fresh items</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
