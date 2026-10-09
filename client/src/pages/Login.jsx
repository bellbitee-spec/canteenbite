import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, UtensilsCrossed, AlertCircle, CheckCircle2 } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // If already authenticated, redirect
  const from = location.state?.from?.pathname || "/";
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isRegisterMode && !name.trim()) {
      setError("Please provide your full student name.");
      return;
    }

    try {
      setSubmitting(true);
      if (isRegisterMode) {
        await register(name.trim(), email.trim(), password);
        setSuccessMessage("Account created successfully!");
      } else {
        await login(email.trim(), password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-md mx-auto my-8 sm:my-14 animate-fade-in">
        {/* Auth Box */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-card border border-slate-100">
          {/* Top Logo & Title */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-brand-500/25">
              <UtensilsCrossed className="w-7 h-7 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isRegisterMode ? "Create Student Account" : "Welcome to My Canteen"}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isRegisterMode
                ? "Sign up with your campus email to start ordering"
                : "Sign in to order ahead and skip counter queues"}
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                !isRegisterMode
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                isRegisterMode
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register
            </button>
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 focus:bg-white text-slate-900 text-xs font-medium border border-slate-100 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5 ml-1">
                College Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 focus:bg-white text-slate-900 text-xs font-medium border border-slate-100 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5 ml-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 focus:bg-white text-slate-900 text-xs font-medium border border-slate-100 focus:border-brand-500 focus:outline-hidden focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-98 text-white font-black text-xs transition shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{isRegisterMode ? "Create Account" : "Sign In to Canteen"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick toggle helper */}
          <div className="mt-6 text-center text-xs text-slate-400 font-medium">
            {isRegisterMode ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="font-bold text-brand-600 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            ) : (
              <p>
                New student?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="font-bold text-brand-600 hover:underline cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Login;
