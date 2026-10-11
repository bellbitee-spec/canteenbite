import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#EBD4DC] text-center shadow-sakura-card">
        <div className="w-16 h-16 rounded-2xl bg-[#FFF9F2] text-[#C94F78] border border-[#EBD4DC] mx-auto flex items-center justify-center mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold text-[#352431] mb-2">
          404 - Not Found
        </h1>

        <p className="text-[#735A67] text-sm mb-6 leading-relaxed">
          The admin route or resource you are looking for does not exist or has been relocated.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-semibold text-sm transition-colors shadow-sakura-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
