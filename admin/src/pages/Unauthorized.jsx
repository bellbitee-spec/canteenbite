import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Unauthorized = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-[#EBD4DC] text-center shadow-sakura-card">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-[#C94F78] border border-rose-200 mx-auto flex items-center justify-center mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#352431] mb-2">
          Access Restricted (403)
        </h1>

        <p className="text-[#735A67] text-sm mb-5 leading-relaxed">
          You are signed in as <span className="text-[#352431] font-semibold">{user?.email || "Unknown"}</span> (Role: <span className="font-mono text-[#C94F78] font-bold">{user?.role || "STUDENT"}</span>). This portal is restricted to authorized Canteen Administrators only.
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-semibold text-sm transition-colors shadow-sakura-sm cursor-pointer"
          >
            Sign Out & Switch Account
          </button>

          <Link
            to="/login"
            className="block w-full py-2.5 px-4 rounded-xl bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] border border-[#EBD4DC] font-medium text-sm transition-colors"
          >
            Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
