import { useEffect, useState } from "react";
import "./Profile.css";
import { apiFetch, clearAuth, getUser, saveUserOnly } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    bio: ""
  });

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await apiFetch("/api/auth/me");
        setUser(data.user);

        setForm({
          name: data.user?.name || "",
          phone: data.user?.phone || "",
          city: data.user?.city || "",
          bio: data.user?.bio || ""
        });

        saveUserOnly(data.user);
      } catch {}
    }

    loadUser();
  }, []);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();

    try {
      setLoading(true);

      const data = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(form)
      });

      setUser(data.user);
      saveUserOnly(data.user);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      const data = await apiFetch("/api/auth/upload-profile-image", {
        method: "POST",
        body: formData
      });

      setUser(data.user);
      saveUserOnly(data.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    clearAuth();
    navigate("/login");
  }

  const avatarSrc = user?.avatar?.trim();
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="container profilePage">
      <div className="profileWrapper">

        {/* PROFILE HEADER */}

        <div className="profileHeader">

          <div className="profileAvatar">
            {avatarSrc ? (
              <img src={avatarSrc} alt="profile"/>
            ) : (
              <div className="avatarFallback">{initial}</div>
            )}

            {editing && (
              <label className="changePhoto">
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {uploading ? "Uploading..." : "Change"}
              </label>
            )}
          </div>

          <div className="profileInfo">
            <h1>{user?.name || "Traveler"}</h1>

            <p className="email">{user?.email}</p>

            <div className="meta">
              {user?.city && <span>{user.city}</span>}
              {user?.phone && <span>{user.phone}</span>}
            </div>
          </div>

          <div className="profileActions">
            <button
              className="btn"
              onClick={() => setEditing(s => !s)}
            >
              {editing ? "Cancel" : "Edit"}
            </button>

            <button
              className="btn ghost"
              onClick={logout}
            >
              Logout
            </button>
          </div>

        </div>

        {/* ABOUT */}

        {!editing ? (
          <div className="profileContent">

            <div className="about">
              <h2>About</h2>
              <p>{user?.bio || "No bio added yet."}</p>
            </div>

          </div>
        ) : (
          <form className="profileForm" onSubmit={saveProfile}>

            <label>Full Name</label>
            <input
              value={form.name}
              onChange={e => update("name", e.target.value)}
            />

            <label>Phone</label>
            <input
              value={form.phone}
              onChange={e => update("phone", e.target.value)}
            />

            <label>City</label>
            <input
              value={form.city}
              onChange={e => update("city", e.target.value)}
            />

            <label>About</label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={e => update("bio", e.target.value)}
            />

            <button className="btn primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}