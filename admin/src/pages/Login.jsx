import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      const target = location.state?.from?.pathname || "/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      const target = location.state?.from?.pathname || "/dashboard";
      navigate(target, { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || "Invalid credentials or unauthorized account."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#FBE7EE] selection:text-[#C94F78] relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(201,79,120,0.08),rgba(255,249,242,0))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FBE7EE] border border-[#EBD4DC] text-[#C94F78] mb-4 shadow-sakura-sm text-2xl">
            🌸
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#352431]">
            Bell<span className="text-[#C94F78]">Bite</span> Kitchen Console
          </h1>
          <p className="text-sm text-[#735A67] mt-1">
            Sign in with your canteen staff or administrator account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#EBD4DC] rounded-3xl p-8 shadow-sakura-card">
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3"
            >
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@college.edu"
                className="w-full px-4 py-2.5 bg-[#FFF9F2] border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 focus:ring-[#C94F78]/20 focus:border-[#C94F78] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#735A67] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#FFF9F2] border border-[#EBD4DC] rounded-xl text-[#352431] placeholder-[#927681] text-sm focus:outline-none focus:ring-2 focus:ring-[#C94F78]/20 focus:border-[#C94F78] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-[#C94F78] hover:bg-[#B33D65] disabled:bg-[#C94F78]/50 text-white text-sm font-semibold rounded-xl shadow-sakura-sm focus:outline-none focus:ring-2 focus:ring-[#C94F78] focus:ring-offset-2 focus:ring-offset-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in to Dashboard</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-[#927681] mt-6">
          Access restricted to authorized canteen administrators & staff.
        </p>
      </div>
    </div>
  );
};

export default Login;
