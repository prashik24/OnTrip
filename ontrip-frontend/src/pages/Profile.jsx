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

  function cancelEdit() {
    setEditing(false);
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      city: user?.city || "",
      bio: user?.bio || "",
    });
    setMsg({ text: "", type: "" });
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
      <section className="profileHero card">
        <div className="profileHeroLeft">
          {avatarSrc ? (
            <img
              className="profileHeroAvatar"
              src={avatarSrc}
              alt={user?.name || "User"}
            />
          ) : (
            <div className="profileHeroAvatar profileHeroFallback">
              {initial}
            </div>
          )}

          <div className="profileHeroText">
            <div className="profileEyebrow">My Profile</div>
            <h1 className="profileHeroName">{user?.name || "Traveler"}</h1>
            <div className="profileHeroEmail">{user?.email || "No email"}</div>
            <div className="profileHeroMeta">
              <span className="profileBadge">
                {user?.isEmailVerified ? "Verified account" : "Not verified"}
              </span>
              {user?.city && <span className="profileBadge soft">{user.city}</span>}
            </div>
          </div>
        </div>

        <div className="profileHeroActions">
          {!editing ? (
            <button
              className="btn btnPrimary"
              type="button"
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <button className="btn" type="button" onClick={cancelEdit}>
              Cancel
            </button>
          )}

          <button className="btn" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      {msg.text && (
        <div className={`profileMessage ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}

      {!editing ? (
        <div className="profileGrid">
          <section className="card profilePanel">
            <div className="profilePanelHead">
              <h2 className="profilePanelTitle">Personal Information</h2>
              <p className="profilePanelSub">Basic account details</p>
            </div>

            <div className="profileInfoGrid">
              <div className="profileInfoItem">
                <div className="profileInfoLabel">Full Name</div>
                <div className="profileInfoValue">{user?.name || "Not added"}</div>
              </div>

              <div className="profileInfoItem">
                <div className="profileInfoLabel">Email</div>
                <div className="profileInfoValue">{user?.email || "Not added"}</div>
              </div>

              <div className="profileInfoItem">
                <div className="profileInfoLabel">Phone</div>
                <div className="profileInfoValue">{user?.phone || "Not added"}</div>
              </div>

              <div className="profileInfoItem">
                <div className="profileInfoLabel">City</div>
                <div className="profileInfoValue">{user?.city || "Not added"}</div>
              </div>
            </div>
          </section>

          <section className="card profilePanel">
            <div className="profilePanelHead">
              <h2 className="profilePanelTitle">About</h2>
              <p className="profilePanelSub">Short personal intro</p>
            </div>

            <div className="profileAboutBox">
              {user?.bio?.trim() ? user.bio : "No bio added yet."}
            </div>
          </section>
        </div>
      ) : (
        <section className="card profileEditPanel">
          <div className="profilePanelHead">
            <h2 className="profilePanelTitle">Edit Profile</h2>
            <p className="profilePanelSub">
              Update your details and profile photo
            </p>
          </div>

          <div className="profileEditTop">
            <div className="profilePhotoBlock">
              {avatarSrc ? (
                <img
                  className="profileEditAvatar"
                  src={avatarSrc}
                  alt={user?.name || "User"}
                />
              ) : (
                <div className="profileEditAvatar profileHeroFallback">
                  {initial}
                </div>
              )}

              <div className="profileUploadArea">
                <label className="uploadBtn">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    hidden
                  />
                  {uploading ? "Uploading..." : "Upload Profile Image"}
                </label>

                <div className="uploadHint">
                  JPG, PNG, WEBP. Max 5 MB.
                </div>
              </div>
            </div>
          </div>

          <form className="profileEditForm" onSubmit={saveProfile}>
            <div className="row2">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <label className="label">City</label>
            <input
              className="input"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Your city"
            />

            <label className="label">Bio</label>
            <textarea
              className="textarea"
              rows={5}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              placeholder="Tell something about yourself"
            />

            <div className="profileFormActions">
              <button className="btn" type="button" onClick={cancelEdit}>
                Cancel
              </button>

              <button
                className="btn btnPrimary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}