import { useState } from "react";
import { apiFetch } from "../lib/api";
import "./Footer.css";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  async function handleSubscribe(e) {
    e.preventDefault();

    if (!email.trim()) {
      setMsg({ text: "Please enter your email address.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const data = await apiFetch("/api/subscribers/subscribe", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      setMsg({
        text: data.message || "Subscribed successfully.",
        type: "success",
      });
      setEmail("");
    } catch (err) {
      setMsg({
        text: err.message || "Failed to subscribe.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <footer className="otFooter">
      <div className="otFooterTop">
        <div className="otFooterContainer">
          <div className="otBrand">
            <div className="otBrandName">OnTrip</div>
            <div className="otBrandTagline">
              AI trip plans • hidden places • verified costs • travel buddies
            </div>

            <div className="otSocial">
              <a className="otIconBtn" href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 4.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 8.5zm0 2A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 10.5zM18 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
                </svg>
              </a>

              <a className="otIconBtn" href="#" aria-label="X / Twitter">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.4L1 2h6.5l4.4 5.8L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z" />
                </svg>
              </a>

              <a className="otIconBtn" href="#" aria-label="YouTube">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5A3 3 0 0 0 2.4 7.2 31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8zM10 15.3V8.7L16 12l-6 3.3z" />
                </svg>
              </a>

              <a className="otIconBtn" href="#" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.9 6.8a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zM4.8 21.4V9h4.2v12.4H4.8zM10.8 21.4V9h4v1.7h.1a4.4 4.4 0 0 1 3.9-2.1c4.1 0 4.9 2.7 4.9 6.2v6.6h-4.2v-5.8c0-1.4 0-3.1-1.9-3.1-1.9 0-2.2 1.5-2.2 3v5.9h-4.2z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="otCols">
            <div className="otCol">
              <div className="otColTitle">Product</div>
              <a href="/planner">AI Trip Planner</a>
              <a href="/explore">Explore Places</a>
              <a href="/community">Community</a>
              <a href="/chat">Travel Buddy Chat</a>
            </div>

            <div className="otCol">
              <div className="otColTitle">Company</div>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
              <a href="#">Press</a>
            </div>

            <div className="otCol">
              <div className="otColTitle">Support</div>
              <a href="#">Help Center</a>
              <a href="#">Safety & Trust</a>
              <a href="#">Report Scam</a>
              <a href="#">FAQ</a>
            </div>
          </div>

          <div className="otNewsletter">
            <div className="otColTitle">Get travel updates</div>
            <div className="otNewsText">
              Get new hidden places, price alerts, and itinerary tips directly in
              your inbox.
            </div>

            <form className="otNewsForm" onSubmit={handleSubscribe}>
              <input
                className="otNewsInput"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <button
                className="otNewsBtn"
                type="submit"
                disabled={loading}
              >
                {loading ? "Subscribing..." : "Subscribe"}
              </button>
            </form>

            {msg.text ? (
              <div className={`otNewsMessage ${msg.type}`}>{msg.text}</div>
            ) : null}

            <div className="otSmallNote">
              By subscribing, you agree to receive emails from OnTrip.
            </div>
          </div>
        </div>
      </div>

      <div className="otFooterBottom">
        <div className="otFooterContainer otBottomInner">
          <div className="otCopyright">
            © {new Date().getFullYear()} OnTrip. All rights reserved.
          </div>

          <div className="otBottomLinks">
            <a href="#">Privacy</a>
            <span className="dot">•</span>
            <a href="#">Terms</a>
            <span className="dot">•</span>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}