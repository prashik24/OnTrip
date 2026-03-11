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
    <div className="container profilePage">
      <section className="profileHero card">
        <div className="profileHeroLeft">
          <div className="profileAvatarBox">
            {avatarSrc ? (
              <img
                className="profileAvatarImg"
                src={avatarSrc}
                alt={user?.name || "User"}
              />
            ) : (
              <div className="profileAvatarFallback">{initial}</div>
            )}
          </div>

          <div className="profileHeroText">
            <div className="profileBadge">Traveler Profile</div>
            <h1 className="profileName">{user?.name || "Traveler"}</h1>
            <p className="profileEmail">{user?.email || "No email found"}</p>

            <div className="profileMetaRow">
              <span className="profileMetaPill">
                {user?.isEmailVerified ? "Verified account" : "Not verified"}
              </span>
              <span className="profileMetaPill">
                {user?.city || "City not added"}
              </span>
            </div>
          </div>
        </div>

        <div className="profileHeroRight">
          <label className="profileUploadBtn">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
            {uploading ? "Uploading..." : "Change photo"}
          </label>

          <button className="profileGhostBtn" onClick={logout} type="button">
            Logout
          </button>
        </div>
      </section>

      <section className="profileContentGrid">
        <div className="card profileInfoCard">
          <div className="profileSectionHead">
            <h2>Account details</h2>
            <p>Your basic information visible inside your account.</p>
          </div>

          <div className="profileInfoList">
            <div className="profileInfoItem">
              <span className="profileInfoLabel">Full name</span>
              <span className="profileInfoValue">{user?.name || "Not added"}</span>
            </div>

            <div className="profileInfoItem">
              <span className="profileInfoLabel">Email</span>
              <span className="profileInfoValue">{user?.email || "Not added"}</span>
            </div>

            <div className="profileInfoItem">
              <span className="profileInfoLabel">Phone</span>
              <span className="profileInfoValue">{user?.phone || "Not added"}</span>
            </div>

            <div className="profileInfoItem">
              <span className="profileInfoLabel">City</span>
              <span className="profileInfoValue">{user?.city || "Not added"}</span>
            </div>

            <div className="profileInfoItem profileInfoItemBio">
              <span className="profileInfoLabel">Bio</span>
              <span className="profileInfoValue">{user?.bio || "No bio added yet."}</span>
            </div>
          </div>
        </div>

        <div className="card profileEditCard">
          <div className="profileSectionHead">
            <h2>Edit profile</h2>
            <p>Keep your personal details updated.</p>
          </div>

          <form className="profileForm" onSubmit={saveProfile}>
            <div className="profileField">
              <label className="profileLabel">Full name</label>
              <input
                className="profileInput"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="profileRow">
              <div className="profileField">
                <label className="profileLabel">Phone</label>
                <input
                  className="profileInput"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="profileField">
                <label className="profileLabel">City</label>
                <input
                  className="profileInput"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Enter your city"
                />
              </div>
            </div>

            <div className="profileField">
              <label className="profileLabel">Bio</label>
              <textarea
                className="profileTextarea"
                rows={5}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="Write something about yourself"
              />
            </div>

            <button
              className="profileSaveBtn"
              type="submit"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save changes"}
            </button>
          </form>

          {msg.text && (
            <div
              className={
                msg.type === "success"
                  ? "profileMessage success"
                  : "profileMessage error"
              }
            >
              {msg.text}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}