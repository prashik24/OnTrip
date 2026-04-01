import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import "./SocialLayout.css";
import "./SocialHome.css";

const postTypeOptions = [
  { label: "Text Post", value: "text" },
  { label: "Photo Post", value: "photo" },
  { label: "Video Post", value: "video" },
];

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function Sidebar({ profile }) {
  const username = profile?.username || "";

  return (
    <aside className="socialSidebar">
      <div className="socialCard socialProfileSummaryCard">
        <div className="socialProfileSummaryTop">
          {profile?.profileImage ? (
            <img src={profile.profileImage} alt={profile.displayName} className="socialProfileAvatar large" />
          ) : (
            <div className="socialProfileAvatarFallback large">
              {getInitial(profile?.displayName || profile?.username)}
            </div>
          )}
          <div className="socialProfileSummaryText">
            <strong>{profile?.displayName || "Profile"}</strong>
            <span>@{username}</span>
          </div>
        </div>
      </div>

      <nav className="socialCard socialNavCard">
        <NavLink to="/community" className="socialNavItem">Home Feed</NavLink>
        <NavLink to="/social/posts/me" className="socialNavItem">My Posts</NavLink>
        <NavLink to="/social/bookmarks" className="socialNavItem">Bookmarks</NavLink>
        <NavLink to="/social/liked" className="socialNavItem">Liked Posts</NavLink>
        <NavLink to="/social/notifications" className="socialNavItem">Notifications</NavLink>
        <NavLink to="/social/create" className="socialNavItem">Create Post</NavLink>
        <NavLink to={`/social/profile/${username}`} className="socialNavItem">Profile</NavLink>
      </nav>
    </aside>
  );
}

export default function SocialCreatePost() {
  const navigate = useNavigate();
  const me = getUser();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    postType: "text",
    text: "",
    files: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        if (!isLoggedIn()) {
          navigate("/login");
          return;
        }

        const profileRes = await apiFetch("/api/social/profile/me");
        setProfile(profileRes.profile || null);
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      }
    }

    init();
  }, [navigate, me?.id]);

  async function handleSubmit() {
    if (!form.text.trim() && form.files.length === 0) {
      setError("Write something or upload media.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const fd = new FormData();
      fd.append("text", form.text.trim());

      form.files.forEach((file) => {
        fd.append("media", file);
      });

      await apiFetch("/api/social/posts", {
        method: "POST",
        body: fd,
      });

      navigate("/community");
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container socialPage">
      {error ? <div className="socialAlert">{error}</div> : null}

      <div className="socialLayout">
        <Sidebar profile={profile} />

        <main className="socialMain">
          <div className="socialCard socialSectionHeaderCard">
            <h1>Create Post</h1>
            <p>Share text, photos, or videos with the community.</p>
          </div>

          <div className="socialCard socialCreatePostCard">
            <div className="socialCreatePostGrid">
              <CustomSelect
                value={form.postType}
                onChange={(e) => setForm((prev) => ({ ...prev, postType: e.target.value }))}
                options={postTypeOptions}
                placeholder="Choose type"
              />

              <textarea
                className="socialQuickComposerTextarea"
                rows={8}
                placeholder="Write your post..."
                value={form.text}
                onChange={(e) => setForm((prev) => ({ ...prev, text: e.target.value }))}
              />

              <div className="socialUploadRow">
                <button
                  type="button"
                  className="socialGhostBtn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Photos / Videos
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="socialHiddenInput"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      files: Array.from(e.target.files || []),
                    }))
                  }
                />

                <div className="socialFileText">
                  {form.files.length > 0
                    ? `${form.files.length} file(s) selected`
                    : "No file selected"}
                </div>
              </div>

              {form.files.length > 0 ? (
                <div className="socialSelectedFilesList">
                  {form.files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="socialSelectedFileItem">
                      {file.name}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="socialCreateActions">
                <button type="button" className="socialGhostBtn" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="button" className="socialPrimaryBtn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Posting..." : "Publish Post"}
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="socialRightBar">
          <div className="socialCard socialTipsCard">
            <h3>Post Ideas</h3>
            <div className="socialTipsList">
              <div>Share a trip photo dump.</div>
              <div>Ask a question using hashtags.</div>
              <div>Post travel tips or experience.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}