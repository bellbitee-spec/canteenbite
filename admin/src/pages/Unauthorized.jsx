import React from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Unauthorized = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Access Restricted (403)
        </h1>

        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          You are signed in as <span className="text-slate-200 font-semibold">{user?.email || "Unknown"}</span> (Role: <span className="font-mono text-indigo-400 font-bold">{user?.role || "STUDENT"}</span>). This portal is restricted to authorized Canteen Administrators only.
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Sign Out & Switch Account
          </button>

          <Link
            to="/login"
            className="block w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-colors"
          >
            Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
