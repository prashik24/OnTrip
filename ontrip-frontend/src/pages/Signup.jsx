import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";
import { apiFetch, saveAuth } from "../lib/api";

export default function Signup() {
  const navigate = useNavigate();

  const [showPass, setShowPass] = useState(false);
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setMsg("");

      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      setMsg(data.message);
      setStep("otp");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setMsg("");

      const data = await apiFetch("/api/auth/verify-register-otp", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          otp: form.otp,
        }),
      });

      saveAuth(data);
      setMsg("Account created successfully");
      navigate("/profile");
    } catch (err) {
      setMsg(err.message);
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
            <h1 className="authTitle">Create your account</h1>
            <p className="authSub">
              Join OnTrip to plan smarter, discover places, and connect with travelers.
            </p>
          </div>

          {step === "form" ? (
            <form className="authForm" onSubmit={handleRegister}>
              <label className="authLabel">Full name</label>
              <input
                className="authInput"
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
              />

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
                  placeholder="Create a strong password"
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

              <label className="authCheck authTerms">
                <input type="checkbox" required />
                <span>I agree to Terms and Privacy Policy</span>
              </label>

              <button className="authPrimary" type="submit" disabled={loading}>
                {loading ? "Sending OTP..." : "Create account"}
              </button>
            </form>
          ) : (
            <form className="authForm" onSubmit={handleVerifyOtp}>
              <label className="authLabel">Enter OTP sent to email</label>
              <input
                className="authInput"
                type="text"
                placeholder="6-digit OTP"
                value={form.otp}
                onChange={(e) => update("otp", e.target.value)}
                required
              />

              <button className="authPrimary" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {msg && (
            <div className="authBottom" style={{ marginTop: 10 }}>
              {msg}
            </div>
          )}

          <div className="authBottom">
            Already have an account?{" "}
            <Link className="authLink" to="/login">
              Login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}