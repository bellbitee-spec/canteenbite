import React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  UtensilsCrossed,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  MapPin,
  Heart,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-[#EBD4DC] bg-[#FFF9F2] text-[#735A67]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <Link to="/" className="text-2xl font-extrabold tracking-[-0.09em] text-[#352431] block">
              bell<span className="text-[#C94F78]">bite</span><span className="text-[#C94F78]">.</span>
            </Link>

            <p className="text-xs sm:text-sm text-[#735A67] leading-relaxed max-w-sm font-medium">
              Designed for busy students and faculty. Order meals ahead, bypass counter rush hours, and pick up hot, freshly cooked food with zero waiting.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#352431] bg-[#FBE7EE] px-3.5 py-2 rounded-full border border-[#EBD4DC] w-fit">
              <MapPin className="w-4 h-4 text-[#C94F78] shrink-0" />
              <span>Campus Food Court, Counters 1 & 2</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#352431]">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-[#927681]">
              <li>
                <Link to="/" className="hover:text-[#C94F78] transition-colors">
                  Today's Specials
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-[#C94F78] transition-colors">
                  Menu & Categories
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-[#C94F78] transition-colors">
                  Track Active Orders
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#C94F78] transition-colors">
                  Student Account
                </Link>
              </li>
              <li>
                <Link to="/store-closed" className="hover:text-[#C94F78] transition-colors">
                  Canteen Hours & Schedule
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Highlights */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#352431]">
              Canteen Standards
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FBE7EE]/50 border border-[#EBD4DC]">
                <Zap className="w-4 h-4 text-[#C94F78] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#352431] block">
                    Fast Live Queue
                  </span>
                  <span className="text-[11px] text-[#735A67]">
                    Real-time status updates from kitchen prep to counter pickup.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[#FBE7EE]/50 border border-[#EBD4DC]">
                <ShieldCheck className="w-4 h-4 text-[#5F9A68] shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-[#352431] block">
                    Guaranteed Student Pricing
                  </span>
                  <span className="text-[11px] text-[#735A67]">
                    Subsidized campus menu prices with cash or instant UPI checkout.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Subfooter */}
        <div className="mt-10 pt-6 border-t border-[#EBD4DC] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#927681]">
          <div className="flex items-center gap-1.5 font-medium">
            <span>Built for campus life with</span>
            <Heart className="w-3.5 h-3.5 text-[#C94F78] fill-[#C94F78]" />
            <span>by the BellBite team.</span>
          </div>
          <div>
            <span><strong className="text-[#C94F78]">bellbite.</strong> Made for campus days · © 2026 BellBite</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
