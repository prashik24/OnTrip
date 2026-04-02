import { useEffect, useState } from "react";
import { apiFetch, getUser } from "../lib/api";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Community.css";

export default function Community() {
  const user = getUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/community/feed");
      setPosts(data.posts || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  async function createPost() {
    if (!text.trim()) return;

    try {
      const fd = new FormData();
      fd.append("text", text);

      const data = await apiFetch("/api/community", {
        method: "POST",
        body: fd,
      });

      setPosts((prev) => [data.post, ...prev]);
      setText("");
    } catch (err) {
      console.log(err);
    }
  }

  async function likePost(id) {
    const res = await apiFetch(`/api/community/${id}/like`, {
      method: "POST",
    });

    setPosts((prev) =>
      prev.map((p) => (p.id === id ? res.post : p))
    );
  }

  return (
    <div className="communityPage container">
      <div className="communityLayout">
        
        {/* LEFT SIDEBAR */}
        <aside className="communitySidebar">
          <div className="communityProfileCard">
            <div className="avatar">{user?.name?.[0]}</div>
            <h3>{user?.name}</h3>
            <p>{user?.city}</p>

            <div className="stats">
              <span>{user?.followers?.length || 0} Followers</span>
              <span>{user?.following?.length || 0} Following</span>
            </div>

            <Link to={`/community/profile/${user?.id}`} className="btn">
              View Profile
            </Link>
          </div>

          <div className="communityMenu">
            <Link to="/community">Home</Link>
            <Link to="/community/my-posts">My Posts</Link>
            <Link to="/community/bookmarks">Bookmarks</Link>
            <Link to="/community/likes">Liked Posts</Link>
            <Link to="/community/notifications">Notifications</Link>
          </div>
        </aside>

        {/* MAIN FEED */}
        <main className="communityFeed">
          
          <div className="createPost">
            <textarea
              placeholder="What's on your mind..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button onClick={createPost}>Post</button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            posts.map((post) => (
              <div className="postCard" key={post.id}>
                <div className="postHeader">
                  <strong>{post.author?.name}</strong>
                  <span>{post.author?.city}</span>
                </div>

                <div className="postText">{post.text}</div>

                {post.media?.map((m, i) =>
                  m.type === "image" ? (
                    <img key={i} src={m.url} className="postMedia" />
                  ) : (
                    <video key={i} src={m.url} controls className="postMedia" />
                  )
                )}

                <div className="postActions">
                  <button onClick={() => likePost(post.id)}>
                    ❤️ {post.likesCount}
                  </button>
                  <span>💬 {post.commentsCount}</span>
                </div>
              </div>
            ))
          )}
        </main>

      </div>
    </div>
  );
}