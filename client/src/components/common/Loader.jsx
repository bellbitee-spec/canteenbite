import React from "react";

export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#EBD4DC] overflow-hidden shadow-sm flex flex-col h-full animate-fade-in">
      <div className="aspect-4/3 w-full bg-[#FBE7EE]/60 skeleton-shimmer" />
      <div className="p-4 flex-1 flex flex-col space-y-3">
        <div className="h-3 w-16 bg-[#FBE7EE] skeleton-shimmer rounded" />
        <div className="h-4 w-3/4 bg-[#FBE7EE] skeleton-shimmer rounded" />
        <div className="h-3 w-full bg-[#FBE7EE] skeleton-shimmer rounded" />
        <div className="mt-auto pt-3 border-t border-[#EBD4DC]/60 flex items-center justify-between">
          <div className="h-5 w-14 bg-[#FBE7EE] skeleton-shimmer rounded" />
          <div className="h-8 w-20 bg-[#FBE7EE] skeleton-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const CategoryPillSkeleton = () => {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-[#EBD4DC] bg-white min-w-[130px] shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-[#FBE7EE] skeleton-shimmer shrink-0" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3.5 w-16 bg-[#FBE7EE] skeleton-shimmer rounded" />
        <div className="h-2.5 w-10 bg-[#FBE7EE] skeleton-shimmer rounded" />
      </div>
    </div>
  );
};

export const OrderCardSkeleton = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#EBD4DC] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-28 bg-[#FBE7EE] skeleton-shimmer rounded" />
          <div className="h-3 w-20 bg-[#FBE7EE] skeleton-shimmer rounded" />
        </div>
        <div className="h-6 w-24 bg-[#FBE7EE] skeleton-shimmer rounded-full" />
      </div>
      <div className="h-12 w-full bg-[#FBE7EE]/50 skeleton-shimmer rounded-xl" />
      <div className="flex justify-between items-center pt-2 border-t border-[#EBD4DC]/60">
        <div className="h-4 w-16 bg-[#FBE7EE] skeleton-shimmer rounded" />
        <div className="h-8 w-24 bg-[#FBE7EE] skeleton-shimmer rounded-full" />
      </div>
    </div>
  );
};

const Loader = ({ message = "Loading fresh food..." }) => {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-[#EBD4DC]" />
        <div className="absolute inset-0 rounded-full border-4 border-[#C94F78] border-t-transparent animate-spin" />
      </div>
      {message && (
        <p className="mt-4 text-xs font-semibold text-[#735A67] tracking-wide uppercase">
          {message}
        </p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default Loader;

