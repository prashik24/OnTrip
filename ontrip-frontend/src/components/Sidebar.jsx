import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearAuth, getUser, isLoggedIn } from "../lib/api";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [hasProviderListings, setHasProviderListings] = useState(false);
  const [hasBookings, setHasBookings] = useState(false);
  const [hasSavedTrips, setHasSavedTrips] = useState(false);
  const [hasUpcomingBookings, setHasUpcomingBookings] = useState(false);
  const [hasProviderUpcomingBookings, setHasProviderUpcomingBookings] =
    useState(false);
  const [isSubscribedUser, setIsSubscribedUser] = useState(false);

  const user = getUser();
  const loggedIn = isLoggedIn();

  const userName = user?.name?.trim() || "";
  const avatar = user?.avatar?.trim() || "";
  const initial = userName?.charAt(0)?.toUpperCase() || "U";

  const aiChatIcon =
    "https://img.icons8.com/?size=100&id=4aUvAATdDLe5&format=png&color=000000";

  useEffect(() => {
    async function loadQuickAccessStatus() {
      if (!loggedIn) {
        setHasProviderListings(false);
        setHasBookings(false);
        setHasSavedTrips(false);
        setHasUpcomingBookings(false);
        setHasProviderUpcomingBookings(false);
        setIsSubscribedUser(false);
        return;
      }

      const [
        providerRes,
        bookingRes,
        savedTripRes,
        upcomingRes,
        providerUpcomingRes,
        subscriberRes,
      ] = await Promise.allSettled([
        apiFetch("/api/providers/mine"),
        apiFetch("/api/bookings/mine"),
        apiFetch("/api/saved-trips"),
        apiFetch("/api/upcoming-bookings/user"),
        apiFetch("/api/upcoming-bookings/provider"),
        apiFetch("/api/subscribers/status"),
      ]);

      setHasProviderListings(
        providerRes.status === "fulfilled" &&
          (providerRes.value?.providers || []).length > 0
      );

      setHasBookings(
        bookingRes.status === "fulfilled" &&
          (bookingRes.value?.bookings || []).length > 0
      );

      setHasSavedTrips(
        savedTripRes.status === "fulfilled" &&
          (savedTripRes.value?.trips || []).length > 0
      );

      setHasUpcomingBookings(
        upcomingRes.status === "fulfilled" &&
          (upcomingRes.value?.bookings || []).length > 0
      );

      setHasProviderUpcomingBookings(
        providerUpcomingRes.status === "fulfilled" &&
          (providerUpcomingRes.value?.bookings || []).length > 0
      );

      setIsSubscribedUser(
        subscriberRes.status === "fulfilled" &&
          !!subscriberRes.value?.isSubscribed
      );
    }

    loadQuickAccessStatus();
  }, [loggedIn]);

  const showQuickAccess =
    loggedIn &&
    (hasBookings ||
      hasSavedTrips ||
      hasProviderListings ||
      hasUpcomingBookings ||
      hasProviderUpcomingBookings ||
      isSubscribedUser);

  const navItems = useMemo(
    () => [
      {
        to: "/",
        label: "Home",
        icon: "https://img.icons8.com/?size=100&id=2797&format=png&color=000000",
      },
      {
        to: "/explore",
        label: "Explore",
        icon: "https://img.icons8.com/?size=100&id=uHuD6VI5HlWw&format=png&color=000000",
      },
      {
        to: "/planner",
        label: "AI Planner",
        icon: "https://img.icons8.com/?size=100&id=pSv2x64tdztR&format=png&color=000000",
      },
      {
        to: "/ai-travel-chat",
        label: "AI Chat",
        icon: aiChatIcon,
      },
      {
        to: "/community",
        label: "Community",
        icon: "https://img.icons8.com/?size=100&id=102261&format=png&color=000000",
      },
      {
        to: "/chat",
        label: "Travel Buddy Chat",
        icon: "https://img.icons8.com/?size=100&id=85546&format=png&color=000000",
      },
      {
        to: "/providers",
        label: "Providers",
        icon: "https://img.icons8.com/?size=100&id=61121&format=png&color=000000",
      },
      {
        to: "/provider-register",
        label: "Register Service",
        icon: "https://img.icons8.com/?size=100&id=44471&format=png&color=000000",
      },
      {
        to: "/profile",
        label: "Profile",
        icon: "https://img.icons8.com/?size=100&id=7819&format=png&color=000000",
      },
    ],
    [aiChatIcon]
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
            className="otSideClose otBtnGhost"
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
                {userName || "Profile"}
              </button>
            </div>
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
                className="otGuestPrimary otBtnPrimary"
                type="button"
                onClick={() => goWithClose("/login")}
              >
                Login
              </button>

              <button
                className="otGuestSecondary otBtnGhost"
                type="button"
                onClick={() => goWithClose("/signup")}
              >
                Create account
              </button>
            </div>
          </div>
        )}

        {showQuickAccess && (
          <div className="otSection otUserQuickSection">
            <div className="otSectionTitle">Quick Access</div>

            <div className="otMiniStats">
              {hasBookings && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/profile/bookings")}
                >
                  <span className="otMiniStatValue">Booking History</span>
                  <span className="otMiniStatLabel">
                    Trips, payments, invoices, and reviews
                  </span>
                </button>
              )}

              {hasUpcomingBookings && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/upcoming-bookings")}
                >
                  <span className="otMiniStatValue">Upcoming Bookings</span>
                  <span className="otMiniStatLabel">
                    Your trip is coming
                  </span>
                </button>
              )}

              {hasSavedTrips && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/profile/saved-trips")}
                >
                  <span className="otMiniStatValue">Saved Trips</span>
                  <span className="otMiniStatLabel">
                    Open saved AI trip plans
                  </span>
                </button>
              )}

              {hasProviderListings && (
                <>
                  <button
                    className="otMiniStat"
                    type="button"
                    onClick={() => goWithClose("/profile/my-listings")}
                  >
                    <span className="otMiniStatValue">My Listings</span>
                    <span className="otMiniStatLabel">
                      View and manage services
                    </span>
                  </button>

                  <button
                    className="otMiniStat"
                    type="button"
                    onClick={() => goWithClose("/provider/dashboard")}
                  >
                    <span className="otMiniStatValue">Provider Dashboard</span>
                    <span className="otMiniStatLabel">
                      Bookings and customer updates
                    </span>
                  </button>

                  {hasProviderUpcomingBookings && (
                    <button
                      className="otMiniStat"
                      type="button"
                      onClick={() => goWithClose("/provider/upcoming-bookings")}
                    >
                      <span className="otMiniStatValue">
                        Customer Upcoming Bookings
                      </span>
                      <span className="otMiniStatLabel">
                        Upcoming customer trips
                      </span>
                    </button>
                  )}

                  <button
                    className="otMiniStat"
                    type="button"
                    onClick={() => goWithClose("/provider-broadcast")}
                  >
                    <span className="otMiniStatValue">Provider Broadcast</span>
                    <span className="otMiniStatLabel">
                      Send offers and updates
                    </span>
                  </button>

                  <button
                    className="otMiniStat"
                    type="button"
                    onClick={() => goWithClose("/provider-broadcast-history")}
                  >
                    <span className="otMiniStatValue">Broadcast History</span>
                    <span className="otMiniStatLabel">
                      View sent broadcasts
                    </span>
                  </button>

                  <button
                    className="otMiniStat"
                    type="button"
                    onClick={() => goWithClose("/provider/subscriber-groups")}
                  >
                    <span className="otMiniStatValue">Subscriber Group</span>
                    <span className="otMiniStatLabel">
                      Create subscriber chat groups
                    </span>
                  </button>
                </>
              )}

              {isSubscribedUser && !hasProviderListings && (
                <button
                  className="otMiniStat"
                  type="button"
                  onClick={() => goWithClose("/provider-broadcasts")}
                >
                  <span className="otMiniStatValue">Provider Broadcasts</span>
                  <span className="otMiniStatLabel">
                    View provider offers and updates
                  </span>
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

                  if (
                    ["/chat", "/ai-travel-chat", "/provider-register"].includes(
                      item.to
                    ) &&
                    !loggedIn
                  ) {
                    e.preventDefault();
                    handleProtectedRoute(item.to);
                    return;
                  }

                  onClose?.();
                }}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="otNavIcon"
                  loading="lazy"
                />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {filtered.length === 0 && <div className="otEmpty">No results</div>}
          </div>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Quick actions</div>

          <button
            className="otActionBtn otBtnPrimary"
            type="button"
            onClick={() => goWithClose("/planner")}
          >
            + Create AI Trip Plan
          </button>

          <button
            className="otActionBtn otBtnGhost"
            type="button"
            onClick={() => handleProtectedRoute("/ai-travel-chat")}
          >
            Ask OnTrip AI Chat
          </button>

          <button
            className="otActionBtn otBtnGhost"
            type="button"
            onClick={() => handleProtectedRoute("/provider-register")}
          >
            + Add Vehicle / Tour Service
          </button>

          <button
            className="otActionBtn otBtnGhost"
            type="button"
            onClick={() => goWithClose("/providers")}
          >
            + Browse Providers
          </button>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Popular now</div>

          <div className="otTags">
            {["Goa", "Manali", "Jaipur", "Kedarnath", "Kerala", "Mumbai"].map(
              (place) => (
                <button
                  key={place}
                  className="otTag"
                  type="button"
                  onClick={() => goWithClose("/explore")}
                >
                  {place}
                </button>
              )
            )}
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
              className="otBottomBtn otBtnPrimary"
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