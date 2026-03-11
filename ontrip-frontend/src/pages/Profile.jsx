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
      } catch {
        // ignore
      }
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
      window.dispatchEvent(new Event("ontrip-auth-changed"));
      setEditing(false);
      setMsg({ text: data.message, type: "success" });
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
      setMsg({ text: "", type: "" });

      const formData = new FormData();
      formData.append("image", file);

      const data = await apiFetch("/api/auth/upload-profile-image", {
        method: "POST",
        body: formData,
      });

      setUser(data.user);
      saveUserOnly(data.user);
      window.dispatchEvent(new Event("ontrip-auth-changed"));
      setMsg({ text: data.message, type: "success" });
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    clearAuth();
    window.dispatchEvent(new Event("ontrip-auth-changed"));
    navigate("/login");
  }

  const avatarSrc = user?.avatar?.trim();
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="container profilePage">
      <div className="profileTop card">
        <div className="profileTopLeft">
          {avatarSrc ? (
            <img
              className="profileMainAvatar"
              src={avatarSrc}
              alt={user?.name || "User"}
            />
          ) : (
            <div className="profileMainAvatar profileAvatarFallback">
              {initial}
            </div>
          )}

          <div className="profileIntro">
            <h2 className="profileName">{user?.name || "Traveler"}</h2>
            <p className="profileEmail">{user?.email || "No email"}</p>
            <p className="profileStatus">
              {user?.isEmailVerified ? "Verified account" : "Not verified"}
            </p>
          </div>
        </div>

        <div className="profileTopActions">
          <button
            className="btn"
            onClick={() => setEditing((s) => !s)}
            type="button"
          >
            {editing ? "Cancel" : "Edit Profile"}
          </button>

          <button className="btn" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </div>

      {msg.text && (
        <div
          className={`profileMessage ${
            msg.type === "success" ? "success" : "error"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="profileGrid">
        <div className="card profileCard">
          <div className="profileCardTitle">Personal Information</div>

          <div className="profileInfoList">
            <div className="profileInfoRow">
              <span className="profileInfoLabel">Full Name</span>
              <span className="profileInfoValue">
                {user?.name || "Not added"}
              </span>
            </div>

            <div className="profileInfoRow">
              <span className="profileInfoLabel">Email</span>
              <span className="profileInfoValue">
                {user?.email || "Not added"}
              </span>
            </div>

            <div className="profileInfoRow">
              <span className="profileInfoLabel">Phone</span>
              <span className="profileInfoValue">
                {user?.phone || "Not added"}
              </span>
            </div>

            <div className="profileInfoRow">
              <span className="profileInfoLabel">City</span>
              <span className="profileInfoValue">
                {user?.city || "Not added"}
              </span>
            </div>

            <div className="profileInfoRow bioRow">
              <span className="profileInfoLabel">Bio</span>
              <span className="profileInfoValue">
                {user?.bio || "No bio added yet."}
              </span>
            </div>
          </div>
        </div>

        <div className="card profileCard">
          <div className="profileCardTitle">Profile Photo</div>

          <label className="uploadBtn">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
            {uploading ? "Uploading..." : "Upload New Photo"}
          </label>

          <div className="uploadHint">JPG, PNG, WEBP. Max 5 MB.</div>
        </div>
      </div>

      {editing && (
        <div className="card profileEditCard">
          <div className="profileCardTitle">Edit Profile</div>

          <form className="profileEditForm" onSubmit={saveProfile}>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your name"
            />

            <div className="row2">
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Your city"
                />
              </div>
            </div>

            <label className="label">Bio</label>
            <textarea
              className="textarea"
              rows={4}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell something about yourself"
            />

            <div className="profileEditActions">
              <button
                className="btn btnPrimary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}