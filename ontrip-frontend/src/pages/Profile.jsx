import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { apiFetch, clearAuth, getUser } from "../lib/api";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await apiFetch("/api/auth/me");
        setUser(data.user);
      } catch {
        // ignore
      }
    }

    loadMe();
  }, []);

  function logout() {
    clearAuth();
    navigate("/login");
  }

  return (
    <div className="container profile">
      <div className="profileHead card">
        <div className="avatar" />
        <div>
          <div className="name">{user?.name || "Traveler"}</div>
          <div className="sub">{user?.email || "No email"}</div>
        </div>
        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="grid2">
        <div className="card box">
          <div className="boxTitle">Your Account</div>
          <div className="muted">
            Email verified: {user?.isEmailVerified ? "Yes" : "No"}
          </div>
        </div>

        <div className="card box">
          <div className="boxTitle">Quick Actions</div>
          <div className="muted">
            Add your service or browse all vehicle and tour providers.
          </div>
        </div>
      </div>
    </div>
  );
}