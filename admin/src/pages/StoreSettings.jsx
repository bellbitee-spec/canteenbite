import React, { useState, useEffect, useCallback } from "react";
import storeService from "../services/storeService";
import productService from "../services/productService";
import useStore from "../hooks/useStore";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const StoreSettings = () => {
  const { refreshStoreStatus } = useStore();

  // Primary Data States
  const [status, setStatus] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);

  // Hero Banner Management States
  const [selectedNewBannerProductId, setSelectedNewBannerProductId] = useState("");
  const [savingBannerProductId, setSavingBannerProductId] = useState(null);
  const [bannerPreviewIndex, setBannerPreviewIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form Editing States
  const [closeReasonInput, setCloseReasonInput] = useState("");
  const [generalForm, setGeneralForm] = useState({
    storeName: "",
    defaultPreparationTime: 10,
  });
  const [orderingForm, setOrderingForm] = useState({
    cancellationWindowSeconds: 30,
  });

  // Action Loading States
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingOrdering, setSavingOrdering] = useState(false);

  // Errors & Feedback
  const [scheduleErrors, setScheduleErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Unsaved changes tracking
  const [isScheduleDirty, setIsScheduleDirty] = useState(false);
  const [isGeneralDirty, setIsGeneralDirty] = useState(false);
  const [isOrderingDirty, setIsOrderingDirty] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load All Authoritative Data
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const [statusData, schedData, settingsData, productsData] = await Promise.all([
        storeService.getStoreStatus(),
        storeService.getSchedule(),
        storeService.getSettings(),
        productService.getProducts({ includeUnavailable: "true" }).catch(() => []),
      ]);

      setStatus(statusData);
      setSchedule(schedData || []);
      setSettings(settingsData);
      setProducts(productsData || []);

      if (settingsData) {
        setCloseReasonInput(settingsData.temporaryClosedReason || "");
        setGeneralForm({
          storeName: settingsData.storeName || "College Canteen",
          defaultPreparationTime: settingsData.defaultPreparationTime ?? 10,
        });
        setOrderingForm({
          cancellationWindowSeconds: settingsData.cancellationWindowSeconds ?? 30,
        });
      }

      setIsScheduleDirty(false);
      setIsGeneralDirty(false);
      setIsOrderingDirty(false);
      refreshStoreStatus();
    } catch (err) {
      console.error("Error loading store settings:", err);
      setFetchError(err.message || "Unable to load store settings from server");
    } finally {
      setLoading(false);
    }
  }, [refreshStoreStatus]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Warn on window unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isScheduleDirty || isGeneralDirty || isOrderingDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isScheduleDirty, isGeneralDirty, isOrderingDirty]);

  // --- 1. STORE STATUS & MANUAL OVERRIDE ACTIONS ---

  const handleUseSchedule = async () => {
    try {
      setStatusActionLoading(true);
      await storeService.updateSettings({ manualOverride: false });
      showToast("Store switched to automated weekly schedule mode.");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to switch to schedule mode", "error");
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleManualOpen = async () => {
    try {
      setStatusActionLoading(true);
      await storeService.updateSettings({
        manualOverride: true,
        isOpen: true,
      });
      showToast("Store manually opened.");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to open store", "error");
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleManualClose = async () => {
    try {
      setStatusActionLoading(true);
      await storeService.updateSettings({
        manualOverride: true,
        isOpen: false,
        temporaryClosedReason: closeReasonInput.trim(),
      });
      showToast("Store manually closed.");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to close store", "error");
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleUpdateCloseReasonOnly = async () => {
    try {
      setStatusActionLoading(true);
      await storeService.updateSettings({
        temporaryClosedReason: closeReasonInput.trim(),
      });
      showToast("Closure reason updated.");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update closure reason", "error");
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleToggleAcceptingOrders = async () => {
    if (!settings) return;
    try {
      setStatusActionLoading(true);
      const nextVal = !settings.acceptingOrders;
      await storeService.updateSettings({ acceptingOrders: nextVal });
      showToast(
        nextVal ? "Ordering resumed for students." : "Ordering paused for students."
      );
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to toggle order acceptance", "error");
    } finally {
      setStatusActionLoading(false);
    }
  };

  // --- 2. WEEKLY SCHEDULE ACTIONS ---

  const handleScheduleEntryChange = (dayIndex, field, value) => {
    setIsScheduleDirty(true);
    setSchedule((prev) => {
      const updated = [...prev];
      const target = { ...updated[dayIndex] };

      if (field === "isOpen") {
        target.isOpen = value;
      } else if (field === "openingTime") {
        target.openingTime = value;
      } else if (field === "closingTime") {
        target.closingTime = value;
      }

      updated[dayIndex] = target;
      return updated;
    });

    // Clear error for this day if any
    setScheduleErrors((prev) => {
      const copy = { ...prev };
      delete copy[dayIndex];
      return copy;
    });
  };

  const validateSchedule = () => {
    const errors = {};
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    schedule.forEach((entry, idx) => {
      if (entry.isOpen) {
        if (!entry.openingTime || !timeRegex.test(entry.openingTime)) {
          errors[idx] = `Opening time is required in HH:mm format for ${entry.dayName || DAY_NAMES[entry.dayOfWeek]}.`;
        } else if (!entry.closingTime || !timeRegex.test(entry.closingTime)) {
          errors[idx] = `Closing time is required in HH:mm format for ${entry.dayName || DAY_NAMES[entry.dayOfWeek]}.`;
        } else if (entry.openingTime >= entry.closingTime) {
          errors[idx] = `Closing time (${entry.closingTime}) must be later than opening time (${entry.openingTime}).`;
        }
      }
    });

    setScheduleErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!validateSchedule()) {
      showToast("Please fix the schedule errors highlighted in red.", "error");
      return;
    }

    try {
      setSavingSchedule(true);
      const cleanEntries = schedule.map((e) => ({
        dayOfWeek: e.dayOfWeek,
        isOpen: Boolean(e.isOpen),
        openingTime: e.isOpen ? e.openingTime : "09:00",
        closingTime: e.isOpen ? e.closingTime : "18:00",
      }));

      await storeService.updateSchedule(cleanEntries);
      showToast("Weekly schedule saved successfully!");
      setIsScheduleDirty(false);
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to save schedule", "error");
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- 3. GENERAL SETTINGS ACTIONS ---

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!generalForm.storeName.trim()) {
      showToast("Store name cannot be empty.", "error");
      return;
    }

    const prep = parseInt(generalForm.defaultPreparationTime, 10);
    if (isNaN(prep) || prep < 0) {
      showToast("Preparation time must be 0 or a positive integer.", "error");
      return;
    }

    try {
      setSavingGeneral(true);
      await storeService.updateSettings({
        storeName: generalForm.storeName.trim(),
        defaultPreparationTime: prep,
      });
      showToast("General settings updated!");
      setIsGeneralDirty(false);
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update general settings", "error");
    } finally {
      setSavingGeneral(false);
    }
  };

  // --- 4. ORDERING SETTINGS ACTIONS ---

  const handleSaveOrdering = async (e) => {
    e.preventDefault();
    const windowSecs = parseInt(orderingForm.cancellationWindowSeconds, 10);
    if (isNaN(windowSecs) || windowSecs < 1) {
      showToast("Cancellation window must be a positive integer (at least 1 second).", "error");
      return;
    }

    try {
      setSavingOrdering(true);
      await storeService.updateSettings({
        cancellationWindowSeconds: windowSecs,
      });
      showToast("Ordering settings updated!");
      setIsOrderingDirty(false);
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update ordering settings", "error");
    } finally {
      setSavingOrdering(false);
    }
  };

  // --- 5. HOMEPAGE HERO BANNER ACTIONS ---

  const handleAddToBanner = async () => {
    if (!selectedNewBannerProductId) return;
    const prod = products.find((p) => p.id === selectedNewBannerProductId);
    if (!prod) return;

    setSavingBannerProductId(selectedNewBannerProductId);
    try {
      await productService.updateProduct(selectedNewBannerProductId, {
        isFeatured: true,
        featuredBadge: prod.featuredBadge || "Campus Favorite",
        rating: prod.rating || 4.9,
        ratingCount: prod.ratingCount || 1200,
      });
      showToast(`"${prod.name}" added to Homepage Hero Banner!`);
      setSelectedNewBannerProductId("");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to add dish to banner.", "error");
    } finally {
      setSavingBannerProductId(null);
    }
  };

  const handleRemoveFromBanner = async (productId) => {
    const prod = products.find((p) => p.id === productId);
    setSavingBannerProductId(productId);
    try {
      await productService.updateProduct(productId, { isFeatured: false });
      showToast(`"${prod ? prod.name : 'Dish'}" removed from Hero Banner.`);
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to remove dish from banner.", "error");
    } finally {
      setSavingBannerProductId(null);
    }
  };

  const handleUpdateBannerItem = async (productId, updates) => {
    setSavingBannerProductId(productId);
    try {
      await productService.updateProduct(productId, updates);
      showToast("Hero banner item updated!");
      await loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to update banner item.", "error");
    } finally {
      setSavingBannerProductId(null);
    }
  };

  // --- RENDER LOADING & ERROR SKELETONS ---

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true">
        <div className="h-8 w-64 bg-[#FBE7EE] rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-white rounded-3xl border border-[#EBD4DC]" />
          <div className="h-72 bg-white rounded-3xl border border-[#EBD4DC]" />
        </div>
        <div className="h-96 bg-white rounded-3xl border border-[#EBD4DC]" />
      </div>
    );
  }

  if (fetchError && !status) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white border border-rose-200 max-w-xl mx-auto my-12 space-y-4 shadow-sakura-card">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center text-3xl">
          ⚠️
        </div>
        <h3 className="text-xl font-bold text-[#352431]">Unable to load store settings</h3>
        <p className="text-sm text-[#735A67]">{fetchError}</p>
        <button
          onClick={loadAllData}
          className="px-5 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-semibold text-sm transition shadow-sakura-sm cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all transform animate-bounce-short ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
          role="status"
        >
          <span>{toast.type === "error" ? "✖" : "✔"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#EBD4DC]">
        <div>
          <h2 className="text-2xl font-bold text-[#352431] tracking-tight flex items-center gap-2">
            <span>⚙️ Store Operations & Settings</span>
          </h2>
          <p className="text-sm text-[#735A67] mt-0.5">
            Real-time open/closed state, weekly hours, cancellation window, and ordering rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={statusActionLoading}
            className="px-4 py-2 rounded-xl bg-white hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] text-xs font-semibold border border-[#EBD4DC] transition flex items-center gap-2 shadow-sakura-sm cursor-pointer"
            title="Refresh Authoritative Store State"
          >
            <span>🔄</span> Refresh Status
          </button>
        </div>
      </div>

      {/* Grid: Status Section (Left) & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* SECTION 1: STORE STATUS & MANUAL OVERRIDE (Col-span 2) */}
        <div className="lg:col-span-2 bg-white border border-[#EBD4DC] rounded-3xl p-6 sm:p-7 shadow-sakura-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EBD4DC] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#352431] flex items-center gap-2">
                <span>⚡ Live Operating State</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#FFF9F2] text-[#735A67] border border-[#EBD4DC]">
                  {status?.timezone || "Asia/Kolkata"}
                </span>
              </h3>
              <p className="text-xs text-[#735A67] mt-0.5">
                Authoritative single source of truth governing student storefront ordering
              </p>
            </div>

            {/* Current Mode Badge */}
            <div className="self-start sm:self-auto">
              {status?.manualOverride ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC]">
                  <span className="w-2 h-2 rounded-full bg-[#C94F78]" />
                  Manual Override Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Weekly Schedule Active
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
            {/* Store Open/Closed */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] space-y-1">
              <span className="text-[#735A67] font-semibold uppercase tracking-wider text-[10px] block">
                Physical Store
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.isOpen ? "bg-[#5F9A68] animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`text-sm font-extrabold ${
                    status?.isOpen ? "text-[#5F9A68]" : "text-rose-600"
                  }`}
                >
                  {status?.isOpen ? "OPEN" : "CLOSED"}
                </span>
              </div>
            </div>

            {/* Ordering Status */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] space-y-1">
              <span className="text-[#735A67] font-semibold uppercase tracking-wider text-[10px] block">
                Orders Intake
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    status?.acceptingOrders ? "bg-[#5F9A68]" : "bg-amber-500"
                  }`}
                />
                <span
                  className={`text-sm font-extrabold ${
                    status?.acceptingOrders ? "text-[#5F9A68]" : "text-amber-700"
                  }`}
                >
                  {status?.acceptingOrders ? "ACCEPTING" : "PAUSED"}
                </span>
              </div>
            </div>

            {/* Student Ordering Authority */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] space-y-1">
              <span className="text-[#735A67] font-semibold uppercase tracking-wider text-[10px] block">
                Can Students Order?
              </span>
              <span
                className={`text-sm font-extrabold block ${
                  status?.canOrder ? "text-[#5F9A68]" : "text-rose-600"
                }`}
              >
                {status?.canOrder ? "YES (ACTIVE)" : "NO (LOCKED)"}
              </span>
            </div>

            {/* Current Schedule Slot */}
            <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] space-y-1">
              <span className="text-[#735A67] font-semibold uppercase tracking-wider text-[10px] block">
                Today's Slot ({status?.currentDayName || "Today"})
              </span>
              <span className="text-xs font-bold text-[#352431] block">
                {status?.openingTime && status?.closingTime
                  ? `${status.openingTime} – ${status.closingTime}`
                  : "Closed on Schedule"}
              </span>
            </div>
          </div>

          {/* Active Closure Reason Banner */}
          {status?.reason && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <span className="text-base mt-0.5">📢</span>
              <div>
                <span className="font-bold text-amber-900 block">Active Status Notice:</span>
                <span>{status.reason}</span>
              </div>
            </div>
          )}

          {/* Controls: Manual Override Switchers */}
          <div className="pt-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#735A67]">
              Manual Override Controls
            </h4>

            <div className="flex flex-wrap items-center gap-3">
              {/* Button: Use Schedule */}
              <button
                type="button"
                onClick={handleUseSchedule}
                disabled={statusActionLoading || !status?.manualOverride}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  !status?.manualOverride
                    ? "bg-[#C94F78] text-white border-[#C94F78] shadow-sakura-sm cursor-default"
                    : "bg-[#FFF9F2] hover:bg-[#FBE7EE] text-[#735A67] hover:text-[#352431] border-[#EBD4DC]"
                }`}
              >
                <span>📅</span>
                <span>Use Schedule</span>
                {!status?.manualOverride && <span className="text-[10px]">(Active)</span>}
              </button>

              {/* Button: Manually Open */}
              <button
                type="button"
                onClick={handleManualOpen}
                disabled={statusActionLoading || (status?.manualOverride && status?.isOpen)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  status?.manualOverride && status?.isOpen
                    ? "bg-[#5F9A68] text-white border-[#5F9A68] shadow-sakura-sm cursor-default"
                    : "bg-[#FFF9F2] hover:bg-emerald-50 text-[#735A67] hover:text-emerald-700 border-[#EBD4DC]"
                }`}
              >
                <span>🔓</span>
                <span>Force Open Store</span>
                {status?.manualOverride && status?.isOpen && (
                  <span className="text-[10px]">(Active)</span>
                )}
              </button>

              {/* Button: Manually Close */}
              <button
                type="button"
                onClick={handleManualClose}
                disabled={statusActionLoading || (status?.manualOverride && !status?.isOpen)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  status?.manualOverride && !status?.isOpen
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm cursor-default"
                    : "bg-[#FFF9F2] hover:bg-rose-50 text-[#735A67] hover:text-rose-700 border-[#EBD4DC]"
                }`}
              >
                <span>🔒</span>
                <span>Force Close Store</span>
                {status?.manualOverride && !status?.isOpen && (
                  <span className="text-[10px]">(Active)</span>
                )}
              </button>
            </div>

            {/* Temporary Closure Reason Input */}
            <div className="pt-2 bg-[#FFF9F2] p-4 rounded-2xl border border-[#EBD4DC] space-y-2">
              <label
                htmlFor="closeReasonInput"
                className="text-xs font-bold text-[#352431] block"
              >
                Temporary Closure Reason (Shown to Students When Closed)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  id="closeReasonInput"
                  type="text"
                  maxLength={500}
                  value={closeReasonInput}
                  onChange={(e) => setCloseReasonInput(e.target.value)}
                  placeholder="e.g. Kitchen deep cleaning, staff break, inventory restock..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-[#EBD4DC] text-[#352431] placeholder-[#927681] text-xs focus:outline-none focus:border-[#C94F78]"
                />
                <button
                  type="button"
                  onClick={handleUpdateCloseReasonOnly}
                  disabled={statusActionLoading}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FBE7EE] text-[#352431] text-xs font-bold border border-[#EBD4DC] transition cursor-pointer shadow-sakura-sm"
                >
                  Save Reason
                </button>
              </div>
            </div>

            {/* Toggle Accepting Orders */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC]">
              <div>
                <span className="text-xs font-bold text-[#352431] block">
                  Accept Orders from Students
                </span>
                <span className="text-[11px] text-[#735A67] block mt-0.5">
                  Temporarily pause order placement without changing the store's physical open state
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleAcceptingOrders}
                disabled={statusActionLoading}
                aria-pressed={settings?.acceptingOrders}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings?.acceptingOrders ? "bg-[#5F9A68]" : "bg-slate-300"
                }`}
              >
                <span className="sr-only">Toggle Accepting Orders</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings?.acceptingOrders ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SIDE COLUMN: GENERAL & ORDERING SETTINGS */}
        <div className="space-y-6">
          {/* GENERAL SETTINGS */}
          <div className="bg-white border border-[#EBD4DC] rounded-3xl p-6 shadow-sakura-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBD4DC] pb-3">
              <h3 className="text-sm font-bold text-[#352431] flex items-center gap-1.5">
                <span>🏷️ General Store Settings</span>
              </h3>
              {isGeneralDirty && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Unsaved Changes
                </span>
              )}
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="storeName" className="font-semibold text-[#735A67] block mb-1">
                  Store Display Name
                </label>
                <input
                  id="storeName"
                  type="text"
                  maxLength={100}
                  value={generalForm.storeName}
                  onChange={(e) => {
                    setIsGeneralDirty(true);
                    setGeneralForm({ ...generalForm, storeName: e.target.value });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="defaultPrepTime"
                  className="font-semibold text-[#735A67] block mb-1"
                >
                  Default Preparation Time (Minutes)
                </label>
                <input
                  id="defaultPrepTime"
                  type="number"
                  min="0"
                  max="240"
                  value={generalForm.defaultPreparationTime}
                  onChange={(e) => {
                    setIsGeneralDirty(true);
                    setGeneralForm({
                      ...generalForm,
                      defaultPreparationTime: e.target.value,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                  required
                />
                <span className="text-[10px] text-[#735A67] block mt-1">
                  Fallback preparation time when products have no explicit prep time.
                </span>
              </div>

              <div>
                <label htmlFor="currency" className="font-semibold text-[#735A67] block mb-1">
                  Currency
                </label>
                <input
                  id="currency"
                  type="text"
                  value="INR (₹)"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#735A67] text-xs cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={savingGeneral || !isGeneralDirty}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sakura-sm cursor-pointer ${
                  !isGeneralDirty || savingGeneral
                    ? "bg-[#FFF9F2] text-[#927681] border border-[#EBD4DC] cursor-not-allowed"
                    : "bg-[#C94F78] hover:bg-[#B33D65] text-white"
                }`}
              >
                {savingGeneral ? "Saving..." : "Save General Settings"}
              </button>
            </form>
          </div>

          {/* ORDERING SETTINGS */}
          <div className="bg-white border border-[#EBD4DC] rounded-3xl p-6 shadow-sakura-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBD4DC] pb-3">
              <h3 className="text-sm font-bold text-[#352431] flex items-center gap-1.5">
                <span>⏱️ Order Cancellation Rules</span>
              </h3>
              {isOrderingDirty && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Unsaved Changes
                </span>
              )}
            </div>

            <form onSubmit={handleSaveOrdering} className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor="cancelWindow"
                  className="font-semibold text-[#735A67] block mb-1"
                >
                  Cancellation Window (Seconds)
                </label>
                <input
                  id="cancelWindow"
                  type="number"
                  min="1"
                  max="3600"
                  value={orderingForm.cancellationWindowSeconds}
                  onChange={(e) => {
                    setIsOrderingDirty(true);
                    setOrderingForm({
                      ...orderingForm,
                      cancellationWindowSeconds: e.target.value,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                  required
                />
                <p className="text-[11px] text-[#735A67] font-medium mt-1 leading-relaxed">
                  Students can cancel orders for{" "}
                  <span className="text-[#C94F78] font-bold">
                    {orderingForm.cancellationWindowSeconds || 30} seconds
                  </span>{" "}
                  after placing them.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingOrdering || !isOrderingDirty}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sakura-sm cursor-pointer ${
                  !isOrderingDirty || savingOrdering
                    ? "bg-[#FFF9F2] text-[#927681] border border-[#EBD4DC] cursor-not-allowed"
                    : "bg-[#C94F78] hover:bg-[#B33D65] text-white"
                }`}
              >
                {savingOrdering ? "Saving..." : "Save Cancellation Window"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION: HOMEPAGE HERO BANNER SHOWCASE */}
      <div className="bg-white border border-[#EBD4DC] rounded-3xl p-6 sm:p-7 shadow-sakura-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌸</span>
              <h3 className="text-base font-bold text-[#352431] tracking-tight">
                Homepage Hero Banner Showcase
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FBE7EE] text-[#C94F78] border border-[#EBD4DC]">
                Live Platter Showcase
              </span>
            </div>
            <p className="text-xs text-[#735A67] mt-1 max-w-2xl leading-relaxed">
              Curate the featured dishes rotating in the animated platter showcase on the student homepage. Customize dish photos, live culinary badges (Chef's Signature, Campus Favorite, Steaming Hot), and verified ratings.
            </p>
          </div>

          {/* Quick Add Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
            <select
              value={selectedNewBannerProductId}
              onChange={(e) => setSelectedNewBannerProductId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#FFF9F2] border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78] flex-1 sm:w-56 cursor-pointer"
            >
              <option value="">-- Add dish to banner --</option>
              {products
                .filter((p) => !p.isFeatured)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAddToBanner}
              disabled={!selectedNewBannerProductId || savingBannerProductId}
              className="px-4 py-2.5 rounded-xl bg-[#C94F78] hover:bg-[#B33D65] text-white font-bold text-xs transition shadow-sakura-sm disabled:opacity-50 cursor-pointer shrink-0"
            >
              {savingBannerProductId === selectedNewBannerProductId ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>

        {/* Featured Dishes List / Grid */}
        {products.filter((p) => Boolean(p.isFeatured)).length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#FFF9F2] border border-dashed border-[#EBD4DC] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FBE7EE] text-[#C94F78] mx-auto flex items-center justify-center text-xl">
              🌸
            </div>
            <div>
              <p className="text-sm font-bold text-[#352431]">No custom banner dishes pinned yet</p>
              <p className="text-xs text-[#735A67] max-w-md mx-auto mt-1">
                The student storefront is currently rotating the top-rated dishes automatically. Use the dropdown above or edit any product in the Products page to pin specific dishes here.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {products
              .filter((p) => Boolean(p.isFeatured))
              .map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#EBD4DC] hover:border-[#C94F78] transition-all space-y-3.5"
                >
                  {/* Top Bar: Dish Header + Remove */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-[#EBD4DC] overflow-hidden shrink-0">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/images/sakura-katsu-bowl.jpg";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🍱</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#352431] truncate">{prod.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#735A67]">
                          <span className="font-bold text-[#352431]">₹{prod.price}</span>
                          <span>·</span>
                          <span>{prod.category?.name || "Dish"}</span>
                          <span>·</span>
                          <span>⏱ {prod.preparationTime || 10} min</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromBanner(prod.id)}
                      disabled={savingBannerProductId === prod.id}
                      title="Remove from banner"
                      className="p-1.5 rounded-xl text-[#735A67] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>

                  {/* Editable Banner Fields */}
                  <div className="space-y-2.5 pt-2 border-t border-[#EBD4DC] text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-[#C94F78]">
                          Culinary Badge / Highlight Tag:
                        </label>
                        <span className="text-[10px] text-[#735A67]">Shown at top-right of plate</span>
                      </div>
                      <input
                        type="text"
                        defaultValue={prod.featuredBadge || "Campus Favorite"}
                        onBlur={(e) => {
                          if (e.target.value !== prod.featuredBadge) {
                            handleUpdateBannerItem(prod.id, { featuredBadge: e.target.value });
                          }
                        }}
                        placeholder="e.g. Campus Favorite, Chef's Sakura Signature"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          "Campus Favorite",
                          "Chef's Sakura Signature",
                          "Steaming Hot & Fresh",
                          "Today's Special",
                          "Student Top Pick",
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              handleUpdateBannerItem(prod.id, { featuredBadge: tag })
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                              prod.featuredBadge === tag
                                ? "bg-[#C94F78] text-white shadow-sakura-sm"
                                : "bg-white text-[#C94F78] hover:bg-[#FBE7EE] border border-[#EBD4DC]"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="font-semibold text-[#735A67] block mb-1">
                          Rating (0-5.0):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          defaultValue={prod.rating !== undefined ? prod.rating : 4.8}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== prod.rating) {
                              handleUpdateBannerItem(prod.id, { rating: val });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                        />
                      </div>

                      <div>
                        <label className="font-semibold text-[#735A67] block mb-1">
                          Orders / Count:
                        </label>
                        <input
                          type="number"
                          min="0"
                          defaultValue={prod.ratingCount || 1200}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val !== prod.ratingCount) {
                              handleUpdateBannerItem(prod.id, { ratingCount: val });
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-[#735A67] block mb-1">
                        Plate Image URL:
                      </label>
                      <input
                        type="url"
                        defaultValue={prod.image || ""}
                        onBlur={(e) => {
                          if (e.target.value !== prod.image) {
                            handleUpdateBannerItem(prod.id, { image: e.target.value.trim() });
                          }
                        }}
                        placeholder="https://... or /images/sakura-katsu-bowl.jpg"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#EBD4DC] text-[#352431] text-xs focus:outline-none focus:border-[#C94F78] truncate"
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* SECTION 2: WEEKLY SCHEDULE EDITOR */}
      <div className="bg-white border border-[#EBD4DC] rounded-3xl p-6 sm:p-7 shadow-sakura-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EBD4DC] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#352431] flex items-center gap-2">
              <span>📅 Weekly Operating Schedule</span>
              {isScheduleDirty && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Unsaved Changes
                </span>
              )}
            </h3>
            <p className="text-xs text-[#735A67] mt-0.5">
              Automated opening and closing hours for each day of the week (24h time in Asia/Kolkata)
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition shadow-sakura-sm flex items-center gap-2 self-start sm:self-auto cursor-pointer ${
              savingSchedule
                ? "bg-[#FFF9F2] text-[#927681] border border-[#EBD4DC] cursor-not-allowed"
                : "bg-[#C94F78] hover:bg-[#B33D65] text-white"
            }`}
          >
            <span>💾</span>
            <span>{savingSchedule ? "Saving Schedule..." : "Save Weekly Schedule"}</span>
          </button>
        </div>

        {/* 7 Days Table / List */}
        <div className="space-y-3">
          {schedule.map((entry, index) => {
            const dayName = entry.dayName || DAY_NAMES[entry.dayOfWeek];
            const hasError = scheduleErrors[index];
            const isOpen = Boolean(entry.isOpen);

            return (
              <div
                key={entry.dayOfWeek}
                className={`p-4 rounded-2xl border transition-all ${
                  hasError
                    ? "bg-rose-50 border-rose-200"
                    : isOpen
                    ? "bg-[#FFF9F2] border-[#EBD4DC]"
                    : "bg-white border-[#EBD4DC]/70 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* Day Label & Toggle */}
                  <div className="flex items-center gap-3 sm:w-48">
                    <button
                      type="button"
                      onClick={() => handleScheduleEntryChange(index, "isOpen", !isOpen)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        isOpen
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-slate-100 border-slate-200 text-[#735A67]"
                      }`}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </button>
                    <span className="font-bold text-sm text-[#352431]">{dayName}</span>
                  </div>

                  {/* Time Inputs */}
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`openTime_${entry.dayOfWeek}`}
                        className="text-[#735A67] font-medium"
                      >
                        Opens:
                      </label>
                      <input
                        id={`openTime_${entry.dayOfWeek}`}
                        type="time"
                        value={entry.openingTime || "09:00"}
                        disabled={!isOpen}
                        onChange={(e) =>
                          handleScheduleEntryChange(index, "openingTime", e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
                          !isOpen
                            ? "bg-[#FFF9F2] border-[#EBD4DC] text-[#927681] cursor-not-allowed"
                            : "bg-white border-[#EBD4DC] text-[#352431] focus:outline-none focus:border-[#C94F78]"
                        }`}
                      />
                    </div>

                    <span className="text-[#EBD4DC] font-bold hidden sm:inline">→</span>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`closeTime_${entry.dayOfWeek}`}
                        className="text-[#735A67] font-medium"
                      >
                        Closes:
                      </label>
                      <input
                        id={`closeTime_${entry.dayOfWeek}`}
                        type="time"
                        value={entry.closingTime || "18:00"}
                        disabled={!isOpen}
                        onChange={(e) =>
                          handleScheduleEntryChange(index, "closingTime", e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition ${
                          !isOpen
                            ? "bg-[#FFF9F2] border-[#EBD4DC] text-[#927681] cursor-not-allowed"
                            : "bg-white border-[#EBD4DC] text-[#352431] focus:outline-none focus:border-[#C94F78]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right text-xs text-[#735A67] sm:w-28">
                    {isOpen ? (
                      <span className="text-[#5F9A68] font-medium">Operating</span>
                    ) : (
                      <span className="text-[#927681] font-medium">Off Duty</span>
                    )}
                  </div>
                </div>

                {/* Inline Error Message */}
                {hasError && (
                  <p className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{hasError}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-[#EBD4DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#735A67]">
            Note: Store schedule changes take effect immediately in Asia/Kolkata timezone unless manual override is active.
          </p>

          <button
            type="button"
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-sakura-sm flex items-center gap-2 cursor-pointer self-start sm:self-auto ${
              savingSchedule
                ? "bg-[#FFF9F2] text-[#927681] border border-[#EBD4DC] cursor-not-allowed"
                : "bg-[#C94F78] hover:bg-[#B33D65] text-white"
            }`}
          >
            <span>💾</span>
            <span>{savingSchedule ? "Saving..." : "Save Schedule"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
