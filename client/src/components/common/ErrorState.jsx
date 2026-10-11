import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

const ErrorState = ({
  title = "Couldn't load the menu",
  message = "We're having trouble connecting to the canteen kitchen. Please check your connection and try again.",
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto animate-fade-in"
    >
      <div className="w-14 h-14 rounded-2xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mb-4 border border-[#EBD4DC] shadow-sm">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-[#352431] tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-[#735A67] leading-relaxed max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-6 py-3 text-xs sm:text-sm font-bold text-white bg-[#C94F78] hover:bg-[#B33D65] active:scale-95 rounded-full shadow-sm transition-all inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;

