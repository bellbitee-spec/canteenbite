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
        <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-[#EBD4DC] p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center mx-auto border border-[#EBD4DC]">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#352431] tracking-tight">
            Student Account
          </h2>
          <p className="text-xs text-[#735A67] leading-relaxed font-medium">
            Please sign in to view your canteen orders and campus profile.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs transition shadow-sm active:scale-95"
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
        <div className="bg-white rounded-3xl border border-[#EBD4DC] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-[#EBD4DC]/60 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-[#C94F78] text-white flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ring-[#FBE7EE]">
              {user.name ? user.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#352431] tracking-tight">
                {user.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5F9A68] bg-[#5F9A68]/15 px-2.5 py-0.5 rounded-full mt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5F9A68]" />
                <span>Verified Campus Student</span>
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FBE7EE]/40 border border-[#EBD4DC]">
              <span className="text-[#735A67] font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C94F78]" />
                <span>Email</span>
              </span>
              <span className="font-bold text-[#352431] font-mono">
                {user.email}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FBE7EE]/40 border border-[#EBD4DC]">
              <span className="text-[#735A67] font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-[#C94F78]" />
                <span>Role</span>
              </span>
              <span className="font-bold text-[#352431] uppercase text-[11px] tracking-wider">
                {user.role || "Student"}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 space-y-2.5">
            <Link
              to="/orders"
              className="w-full flex items-center justify-between p-3.5 rounded-full bg-[#352431] hover:bg-[#352431]/90 text-white font-bold text-xs transition"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C94F78]" />
                <span>View My Orders</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-full bg-[#FBE7EE] hover:bg-[#FBE7EE]/80 text-[#C94F78] border border-[#EBD4DC] font-bold text-xs transition cursor-pointer"
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
