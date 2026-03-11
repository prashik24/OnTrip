import { NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { clearAuth, getUser } from "../lib/api";
import { useEffect, useState } from "react";

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    function syncUser() {
      setUser(getUser());
    }

    window.addEventListener("storage", syncUser);
    window.addEventListener("ontrip-auth-changed", syncUser);

    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("ontrip-auth-changed", syncUser);
    };
  }, []);

  function logout() {
    clearAuth();
    window.dispatchEvent(new Event("ontrip-auth-changed"));
    navigate("/login");
  }

  const avatarSrc = user?.avatar?.trim();
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="navbar">
      <div className="navbarInner">
        <div className="navbarLeft">
          <button
            className="menuBtn"
            onClick={onToggleSidebar}
            aria-label="Open menu"
          >
            ☰
          </button>

          <NavLink to="/" className="brandText">
            OnTrip
          </NavLink>
        </div>

        <nav className="navbarCenter">
          <NavLink to="/" end className="navItem">
            Home
          </NavLink>
          <NavLink to="/explore" className="navItem">
            Explore
          </NavLink>
          <NavLink to="/planner" className="navItem">
            AI Planner
          </NavLink>
          <NavLink to="/community" className="navItem">
            Community
          </NavLink>
          <NavLink to="/chat" className="navItem">
            Chat
          </NavLink>
          <NavLink to="/providers" className="navItem">
            Providers
          </NavLink>
        </nav>

        <div className="navbarRight">
          {user ? (
            <>
              <button
                className="navUserLink"
                type="button"
                onClick={() => navigate("/profile")}
                aria-label="Open profile"
              >
                {avatarSrc ? (
                  <img
                    className="navAvatarImg"
                    src={avatarSrc}
                    alt={user.name}
                  />
                ) : (
                  <span className="navAvatarFallback">{userInitial}</span>
                )}

                <span className="navUserName">{user.name}</span>
              </button>

              <button className="navTextBtn" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="navTextBtn"
                onClick={() => navigate("/login")}
              >
                Login
              </button>

              <button
                className="navTextBtn signup"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}