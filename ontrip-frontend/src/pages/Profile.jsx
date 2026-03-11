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
    setForm((prev) => ({ ...prev, [key]: value }));
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
      setMsg({
        text: data.message || "Profile updated successfully",
        type: "success",
      });
    } catch (err) {
      setMsg({ text: err.message || "Something went wrong", type: "error" });
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
      setMsg({
        text: data.message || "Profile image uploaded successfully",
        type: "success",
      });
    } catch (err) {
      setMsg({ text: err.message || "Upload failed", type: "error" });
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
      <div className="profileCard">
        <div className="profileHeader">
          <div className="profileAvatarArea">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user?.name || "User"}
                className="profileAvatar"
              />
            ) : (
              <div className="profileAvatar profileAvatarFallback">
                {initial}
              </div>
            )}

            {editing && (
              <label className="changePhotoText">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  hidden
                />
                {uploading ? "Uploading..." : "Change Photo"}
              </label>
            )}
          </div>

          <div className="profileMain">
            <div className="profileTop">
              <div>
                <h1 className="profileName">{user?.name || "Traveler"}</h1>
                <p className="profileEmail">{user?.email || "No email added"}</p>
              </div>
            </div>
          </div>

          <div className="profileActions">
            <button
              type="button"
              className="profileBtn primaryBtn"
              onClick={() => {
                setEditing((prev) => !prev);
                setMsg({ text: "", type: "" });
              }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>

            <button
              type="button"
              className="profileBtn lightBtn"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>

        {msg.text && (
          <div className={`profileMessage ${msg.type}`}>
            {msg.text}
          </div>
        )}

        {!editing ? (
          <div className="profileContent">
            <div className="profileSection">
              <h2 className="sectionTitle">Bio</h2>
              <p className="aboutText">
                {user?.bio?.trim() || "No bio added yet."}
              </p>
            </div>

            <div className="profileSection">
              <h2 className="sectionTitle">Personal Information</h2>

              <div className="infoGrid">
                <div className="infoItem">
                  <span className="infoLabel">Full Name</span>
                  <span className="infoValue">{user?.name || "Not added"}</span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Email</span>
                  <span className="infoValue">{user?.email || "Not added"}</span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">Phone</span>
                  <span className="infoValue">{user?.phone || "Not added"}</span>
                </div>

                <div className="infoItem">
                  <span className="infoLabel">City</span>
                  <span className="infoValue">{user?.city || "Not added"}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="profileForm" onSubmit={saveProfile}>
            <h2 className="sectionTitle">Edit Profile</h2>

            <div className="formGroup">
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="profileFormGrid">
              <div className="formGroup">
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="formGroup">
                <label className="label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Enter your city"
                />
              </div>
            </div>

            <div className="formGroup">
              <label className="label">Bio</label>
              <textarea
                className="textarea"
                rows={5}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Write something about yourself"
              />
            </div>

            <div className="formActions">
              <button
                className="profileBtn primaryBtn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}