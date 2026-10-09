import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Receipt, LogOut, ArrowRight, ShieldCheck } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAuthenticated || !user) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto my-12 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Student Account
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Please sign in to view your canteen orders and campus profile.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs transition shadow-sm active:scale-95"
            >
              Sign In
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto my-6 sm:my-10 space-y-6 animate-fade-in">
        {/* Profile Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-black text-2xl shadow-dish ring-4 ring-white">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {user.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Campus Student</span>
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email</span>
              </span>
              <span className="font-extrabold text-slate-800 font-mono">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50">
              <span className="text-slate-400 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>Role</span>
              </span>
              <span className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider">
                {user.role || "Student"}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 space-y-2.5">
            <Link
              to="/orders"
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-brand-400" />
                <span>View My Orders</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-700 font-black text-xs transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Profile;
