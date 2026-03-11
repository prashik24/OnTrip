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
      setMsg({ text: data.message || "Profile updated successfully", type: "success" });
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
      setMsg({ text: data.message || "Profile image uploaded successfully", type: "success" });
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
    <div className="container profileSimplePage">
      <div className="profileSingleCard card">
        <div className="profileTopRow">
          <div className="profileAvatarWrap">
            {avatarSrc ? (
              <img
                className="profileHeroAvatar"
                src={avatarSrc}
                alt={user?.name || "User"}
              />
            ) : (
              <div className="profileHeroAvatar avatarFallback">
                {initial}
              </div>
            )}

            {editing && (
              <label className="profileUploadBtn">
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

          <div className="profileMainInfo">
            <div className="profileNameRow">
              <h2 className="profileMainName">{user?.name || "Traveler"}</h2>
              <span className="profileBadge">
                {user?.isEmailVerified ? "Verified" : "Not verified"}
              </span>
            </div>

            <div className="profileMainEmail">{user?.email || "No email"}</div>

            <div className="profileQuickInfo">
              <span className="profileChip">
                {user?.phone || "Phone not added"}
              </span>
              <span className="profileChip">
                {user?.city || "City not added"}
              </span>
            </div>
          </div>

          <div className="profileActionRow">
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditing((s) => !s);
                setMsg({ text: "", type: "" });
              }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>

            <button className="btn" type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {msg.text && (
          <div className={`profileAlert ${msg.type === "success" ? "success" : "error"}`}>
            {msg.text}
          </div>
        )}

        {!editing ? (
          <div className="profileContentView">
            <div className="profileSection">
              <div className="profileSectionTitle">About</div>
              <p className="profileBioText">
                {user?.bio?.trim() || "No bio added yet."}
              </p>
            </div>

            <div className="profileSection">
              <div className="profileSectionTitle">Personal Details</div>

              <div className="profileDetailsGrid">
                <div className="detailItem">
                  <div className="detailLabel">Full Name</div>
                  <div className="detailValue">{user?.name || "Not added"}</div>
                </div>

                <div className="detailItem">
                  <div className="detailLabel">Email</div>
                  <div className="detailValue">{user?.email || "Not added"}</div>
                </div>

                <div className="detailItem">
                  <div className="detailLabel">Phone</div>
                  <div className="detailValue">{user?.phone || "Not added"}</div>
                </div>

                <div className="detailItem">
                  <div className="detailLabel">City</div>
                  <div className="detailValue">{user?.city || "Not added"}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form className="profileEditFormSingle" onSubmit={saveProfile}>
            <div className="profileSectionTitle">Edit Details</div>

            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Enter your full name"
            />

            <div className="row2">
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Enter your city"
                />
              </div>
            </div>

            <label className="label">Bio</label>
            <textarea
              className="textarea"
              rows={5}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Write something about yourself"
            />

            <div className="profileFormActions">
              <button
                className="btn btnPrimary"
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