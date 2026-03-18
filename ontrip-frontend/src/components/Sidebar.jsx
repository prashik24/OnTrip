import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { clearAuth, getUser, isLoggedIn } from "../lib/api";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const user = getUser();
  const loggedIn = isLoggedIn();

  const userName = user?.name?.trim() || "Guest User";
  const userEmail = user?.email?.trim() || "Plan trips • share services";
  const avatar = user?.avatar?.trim() || "";
  const initial = userName?.charAt(0)?.toUpperCase() || "U";

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
    return navItems.filter((x) => x.label.toLowerCase().includes(q));
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
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="otSearchInput"
            placeholder="Search menu…"
          />
        </div>

        <div className="otProfileCard">
          <div className="otAvatarWrap">
            {avatar ? (
              <img src={avatar} alt={userName} className="otAvatarImg" />
            ) : (
              <div className="otAvatar" aria-hidden="true">
                {loggedIn ? initial : "OT"}
              </div>
            )}
            <span className={`otProfileStatus ${loggedIn ? "online" : "guest"}`} />
          </div>

          <div className="otProfileInfo">
            <div className="otProfileName">{userName}</div>
            <div className="otProfileSub">{loggedIn ? userEmail : "Plan trips • share services"}</div>
          </div>

          {loggedIn ? (
            <button
              className="otMiniLink"
              type="button"
              onClick={() => goWithClose("/profile")}
            >
              Profile
            </button>
          ) : (
            <button
              className="otMiniLink"
              type="button"
              onClick={() => goWithClose("/login")}
            >
              Login
            </button>
          )}
        </div>

        {loggedIn && (
          <div className="otSection otUserQuickSection">
            <div className="otSectionTitle">Your account</div>

            <div className="otMiniStats">
              <button
                className="otMiniStat"
                type="button"
                onClick={() => goWithClose("/profile")}
              >
                <span className="otMiniStatValue">Profile</span>
                <span className="otMiniStatLabel">Manage account</span>
              </button>

              <button
                className="otMiniStat"
                type="button"
                onClick={() => goWithClose("/profile/bookings")}
              >
                <span className="otMiniStatValue">Bookings</span>
                <span className="otMiniStatLabel">Your trips</span>
              </button>
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
                onClick={onClose}
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
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Goa
            </button>
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Manali
            </button>
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Jaipur
            </button>
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Kedarnath
            </button>
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Kerala
            </button>
            <button className="otTag" type="button" onClick={() => goWithClose("/explore")}>
              Mumbai
            </button>
          </div>
        </div>

        <div className="otSideBottom">
          {loggedIn ? (
            <button className="otBottomBtn otBottomBtnLogout" onClick={handleLogout} type="button">
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