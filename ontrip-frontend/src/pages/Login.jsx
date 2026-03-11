import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { apiFetch, saveAuth } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const [showPass, setShowPass] = useState(false);
  const [mode, setMode] = useState("password");
  const [form, setForm] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  useEffect(() => {
    if (!window.google || !googleBtnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          setMsg({ text: "", type: "" });

          const data = await apiFetch("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({
              credential: response.credential,
            }),
          });

          saveAuth(data);
          navigate("/profile");
        } catch (err) {
          setMsg({ text: err.message, type: "error" });
        }
      },
    });

    googleBtnRef.current.innerHTML = "";

    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: 360,
    });
  }, [navigate]);

  async function handlePasswordLogin(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      saveAuth(data);
      navigate("/profile");
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp() {
    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const data = await apiFetch("/api/auth/send-login-otp", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });

      setMsg({ text: data.message, type: "success" });
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpLogin(e) {
    e.preventDefault();

    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const data = await apiFetch("/api/auth/verify-login-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          otp: form.otp,
        }),
      });

      saveAuth(data);
      window.dispatchEvent(new Event("ontrip-auth-changed"));
      navigate("/profile");
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="authPage">
      <div className="authWrap authWrapSingle">
        <div className="authCard">
          <div className="authHeader">
            <div className="authBrand">OnTrip</div>
            <h1 className="authTitle">Welcome back</h1>
            <p className="authSub">
              Login with password, email OTP, or Google.
            </p>
          </div>

          <div className="googleWrap" ref={googleBtnRef} />

          <div className="authDivider">
            <span>or</span>
          </div>

          <div className="authTabs">
            <button
              type="button"
              className={mode === "password" ? "authTab active" : "authTab"}
              onClick={() => setMode("password")}
            >
              Password
            </button>
            <button
              type="button"
              className={mode === "otp" ? "authTab active" : "authTab"}
              onClick={() => setMode("otp")}
            >
              Email OTP
            </button>
          </div>

          {mode === "password" ? (
            <form className="authForm" onSubmit={handlePasswordLogin}>
              <label className="authLabel">Email</label>
              <input
                className="authInput"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />

              <label className="authLabel">Password</label>
              <div className="authPassRow">
                <input
                  className="authInput"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                />
                <button
                  className="authMiniBtn"
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              <button className="authPrimary" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form className="authForm" onSubmit={verifyOtpLogin}>
              <label className="authLabel">Email</label>
              <input
                className="authInput"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
              />

              <button
                type="button"
                className="authPrimary"
                onClick={sendOtp}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>

              <label className="authLabel">OTP</label>
              <input
                className="authInput"
                type="text"
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) => update("otp", e.target.value)}
                required
              />

              <button className="authPrimary" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP & Login"}
              </button>
            </form>
          )}

          {msg.text && (
            <div className={`authMessage ${msg.type === "success" ? "success" : "error"}`}>
              {msg.text}
            </div>
          )}

          <div className="authBottom">
            Don’t have an account?{" "}
            <Link className="authLink" to="/signup">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}