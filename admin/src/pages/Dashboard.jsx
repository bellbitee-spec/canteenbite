import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import orderService from "../services/orderService";
import useAuth from "../hooks/useAuth";
import useOrderSocket from "../hooks/useOrderSocket";

const STATUS_CONFIG = [
  {
    key: "pending",
    label: "Pending",
    desc: "Awaiting confirmation",
    statusFilter: "PENDING",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    iconBg: "bg-amber-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "confirmed",
    label: "Confirmed",
    desc: "Accepted, queued for kitchen",
    statusFilter: "CONFIRMED",
    textColor: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    iconBg: "bg-sky-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "preparing",
    label: "Preparing",
    desc: "Currently cooking / prepping",
    statusFilter: "PREPARING",
    textColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20",
    iconBg: "bg-indigo-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: "ready",
    label: "Ready for Pickup",
    desc: "Food ready at counter",
    statusFilter: "READY",
    textColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    iconBg: "bg-emerald-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    key: "delayed",
    label: "Delayed",
    desc: "Behind estimated prep time",
    statusFilter: "DELAYED",
    textColor: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    iconBg: "bg-rose-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    key: "completed",
    label: "Completed",
    desc: "Picked up & finalized",
    statusFilter: "COMPLETED",
    textColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    iconBg: "bg-green-500/20",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    key: "cancelled",
    label: "Cancelled",
    desc: "Voided by user or canteen",
    statusFilter: "CANCELLED",
    textColor: "text-slate-400",
    bgColor: "bg-slate-800/40",
    borderColor: "border-slate-800",
    iconBg: "bg-slate-800",
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
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name || "Admin"}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Today's live canteen operations overview and order pipeline
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchStats(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Refresh statistics"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`}
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-sm font-bold transition-colors shadow-xs"
          >
            <span>🍳</span>
            <span>Kitchen Board</span>
          </Link>

          <Link
            to="/orders?view=table"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-md shadow-indigo-600/25"
          >
            <span>View All Orders</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-red-200">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => fetchStats(false)}
            className="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Orders Today */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Total Orders Today
            </p>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-2">
            {loading ? <span className="inline-block w-12 h-8 bg-slate-800 animate-pulse rounded" /> : totalOrdersToday}
          </p>
          <p className="text-xs text-slate-400 mt-1">Across all statuses</p>
        </div>

        {/* Active Kitchen Load */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Active Kitchen Load
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">
            {loading ? <span className="inline-block w-12 h-8 bg-slate-800 animate-pulse rounded" /> : activeKitchenOrders}
          </p>
          <p className="text-xs text-slate-400 mt-1">Pending, Confirmed & Preparing</p>
        </div>

        {/* Ready for Pickup */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Ready for Counter
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">
            {loading ? <span className="inline-block w-12 h-8 bg-slate-800 animate-pulse rounded" /> : stats.ready}
          </p>
          <p className="text-xs text-slate-400 mt-1">Awaiting student pickup</p>
        </div>
      </div>

      {/* 7 Lifecycle Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            Order Status Breakdown
          </h3>
          <span className="text-xs text-slate-400">Real-time counts for today</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {STATUS_CONFIG.map((cfg) => {
            const count = stats[cfg.key] || 0;

            if (loading) {
              return (
                <div
                  key={cfg.key}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800" />
                    <div className="w-16 h-4 bg-slate-800 rounded" />
                  </div>
                  <div className="w-12 h-8 bg-slate-800 rounded mb-2" />
                  <div className="w-32 h-3 bg-slate-800 rounded" />
                </div>
              );
            }

            return (
              <Link
                key={cfg.key}
                to={`/orders?status=${cfg.statusFilter}`}
                className={`group p-5 rounded-2xl bg-slate-900 border ${cfg.borderColor} hover:border-slate-700 hover:bg-slate-850 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl ${cfg.iconBg} ${cfg.textColor} flex items-center justify-center transition-transform group-hover:scale-105`}
                    >
                      {cfg.icon}
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.textColor} border ${cfg.borderColor}`}
                    >
                      {cfg.label}
                    </span>
                  </div>

                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {count}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {cfg.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
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

      {/* Quick Access Grid */}
      <div className="mt-8 pt-6 border-t border-slate-800/80">
        <h3 className="text-base font-bold text-white mb-4">
          Quick Management Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/orders"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Live Orders</p>
                <p className="text-xs text-slate-400">Search, filter & update</p>
              </div>
            </div>
          </Link>

          <Link
            to="/products"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:bg-sky-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Products</p>
                <p className="text-xs text-slate-400">Stock & pricing</p>
              </div>
            </div>
          </Link>

          <Link
            to="/combos"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Combos</p>
                <p className="text-xs text-slate-400">Manage meal deals</p>
              </div>
            </div>
          </Link>

          <Link
            to="/store-settings"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Store Settings</p>
                <p className="text-xs text-slate-400">Opening hours & limits</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
