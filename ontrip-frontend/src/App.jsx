import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import ProviderDetails from "./pages/ProviderDetails";
import MyListings from "./pages/MyListings";
import ProviderDashboard from "./pages/ProviderDashboard";
import BookingHistory from "./pages/BookingHistory";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Planner from "./pages/Planner";
import Community from "./pages/Community";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Providers from "./pages/Providers";
import ProviderRegister from "./pages/ProviderRegister";

import "./App.css";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const layoutClass = useMemo(
    () => (sidebarOpen ? "layout layout--sidebar" : "layout"),
    [sidebarOpen]
  );

  return (
    <div className="appShell">
      <Navbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />

      {sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={layoutClass}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/community" element={<Community />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/providers" element={<Providers />} />
      
<Route path="/providers/:id" element={<ProviderDetails />} />
<Route path="/profile/my-listings" element={<MyListings />} />
<Route path="/profile/bookings" element={<BookingHistory />} />
<Route path="/provider/dashboard" element={<ProviderDashboard />} />
            <Route path="/provider-register" element={<ProviderRegister />} />

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>

          <Footer />
        </main>
      </div>
    </div>
  );
}