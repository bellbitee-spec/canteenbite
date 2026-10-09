import React from "react";
import { Link } from "react-router-dom";
import PageContainer from "../components/layout/PageContainer";

const NotFound = () => {
  return (
    <PageContainer>
      <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
        <span className="text-6xl font-black text-amber-500 tracking-tighter">
          404
        </span>
        <h1 className="text-2xl font-black text-slate-900 mt-2">
          Page Not Found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Looks like this snack went missing from our kitchen shelves.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all inline-block shadow-sm"
          >
            ← Back to Canteen Home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
};

export default NotFound;
