import { NavLink, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

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

  return (
    <aside className={open ? "otSide open" : "otSide"} aria-label="Sidebar">
      <div className="otSideInner">
        <div className="otSideTop">
          <div className="otSideTitle">Menu</div>

          <button
            className="otSideClose"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <div className="otSearch">
          <span className="otSearchIcon" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="otSearchInput"
            placeholder="Search menu…"
          />
        </div>

        <div className="otProfileCard">
          <div className="otAvatar" aria-hidden="true">OT</div>
          <div className="otProfileInfo">
            <div className="otProfileName">Guest User</div>
            <div className="otProfileSub">Plan trips • share services</div>
          </div>

          <button className="otMiniLink" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>

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
              >
                <span className="dot" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {filtered.length === 0 && (
              <div className="otEmpty">No results</div>
            )}
          </div>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Quick actions</div>

          <button
            className="otActionBtn"
            onClick={() => navigate("/planner")}
          >
            + Create AI Trip Plan
          </button>

          <button
            className="otActionBtn"
            onClick={() => navigate("/provider-register")}
          >
            + Add Vehicle / Tour Service
          </button>

          <button
            className="otActionBtn"
            onClick={() => navigate("/providers")}
          >
            + Browse Providers
          </button>
        </div>

        <div className="otSection">
          <div className="otSectionTitle">Popular now</div>

          <div className="otTags">
            <button className="otTag" type="button">Goa</button>
            <button className="otTag" type="button">Manali</button>
            <button className="otTag" type="button">Jaipur</button>
            <button className="otTag" type="button">Kedarnath</button>
            <button className="otTag" type="button">Kerala</button>
            <button className="otTag" type="button">Mumbai</button>
          </div>
        </div>

        <div className="otSideBottom">
          <button
            className="otBottomBtn"
            onClick={() => navigate("/signup")}
          >
            Create account
          </button>
        </div>
      </div>
    </aside>
  );
}