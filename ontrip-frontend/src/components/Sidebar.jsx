import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearAuth, getUser, isLoggedIn } from "../lib/api";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [hasProviderListings, setHasProviderListings] = useState(false);

  const user = getUser();
  const loggedIn = isLoggedIn();

  const userName = user?.name?.trim() || "";
  const avatar = user?.avatar?.trim() || "";
  const initial = userName?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    async function loadProviderStatus() {
      if (!loggedIn) {
        setHasProviderListings(false);
        return;
      }

      try {
        const data = await apiFetch("/api/providers/mine");
        setHasProviderListings((data.providers || []).length > 0);
      } catch {
        setHasProviderListings(false);
      }
    }

    loadProviderStatus();
  }, [loggedIn]);

  const navItems = useMemo(
    () => [
      { to: "/", label: "Home" },
      { to: "/explore", label: "Explore" },
      { to: "/planner", label: "AI Planner" },
      { to: "/community", label: "Community" },
      { to: "/chat", label: "Chat" },
      { to: "/providers", label: "Providers" },
      { to: "/provider-register", label: "Register Service" },
      { to: "/profile", label: "Profile" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, navItems]);

  function goWithClose(path) {
    onClose?.();
    navigate(path);
  }

  function handleProtectedRoute(path) {
    onClose?.();
    if (!loggedIn) {
      navigate("/login");
      return;
    }
    navigate(path);
  }

  function handleProfileClick() {
    onClose?.();
    if (!loggedIn) {
      navigate("/login");
      return;
    }
    navigate("/profile");
  }

  function handleLogout() {
    clearAuth();
    onClose?.();
    window.dispatchEvent(new Event("ontrip-auth-changed"));
    navigate("/login");
  }

  return (
    <aside className={open ? "otSide open" : "otSide"} aria-label="Sidebar">
      <div className="otSideInner">
        <div className="otSideTop">
          <div className="otSideTitle">Menu</div>

          <button
            className="otSideClose"
            onClick={onClose}
            aria-label="Close sidebar"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="otSearch">
          <span className="otSearchIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="otSearchSvg">
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M16 16L20 20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="otSearchInput"
            placeholder="Search menu..."
          />
        </div>

        {loggedIn ? (
          <div className="otProfileCard">
            <div className="otAvatarWrap">
              {avatar ? (
                <img src={avatar} alt={userName} className="otAvatarImg" />
              ) : (
                <div className="otAvatar" aria-hidden="true">
                  {initial}
                </div>
              )}
              <span className="otProfileStatus online" />
            </div>

            <div className="otProfileInfo">
              <button
                className="otProfileName otProfileNameBtn"
                type="button"
                onClick={handleProfileClick}
              >
                {userName}
              </button>
            </div>

            <button
              className="otMiniLink"
              type="button"
              onClick={handleProfileClick}
            >
              Profile
            </button>
          </div>
        ) : (
          <div className="otGuestCard">
            <div className="otGuestIcon" aria-hidden="true">
              ✦
            </div>

            <div className="otGuestContent">
              <div className="otGuestTitle">Welcome to OnTrip</div>
              <div className="otGuestText">
                Login to plan trips, manage bookings, chat, and add your travel
                services.
              </div>
            </div>

            <div className="otGuestActions">
              <button
                className="otGuestPrimary"
                type="button"
                onClick={() => goWithClose("/login")}
              >
                Login
              </button>

              <button
                className="otGuestSecondary"
                type="button"
                onClick={() => goWithClose("/signup")}
              >
                Create account
              </button>
            </div>
          </div>
        )}

        {loggedIn && (
          <div className="otSection otUserQuickSection">
            <div className="otSectionTitle">Quick Access</div>

            <div
              className={`otMiniStats ${
                hasProviderListings ? "threeCol" : "oneCol"
              }`}
            >
              <button
                className="otMiniStat"
                type="button"
                onClick={() => goWithClose("/profile/bookings")}
              >
                <span className="otMiniStatValue">My Bookings</span>
                <span className="otMiniStatLabel">Trips and reservations</span>
              </button>

              {hasProviderListings && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/profile/my-listings")}
                >
                  <span className="otMiniStatValue">My Listings</span>
                  <span className="otMiniStatLabel">View and manage services</span>
                </button>
              )}

              {hasProviderListings && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/provider/dashboard")}
                >
                  <span className="otMiniStatValue">Provider Dashboard</span>
                  <span className="otMiniStatLabel">Bookings and updates</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="otSection">
          <div className="otSectionTitle">Navigation</div>

          <div className="otNavList">
            {filtered.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive ? "otNavItem active" : "otNavItem"
                }
                onClick={(e) => {
                  if (item.to === "/profile" && !loggedIn) {
                    e.preventDefault();
                    handleProfileClick();
                    return;
                  }
                  onClose?.();
                }}
              >
                <span className="dot" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {filtered.length === 0 && <div className="otEmpty">No results</div>}
          </div>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Quick actions</div>

          <button
            className="otActionBtn"
            type="button"
            onClick={() => goWithClose("/planner")}
          >
            + Create AI Trip Plan
          </button>

          <button
            className="otActionBtn"
            type="button"
            onClick={() => handleProtectedRoute("/provider-register")}
          >
            + Add Vehicle / Tour Service
          </button>

          <button
            className="otActionBtn"
            type="button"
            onClick={() => goWithClose("/providers")}
          >
            + Browse Providers
          </button>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Popular now</div>

          <div className="otTags">
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Goa
            </button>
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Manali
            </button>
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Jaipur
            </button>
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Kedarnath
            </button>
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Kerala
            </button>
            <button
              className="otTag"
              type="button"
              onClick={() => goWithClose("/explore")}
            >
              Mumbai
            </button>
          </div>
        </div>

        <div className="otSideBottom">
          {loggedIn ? (
            <button
              className="otBottomBtn otBottomBtnLogout"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          ) : (
            <button
              className="otBottomBtn"
              onClick={() => goWithClose("/signup")}
              type="button"
            >
              Create account
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}