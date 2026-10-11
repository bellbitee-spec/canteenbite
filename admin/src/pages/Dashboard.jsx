import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import orderService from "../services/orderService";
import useAuth from "../hooks/useAuth";
import useOrderSocket from "../hooks/useOrderSocket";

const STATUS_CONFIG = [
  {
    key: "pending",
    label: "Pending",
    desc: "Awaiting acceptance",
    statusFilter: "PENDING",
    textColor: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "confirmed",
    label: "Confirmed",
    desc: "Queued for kitchen",
    statusFilter: "CONFIRMED",
    textColor: "text-sky-800",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    iconBg: "bg-sky-100 text-sky-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "preparing",
    label: "Preparing",
    desc: "Cooking / in progress",
    statusFilter: "PREPARING",
    textColor: "text-[#C94F78]",
    bgColor: "bg-[#FBE7EE]",
    borderColor: "border-[#EBD4DC]",
    iconBg: "bg-[#FBE7EE] text-[#C94F78]",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "ready",
    label: "Ready for Pickup",
    desc: "Food waiting at counter",
    statusFilter: "READY",
    textColor: "text-[#5F9A68]",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconBg: "bg-emerald-100 text-[#5F9A68]",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    key: "delayed",
    label: "Delayed",
    desc: "Behind schedule alert",
    statusFilter: "DELAYED",
    textColor: "text-rose-800",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    iconBg: "bg-rose-100 text-rose-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    key: "completed",
    label: "Completed",
    desc: "Picked up & done",
    statusFilter: "COMPLETED",
    textColor: "text-slate-800",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-100 text-slate-700",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: "cancelled",
    label: "Cancelled",
    desc: "Voided or refunded",
    statusFilter: "CANCELLED",
    textColor: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    iconBg: "bg-slate-100 text-slate-500",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delayed: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await orderService.getOrderStats();
      setStats({
        pending: Number(data.pending) || 0,
        confirmed: Number(data.confirmed) || 0,
        preparing: Number(data.preparing) || 0,
        ready: Number(data.ready) || 0,
        delayed: Number(data.delayed) || 0,
        completed: Number(data.completed) || 0,
        cancelled: Number(data.cancelled) || 0,
      });
    } catch (err) {
      setError(err.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Realtime order stats listener via Socket.IO
  useOrderSocket({
    onOrderUpdated: () => fetchStats(true),
    onReconnect: () => fetchStats(true),
    enabled: true,
  });

  // Aggregate computations
  const totalOrdersToday =
    stats.pending +
    stats.confirmed +
    stats.preparing +
    stats.ready +
    stats.delayed +
    stats.completed +
    stats.cancelled;

  const activeKitchenOrders =
    stats.pending + stats.confirmed + stats.preparing + stats.delayed;

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome with Clean Room */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#EBD4DC]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#352431] tracking-tight">
              Welcome back, {user?.name || "Admin"}
            </h2>
          </div>
          <p className="text-sm font-medium text-[#735A67] mt-1">
            Today's live canteen operations overview and order pipeline
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchStats(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EBD4DC] hover:border-[#C94F78]/50 text-[#735A67] hover:text-[#352431] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-98"
            title="Refresh statistics"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-[#C94F78]" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            to="/orders?view=board"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FBE7EE] border border-[#EBD4DC] hover:bg-[#FBE7EE]/80 text-[#C94F78] text-xs font-bold transition shadow-xs active:scale-98"
          >
            <span>🍳</span>
            <span>Kitchen Board</span>
          </Link>

          <Link
            to="/orders?view=table"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C94F78] hover:bg-[#B33D65] text-white text-xs font-bold transition shadow-md shadow-[#C94F78]/25 active:scale-98"
          >
            <span>View All Orders</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-rose-800">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
          <button
            onClick={() => fetchStats(false)}
            className="self-start sm:self-auto px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Level Overview Metrics (Minimal 3 Key Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Orders Today */}
        <div className="p-6 rounded-3xl bg-white border border-[#EBD4DC] shadow-[0_4px_20px_rgba(53,36,49,0.03)] relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-extrabold tracking-wider text-[#927681]">
              Total Orders Today
            </p>
            <div className="size-9 rounded-2xl bg-[#FFF9F2] text-[#735A67] border border-[#EBD4DC] flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-[#352431] mt-3 tracking-tight">
            {loading ? <span className="inline-block w-14 h-9 bg-[#FBE7EE] animate-pulse rounded-lg" /> : totalOrdersToday}
          </p>
          <p className="text-xs font-semibold text-[#735A67] mt-1.5">Across all order states</p>
        </div>

        {/* Active Kitchen Load */}
        <div className="p-6 rounded-3xl bg-white border border-[#EBD4DC] shadow-[0_4px_20px_rgba(53,36,49,0.03)] relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-extrabold tracking-wider text-[#C94F78]">
              Active Kitchen Load
            </p>
            <div className="size-9 rounded-2xl bg-[#FBE7EE] text-[#C94F78] border border-[#C94F78]/30 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-[#C94F78] mt-3 tracking-tight">
            {loading ? <span className="inline-block w-14 h-9 bg-[#FBE7EE] animate-pulse rounded-lg" /> : activeKitchenOrders}
          </p>
          <p className="text-xs font-semibold text-[#735A67] mt-1.5">Pending, confirmed & cooking</p>
        </div>

        {/* Ready for Pickup */}
        <div className="p-6 rounded-3xl bg-white border border-[#EBD4DC] shadow-[0_4px_20px_rgba(53,36,49,0.03)] relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-extrabold tracking-wider text-[#5F9A68]">
              Ready for Counter
            </p>
            <div className="size-9 rounded-2xl bg-emerald-50 text-[#5F9A68] border border-emerald-200 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-[#5F9A68] mt-3 tracking-tight">
            {loading ? <span className="inline-block w-14 h-9 bg-emerald-50 animate-pulse rounded-lg" /> : stats.ready}
          </p>
          <p className="text-xs font-semibold text-[#735A67] mt-1.5">Waiting for student pickup</p>
        </div>
      </div>

      {/* 7 Lifecycle Status Cards (Clean Room Layout) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-[#352431] tracking-tight">
              Order Pipeline Breakdown
            </h3>
            <p className="text-xs font-semibold text-[#735A67]">Real-time order statuses for today</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STATUS_CONFIG.map((cfg) => {
            const count = stats[cfg.key] || 0;

            if (loading) {
              return (
                <div
                  key={cfg.key}
                  className="p-5 rounded-2xl bg-white border border-[#EBD4DC] animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-8 rounded-lg bg-[#FBE7EE]" />
                    <div className="w-16 h-4 bg-[#FBE7EE] rounded" />
                  </div>
                  <div className="w-12 h-8 bg-[#FBE7EE] rounded" />
                  <div className="w-28 h-3 bg-[#FBE7EE] rounded" />
                </div>
              );
            }

            return (
              <Link
                key={cfg.key}
                to={`/orders?status=${cfg.statusFilter}`}
                className={`group p-5 rounded-2xl bg-white border ${cfg.borderColor} hover:border-[#C94F78]/40 hover:shadow-md transition-all flex flex-col justify-between shadow-xs`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`size-9 rounded-xl ${cfg.iconBg} flex items-center justify-center transition-transform group-hover:scale-105`}
                    >
                      {cfg.icon}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${cfg.bgColor} ${cfg.textColor} border ${cfg.borderColor}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div className="text-3xl font-black text-[#352431] tracking-tight">
                    {count}
                  </div>
                  <p className="text-xs font-semibold text-[#735A67] mt-1 line-clamp-1">
                    {cfg.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EBD4DC]/80 flex items-center justify-between text-xs font-bold text-[#735A67] group-hover:text-[#C94F78] transition-colors">
                  <span>View orders</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Access Grid (Minimal White Cards) */}
      <div className="pt-6 border-t border-[#EBD4DC]">
        <h3 className="text-lg font-extrabold text-[#352431] mb-4 tracking-tight">
          Quick Management Shortcuts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/orders"
            className="p-5 rounded-2xl bg-white border border-[#EBD4DC] hover:border-[#C94F78]/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-[#FBE7EE] text-[#C94F78] flex items-center justify-center group-hover:scale-105 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#352431]">Live Orders</p>
                <p className="text-xs font-semibold text-[#735A67]">Queue & counter pickup</p>
              </div>
            </div>
          </Link>

          <Link
            to="/products"
            className="p-5 rounded-2xl bg-white border border-[#EBD4DC] hover:border-[#C94F78]/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-[#FFF9F2] text-[#C94F78] border border-[#EBD4DC] flex items-center justify-center group-hover:scale-105 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#352431]">Menu Catalog</p>
                <p className="text-xs font-semibold text-[#735A67]">Dishes, pricing & stock</p>
              </div>
            </div>
          </Link>

          <Link
            to="/combos"
            className="p-5 rounded-2xl bg-white border border-[#EBD4DC] hover:border-[#C94F78]/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center group-hover:scale-105 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#352431]">Value Combos</p>
                <p className="text-xs font-semibold text-[#735A67]">Meal deals & packages</p>
              </div>
            </div>
          </Link>

          <Link
            to="/store-settings"
            className="p-5 rounded-2xl bg-white border border-[#EBD4DC] hover:border-[#C94F78]/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-xl bg-emerald-50 text-[#5F9A68] border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition">
                <span>⚙️</span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#352431]">Store & Banner</p>
                <p className="text-xs font-semibold text-[#735A67]">Hours & hero showcase</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
