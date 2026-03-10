import { useMemo, useState } from "react";
import "./Community.css";

const seedPosts = [
  {
    id: 1,
    type: "Q/A",
    title: "Is Jaipur safe for solo travelers at night?",
    text: "Any areas to avoid? Also how much should autos charge near Hawa Mahal?",
    tags: ["Safety", "Costs"],
    votes: 18,
    comments: 6,
  },
  {
    id: 2,
    type: "Vlog",
    title: "Goa budget breakdown (3 days)",
    text: "Hostel ₹700/day, scooter ₹450/day, food ₹500/day average. Hidden beach: go early morning.",
    tags: ["Budget", "Hidden"],
    votes: 42,
    comments: 14,
  },
];

export default function Community() {
  const [posts, setPosts] = useState(seedPosts);
  const [tab, setTab] = useState("All");
  const [text, setText] = useState("");

  const filtered = useMemo(() => {
    return posts.filter((p) => tab === "All" || p.type === tab);
  }, [posts, tab]);

  function addPost() {
    if (!text.trim()) return;
    const newPost = {
      id: Date.now(),
      type: "Q/A",
      title: "New question",
      text,
      tags: ["Community"],
      votes: 0,
      comments: 0,
    };
    setPosts((p) => [newPost, ...p]);
    setText("");
  }

  return (
    <div className="container community">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Community (Posts • Costs • Q/A)</h2>
          <p className="pageSub">
            Share hostel/bus costs so locals can’t cheat, ask questions, comment and help travelers.
          </p>
        </div>
      </div>

      <div className="communityTop">
        <div className="tabs">
          {["All", "Q/A", "Vlog"].map((t) => (
            <button
              key={t}
              className={tab === t ? "tab active" : "tab"}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="composer card">
          <div className="composerTitle">Ask something / Share costs</div>
          <textarea
            className="textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Example: 'Bus fare from station to hostel is ₹..., avoid agents near ...' "
          />
          <button className="btn btnPrimary" onClick={addPost}>
            Post
          </button>
        </div>
      </div>

      <div className="postGrid">
        {filtered.map((p) => (
          <article key={p.id} className="post card">
            <div className="postTop">
              <div className="postType">{p.type}</div>
              <div className="postStats">
                <span>▲ {p.votes}</span>
                <span>💬 {p.comments}</span>
              </div>
            </div>
            <div className="postTitle">{p.title}</div>
            <div className="postText">{p.text}</div>
            <div className="tagRow">
              {p.tags.map((t) => (
                <span className="tag" key={t}>{t}</span>
              ))}
            </div>
            <div className="postActions">
              <button className="btn">Upvote</button>
              <button className="btn">Comment</button>
              <button className="btn">Share</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
