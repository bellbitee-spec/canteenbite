import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AdminHeader from "../components/AdminHeader";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#352431] font-sans flex antialiased selection:bg-[#FBE7EE] selection:text-[#C94F78]">
      {/* Sidebar (Desktop sticky / Mobile drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-5 sm:p-7 lg:p-9 w-full max-w-7xl mx-auto space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
