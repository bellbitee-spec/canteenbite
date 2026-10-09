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
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 border border-rose-100 shadow-subtle">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-95 rounded-2xl shadow-sm transition-all inline-flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;

