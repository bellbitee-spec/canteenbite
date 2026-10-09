import React from "react";
import { UtensilsCrossed, ArrowRight } from "lucide-react";

const EmptyState = ({
  icon: Icon = UtensilsCrossed,
  title = "No dishes found",
  message = "We couldn't find what you're looking for. Try another search or category.",
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto animate-fade-in">
      <div className="w-16 h-16 rounded-3xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4 shadow-subtle border border-brand-100">
        {typeof Icon === "function" ? (
          <Icon className="w-8 h-8" />
        ) : (
          <UtensilsCrossed className="w-8 h-8" />
        )}
      </div>
      <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
        {message}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 rounded-2xl shadow-sm shadow-brand-500/20 transition-all inline-flex items-center gap-2"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default EmptyState;

