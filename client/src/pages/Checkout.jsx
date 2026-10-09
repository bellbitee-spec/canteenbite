import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Banknote,
  ShoppingBag,
  ArrowLeft,
  AlertCircle,
  ShieldCheck,
  Lock,
  MessageSquare,
  UtensilsCrossed,
  Sparkles,
  Layers,
} from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import useCart from "../hooks/useCart";
import useStore from "../hooks/useStore";
import useAuth from "../hooks/useAuth";
import orderService from "../services/orderService";
import paymentService, { loadRazorpayScript } from "../services/paymentService";
import OrderSummary from "../components/checkout/OrderSummary";
import PaymentMethod from "../components/checkout/PaymentMethod";


// Helper to generate a unique idempotency key
const generateIdempotencyKey = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `checkout-${timestamp}-${randomStr}`;
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, clearCart } = useCart();
  const { store, loading: storeLoading, refreshStoreStatus } = useStore();
  const { user, isAuthenticated, loading: authLoading, login } = useAuth();

  // Form States
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // 'CASH' | 'ONLINE'
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'STOCK' | 'AUTH' | 'STORE_CLOSED' | 'NETWORK' | 'GENERAL'

  // Inline Quick Login States (if student not logged in)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Idempotency key reference: generated once per checkout session and reused across retries
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    // Generate an initial idempotency key for this checkout attempt
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }
  }, []);

  // Whenever items change, generate a fresh idempotency key
  useEffect(() => {
    idempotencyKeyRef.current = generateIdempotencyKey();
  }, [items]);

  // Refresh store status when checkout mounts
  useEffect(() => {
    refreshStoreStatus();
  }, [refreshStoreStatus]);

  const canOrder = Boolean(store?.canOrder);

  // Handle Quick Student Authentication inline
  const handleQuickLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail || !loginPassword) {
      setLoginError("Email and password are required.");
      return;
    }

    try {
      setLoginSubmitting(true);
      await login(loginEmail.trim(), loginPassword);
      setErrorMessage(null);
    } catch (err) {
      setLoginError(err.message || "Invalid email or password.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Authoritative Order Submission Handler
  const handlePlaceOrder = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    setErrorType(null);

    // 1. Client Cart Validation
    if (!items || items.length === 0) {
      setErrorMessage("Your cart is empty. Add food items before placing an order.");
      setErrorType("GENERAL");
      return;
    }

    // 2. Authentication Check
    if (!isAuthenticated) {
      setErrorMessage("Please log in with your student account to place an order.");
      setErrorType("AUTH");
      return;
    }

    // 3. Re-verify Store Status Before Submitting
    const freshStatus = await refreshStoreStatus();
    if (freshStatus && !freshStatus.canOrder) {
      setErrorMessage(
        freshStatus.reason || "The canteen is currently closed or not accepting orders."
      );
      setErrorType("STORE_CLOSED");
      return;
    }

    // 4. Notes limit validation (500 chars)
    const trimmedNotes = notes.trim().slice(0, 500);

    // 5. Construct Canonical Backend Order Payload
    // Never send client price or subtotal; backend calculates authoritative figures
    const orderPayload = {
      items: items.map((item) => ({
        itemType: item.itemType || "PRODUCT",
        id: item.id,
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      })),
      paymentMethod,
      notes: trimmedNotes,
    };

    try {
      setSubmitting(true);

      // Submit with Idempotency Key
      const keyToSend = idempotencyKeyRef.current || generateIdempotencyKey();
      idempotencyKeyRef.current = keyToSend;

      const createdOrder = await orderService.createOrder(orderPayload, keyToSend);

      if (createdOrder && (createdOrder.id || createdOrder._id)) {
        if (paymentMethod === "ONLINE") {
          // ONLINE PAYMENT FLOW
          // Step A: Initiate server-authoritative Razorpay Payment Order
          const paymentData = await paymentService.createPaymentOrder(
            createdOrder.id || createdOrder._id
          );

          // Step B: Load Razorpay Checkout SDK
          const scriptLoaded = await loadRazorpayScript();

          if (!scriptLoaded || typeof window.Razorpay === "undefined") {
            setErrorType("GENERAL");
            setErrorMessage(
              "Razorpay checkout SDK could not be loaded. Please ensure you have an active internet connection or choose Cash at Counter."
            );
            setSubmitting(false);
            return;
          }

          // Step C: Open Razorpay Checkout Modal
          const options = {
            key: paymentData.keyId,
            amount: paymentData.amount,
            currency: paymentData.currency || "INR",
            name: "College Canteen",
            description: `Order #${createdOrder.orderNumber || paymentData.orderNumber}`,
            order_id: paymentData.razorpayOrderId,
            handler: async (response) => {
              try {
                setSubmitting(true);
                const verificationResult = await paymentService.verifyPayment({
                  orderId: createdOrder.id || createdOrder._id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                });

                // SUCCESS: Clear Cart ONLY after confirmed online payment
                clearCart();
                idempotencyKeyRef.current = null;

                const finalOrder =
                  verificationResult.data?.order ||
                  verificationResult.order ||
                  createdOrder;

                navigate(`/order-success/${createdOrder.id || createdOrder._id}`, {
                  state: { order: finalOrder },
                  replace: true,
                });
              } catch (verifyErr) {
                console.error("Payment verification error:", verifyErr);
                setErrorType("GENERAL");
                setErrorMessage(
                  verifyErr.message ||
                    "Payment verification failed. Please check with the canteen counter staff."
                );
                setSubmitting(false);
              }
            },
            modal: {
              ondismiss: async () => {
                setSubmitting(false);
                try {
                  await paymentService.reportFailure({
                    orderId: createdOrder.id || createdOrder._id,
                    reason: "Student dismissed payment modal before completing payment",
                  });
                } catch (_) {}
                setErrorType("GENERAL");
                setErrorMessage(
                  "Payment was not completed. You can try paying again or switch to Cash at Counter."
                );
              },
            },
            prefill: {
              name: user?.name || "",
              email: user?.email || "",
            },
            theme: {
              color: "#FF5A1F",
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", async (response) => {
            setSubmitting(false);
            try {
              await paymentService.reportFailure({
                orderId: createdOrder.id || createdOrder._id,
                reason: response.error?.description || "Payment failed",
                attemptedPaymentId: response.error?.metadata?.payment_id,
              });
            } catch (_) {}
            setErrorType("GENERAL");
            setErrorMessage(
              response.error?.description ||
                "Payment was declined by payment gateway. Please retry."
            );
          });

          rzp.open();
          setSubmitting(false);
        } else {
          // CASH PAYMENT FLOW
          clearCart();
          idempotencyKeyRef.current = null;
          navigate(`/order-success/${createdOrder.id || createdOrder._id}`, {
            state: { order: createdOrder },
            replace: true,
          });
        }
      } else {
        throw new Error("Unable to confirm order registration with canteen.");
      }
    } catch (err) {
      console.warn("Order creation error:", err);

      const status = err.status || 0;
      const backendMessage =
        err.data?.message || err.message || "Failed to submit order.";

      if (status === 401) {
        setErrorType("AUTH");
        setErrorMessage("Your session has expired. Please log in again.");
      } else if (status === 409) {
        setErrorType("STOCK");
        setErrorMessage(
          backendMessage.includes("stock") || backendMessage.includes("unavailable")
            ? backendMessage
            : "Some items are no longer available in the requested quantity. Please review your cart."
        );
      } else if (status === 400) {
        if (
          backendMessage.toLowerCase().includes("closed") ||
          backendMessage.toLowerCase().includes("paused")
        ) {
          setErrorType("STORE_CLOSED");
        } else {
          setErrorType("GENERAL");
        }
        setErrorMessage(backendMessage);
      } else if (status === 0) {
        setErrorType("NETWORK");
        setErrorMessage(
          "We couldn't confirm the result due to a network interruption. Please retry."
        );
      } else {
        setErrorType("GENERAL");
        setErrorMessage(backendMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // --- EMPTY CART STATE ---
  if (!items || items.length === 0) {
    return (
      <PageContainer>
        <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4 border border-brand-100 shadow-subtle">
            <ShoppingBag className="w-9 h-9 stroke-[1.8]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Your tray is empty
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            Add hot meals or drinks from the canteen menu to proceed to checkout.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs sm:text-sm shadow-sm shadow-brand-500/25 active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Browse Menu</span>
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto my-6 sm:my-10 space-y-8 animate-fade-in">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Checkout & Payment</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Confirm your meal items, kitchen notes, and payment mode
            </p>
          </div>

          <Link
            to="/cart"
            className="self-start sm:self-auto text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Tray ({itemCount} items)</span>
          </Link>
        </div>

        {/* Store Closed / Paused Top Notice */}
        {!storeLoading && !canOrder && (
          <div
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-subtle animate-fade-in"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-rose-900 text-sm block">
                Orders Are Currently Paused
              </span>
              <p className="text-rose-700 leading-relaxed font-medium">
                {store?.reason || "The canteen is currently closed or ordering is temporarily paused."}
              </p>
              <p className="text-[11px] text-rose-600 pt-1 font-semibold">
                Your items remain safely saved. You can submit your order once the canteen resumes.
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-medium flex items-start justify-between gap-3 shadow-subtle animate-fade-in ${
              errorType === "NETWORK"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-rose-50 border-rose-300 text-rose-900"
            }`}
            role="alert"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block text-sm mb-0.5">
                  {errorType === "STOCK"
                    ? "Inventory Notice"
                    : errorType === "STORE_CLOSED"
                    ? "Canteen Unavailable"
                    : errorType === "NETWORK"
                    ? "Connection Notice"
                    : "Notice"}
                </span>
                <p className="leading-relaxed">{errorMessage}</p>
                {errorType === "STOCK" && (
                  <div className="pt-2">
                    <Link
                      to="/cart"
                      className="font-bold underline text-rose-800 hover:text-rose-950"
                    >
                      Return to Tray to adjust quantities →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN: Order Details (Col-span 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Order Items Breakdown */}
            <OrderSummary
              items={items}
              subtotal={subtotal}
              itemCount={itemCount}
              variant="items"
              showEditLink={true}
            />

            {/* 2. Payment Method Selector */}
            <PaymentMethod
              selectedMethod={paymentMethod}
              onSelectMethod={setPaymentMethod}
              disabled={submitting}
            />

            {/* 3. Kitchen Notes Textarea */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="orderNotes"
                  className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-brand-500" />
                  <span>Kitchen Cooking Notes (Optional)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {notes.length}/500
                </span>
              </div>

              <textarea
                id="orderNotes"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the cooks? (e.g. Less spicy, extra sauce, separate packaging...)"
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 leading-relaxed resize-none transition-all"
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Place Order (Col-span 1) */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-6">
            {/* Student Auth Status Card (if unauthenticated) */}
            {!authLoading && !isAuthenticated && (
              <div className="bg-white rounded-3xl border border-brand-300 p-5 shadow-subtle space-y-3 bg-gradient-to-b from-brand-50/50 to-white">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-brand-600" />
                  <h3 className="font-black text-sm text-slate-900">
                    Student Login Required
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Please log in with your college credentials to place your order.
                </p>

                {loginError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg">
                    {loginError}
                  </p>
                )}

                <form onSubmit={handleQuickLogin} className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Student Email
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="student@college.edu"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loginSubmitting}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                  >
                    {loginSubmitting ? "Logging in..." : "Log In & Continue"}
                  </button>
                </form>
              </div>
            )}

            {/* Order Summary & Confirmation Box */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-card space-y-5">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                Order Summary
              </h3>

              <OrderSummary
                items={items}
                subtotal={subtotal}
                itemCount={itemCount}
                variant="breakdown"
              />

              {/* Status Notice Indicator */}
              {storeLoading ? (
                <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 text-xs text-center font-medium animate-pulse">
                  Checking canteen availability...
                </div>
              ) : !canOrder ? (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center font-semibold">
                  Orders are currently unavailable
                </div>
              ) : null}

              {/* Place Order CTA Button */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  submitting ||
                  storeLoading ||
                  !canOrder ||
                  itemCount === 0 ||
                  !isAuthenticated
                }
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                  submitting ||
                  storeLoading ||
                  !canOrder ||
                  itemCount === 0 ||
                  !isAuthenticated
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none"
                    : "bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25 active:scale-98"
                }`}
              >
                {submitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Placing order...</span>
                  </>
                ) : storeLoading ? (
                  <span>Checking status...</span>
                ) : !canOrder ? (
                  <span>Orders Unavailable</span>
                ) : !isAuthenticated ? (
                  <span>Log In to Place Order</span>
                ) : paymentMethod === "CASH" ? (
                  <span>Confirm Order (Cash) — ₹{subtotal}</span>
                ) : (
                  <span>Pay Online — ₹{subtotal}</span>
                )}
              </button>

              <div className="space-y-1.5 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  {isAuthenticated && user?.email
                    ? `Ordering as: ${user.name || user.email}`
                    : "Student account required for token generation."}
                </p>
                <p className="text-[10px] text-slate-400">
                  Cancel window: 30 seconds after order submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Checkout;

