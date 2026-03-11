import { useEffect, useState } from "react";
import "./Profile.css";
import { apiFetch, clearAuth, getUser, saveUserOnly } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser());
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
    <div className="container profile">
      <div className="profileHead card">
        <div className="profileIdentity">
          {avatarSrc ? (
            <img className="profileAvatarImg" src={avatarSrc} alt={user?.name || "User"} />
          ) : (
            <div className="avatar">{initial}</div>
          )}

          <div>
            <div className="name">{user?.name || "Traveler"}</div>
            <div className="sub">{user?.email || "No email"}</div>
          </div>
        </div>

        <button className="btn" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="grid2">
        <div className="card box">
          <div className="boxTitle">Your Information</div>
          <div className="muted">Email verified: {user?.isEmailVerified ? "Yes" : "No"}</div>
          <div className="muted">Phone: {user?.phone || "Not added"}</div>
          <div className="muted">City: {user?.city || "Not added"}</div>
        </div>

        <div className="card box">
          <div className="boxTitle">Profile Photo</div>

          <label className="uploadBtn">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
            {uploading ? "Uploading..." : "Choose Image"}
          </label>

          <div className="muted uploadHint">
            JPG, PNG, WEBP. Max 5 MB.
          </div>
        </div>
      </div>

      <div className="card box profileFormWrap">
        <div className="boxTitle">Edit Profile</div>

        <form className="profileForm" onSubmit={saveProfile}>
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

          <button className="btn btnPrimary profileSaveBtn" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {msg.text && (
          <div className={`authMessage ${msg.type === "success" ? "success" : "error"}`}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}