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
  const [hasProviderListings, setHasProviderListings] = useState(false);
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
        //
      }
    }

    async function loadProviderStatus() {
      try {
        const data = await apiFetch("/api/providers/mine");
        setHasProviderListings((data.providers || []).length > 0);
      } catch {
        setHasProviderListings(false);
      }
    }

    loadMe();
    loadProviderStatus();
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
    <div className="profilePage container">
      <section className="profileCard">
        <div className="profileHeader">
          <div className="profileAvatarArea">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name || "User"} className="profileAvatar" />
            ) : (
              <div className="profileAvatar profileAvatarFallback">{initial}</div>
            )}

            {editing && (
              <label className="profilePhotoChange">
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
            <div className="profileIdentity">
              <h1>{user?.name || "Traveler"}</h1>
              <p>{user?.email || "No email added"}</p>
            </div>
 
          </div>

          <div className="profileActions">
            <button
              className="profilePrimaryBtn"
              onClick={() => {
                setEditing((prev) => !prev);
                setMsg({ text: "", type: "" });
              }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </button>

            <button className="profileGhostBtn" onClick={logout}>
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
              <h2>Bio</h2>
              <p>{user?.bio?.trim() || "No bio added yet."}</p>
            </div>

            <div className="profileSection">
              <h2>Personal Information</h2>
              <div className="profileInfoGrid">
                <div className="profileInfoItem">
                  <strong>Full Name</strong>
                  <span>{user?.name || "Not added"}</span>
                </div>

                <div className="profileInfoItem">
                  <strong>Email</strong>
                  <span>{user?.email || "Not added"}</span>
                </div>

                <div className="profileInfoItem">
                  <strong>Phone</strong>
                  <span>{user?.phone || "Not added"}</span>
                </div>

                <div className="profileInfoItem">
                  <strong>City</strong>
                  <span>{user?.city || "Not added"}</span>
                </div>
              </div>
            </div>

            <div className="profileQuickGrid">
              <div className="profileQuickCard">
                <h3>Booking History</h3>
                <p>Track bookings, payment state, and travel plans.</p>
                <button className="profileGhostBtn" onClick={() => navigate("/profile/bookings")}>
                  Open Booking History
                </button>
              </div>

              {hasProviderListings && (
                <>
                  <div className="profileQuickCard">
                    <h3>My Listings</h3>
                    <p>View, update, and remove your registered provider services.</p>
                    <button className="profileGhostBtn" onClick={() => navigate("/profile/my-listings")}>
                      Open My Listings
                    </button>
                  </div>

                  <div className="profileQuickCard">
                    <h3>Provider Dashboard</h3>
                    <p>View customer bookings, statuses, and updates.</p>
                    <button className="profileGhostBtn" onClick={() => navigate("/provider/dashboard")}>
                      Open Dashboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <form className="profileForm" onSubmit={saveProfile}>
            <h2>Edit Profile</h2>

            <div className="profileFormGrid">
              <div>
                <label>Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>

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

              <div className="fullSpan">
                <label>Bio</label>
                <textarea
                  rows={5}
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                />
              </div>
            </div>

            <button className="profilePrimaryBtn" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}