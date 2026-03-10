import { NavLink, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();

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
          <button
            className="navTextBtn"
            onClick={() => navigate("/provider-register")}
          >
            Register Service
          </button>

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
        </div>
      </div>
    </header>
  );
}