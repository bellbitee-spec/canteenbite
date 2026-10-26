import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, UtensilsCrossed, AlertCircle, CheckCircle2 } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, logout, isAuthenticated, user } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const from = location.state?.from?.pathname || "/";
  const isSwitchingAccount =
    location.search.includes("switch") || location.search.includes("reauth");

  // If already authenticated and not explicitly switching accounts, redirect to target
  React.useEffect(() => {
    if (location.search.includes("logout")) {
      logout();
    } else if (isAuthenticated && !isSwitchingAccount) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, isSwitchingAccount, location.search, logout]);

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
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EBD4DC]">
          {/* Top Logo & Title */}
          <div className="text-center mb-6">
            <Link to="/" className="text-3xl font-extrabold tracking-[-0.09em] text-[#352431] block mb-2">
              bell<span className="text-[#C94F78]">bite</span><span className="text-[#C94F78]">.</span>
            </Link>
            <h1 className="text-2xl font-extrabold text-[#352431] tracking-tight">
              {isRegisterMode ? "Create BellBite Account" : "Welcome to BellBite"}
            </h1>
            <p className="text-xs text-[#927681] font-medium mt-1">
              {isRegisterMode
                ? "Sign up with your campus email to start ordering"
                : "Sign in to order ahead and skip counter queues"}
            </p>
          </div>

          {/* Already Logged In / Switch Account Banner */}
          {isAuthenticated && (
            <div className="mb-6 p-4 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#352431]">
                  Currently signed in as:
                </span>
                <span className="font-semibold text-[#C94F78] truncate max-w-[160px]">
                  {user?.name || user?.email}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => navigate(from, { replace: true })}
                  className="flex-1 py-1.5 px-3 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs transition"
                >
                  Continue to Canteen
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="py-1.5 px-3 rounded-full border border-[#EBD4DC] hover:bg-white text-[#735A67] hover:text-[#352431] font-bold text-xs transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Tab Selector */}
          <div className="flex p-1 bg-[#FBE7EE] rounded-full border border-[#EBD4DC] mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                !isRegisterMode
                  ? "bg-white text-[#352431] shadow-xs"
                  : "text-[#735A67] hover:text-[#352431]"
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
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                isRegisterMode
                  ? "bg-white text-[#352431] shadow-xs"
                  : "text-[#735A67] hover:text-[#352431]"
              }`}
            >
              Register
            </button>
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#5F9A68] text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#5F9A68] shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="text-[11px] font-bold text-[#352431] block mb-1.5 ml-2">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#927681] absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 rounded-full bg-white text-[#352431] text-xs font-medium border border-[#EBD4DC] focus:border-[#C94F78] focus:outline-hidden focus:ring-2 focus:ring-[#C94F78]/15 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#352431] block mb-1.5 ml-2">
                College Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#927681] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full pl-10 pr-4 py-3 rounded-full bg-white text-[#352431] text-xs font-medium border border-[#EBD4DC] focus:border-[#C94F78] focus:outline-hidden focus:ring-2 focus:ring-[#C94F78]/15 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#352431] block mb-1.5 ml-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#927681] absolute left-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-full bg-white text-[#352431] text-xs font-medium border border-[#EBD4DC] focus:border-[#C94F78] focus:outline-hidden focus:ring-2 focus:ring-[#C94F78]/15 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] active:scale-98 text-white font-bold text-xs transition shadow-md shadow-[#C94F78]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{isRegisterMode ? "Create Account" : "Sign In to Canteen"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick toggle helper */}
          <div className="mt-6 text-center text-xs text-[#927681] font-medium">
            {isRegisterMode ? (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="font-bold text-[#C94F78] hover:underline cursor-pointer"
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
                  className="font-bold text-[#C94F78] hover:underline cursor-pointer"
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
