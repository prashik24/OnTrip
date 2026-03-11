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
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    bio: "",
  });

  useEffect(() => {
    async function loadMe() {
      try {
        const data = await apiFetch("/api/auth/me");
        setUser(data.user);

        setForm({
          name: data.user?.name || "",
          phone: data.user?.phone || "",
          city: data.user?.city || "",
          bio: data.user?.bio || "",
        });

        saveUserOnly(data.user);
        window.dispatchEvent(new Event("ontrip-auth-changed"));
      } catch {}
    }

    loadMe();
  }, []);

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const data = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(form),
      });

      setUser(data.user);
      saveUserOnly(data.user);
      setEditing(false);

      setMsg({
        text: "Profile updated successfully",
        type: "success",
      });
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
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
        body: formData,
      });

      setUser(data.user);
      saveUserOnly(data.user);
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    clearAuth();
    navigate("/login");
  }

  const avatar = user?.avatar?.trim();
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="container profilePage">
      <div className="profileWrapper">

        <div className="profileHeader">

          <div className="avatarSection">
            {avatar ? (
              <img src={avatar} alt="user" className="avatar" />
            ) : (
              <div className="avatar avatarFallback">{initial}</div>
            )}

            {editing && (
              <label className="changePhoto">
                <input type="file" hidden accept="image/*" onChange={handleImageUpload}/>
                {uploading ? "Uploading..." : "Change photo"}
              </label>
            )}
          </div>

          <div className="profileInfo">
            <h1>{user?.name || "Traveler"}</h1>
            <p className="email">{user?.email}</p>

            <div className="meta">
              <span>{user?.phone || "No phone"}</span>
              <span>{user?.city || "No city"}</span>
            </div>
          </div>

          <div className="profileActions">
            <button
              className="btn primary"
              onClick={() => setEditing((s) => !s)}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>

            <button className="btn outline" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {msg.text && (
          <div className={`message ${msg.type}`}>
            {msg.text}
          </div>
        )}

        {!editing ? (
          <div className="profileContent">

            <div className="section">
              <h3>About</h3>
              <p>{user?.bio || "No bio added yet."}</p>
            </div>

            <div className="section">
              <h3>Details</h3>

              <div className="row">
                <span>Name</span>
                <strong>{user?.name}</strong>
              </div>

              <div className="row">
                <span>Email</span>
                <strong>{user?.email}</strong>
              </div>

              <div className="row">
                <span>Phone</span>
                <strong>{user?.phone || "-"}</strong>
              </div>

              <div className="row">
                <span>City</span>
                <strong>{user?.city || "-"}</strong>
              </div>

            </div>
          </div>
        ) : (
          <form className="editForm" onSubmit={saveProfile}>

            <label>Full Name</label>
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />

            <div className="grid2">
              <div>
                <label>Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>

              <div>
                <label>City</label>
                <input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
            </div>

            <label>Bio</label>
            <textarea
              rows="5"
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
            />

            <button className="btn primary">
              {loading ? "Saving..." : "Save Changes"}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}