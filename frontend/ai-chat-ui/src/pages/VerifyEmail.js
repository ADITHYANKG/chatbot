import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { useContext } from "react";
import { postAuthForm } from "../services/authApi";

export default function VerifyEmail() {
  const { darkMode } = useContext(ThemeContext);
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(Boolean(token));
  const submittedToken = useRef(null);

  useEffect(() => {
    if (!token) return;
    if (submittedToken.current === token) return;
    submittedToken.current = token;
    let active = true;
    postAuthForm("/email-verification/confirm/", { token })
      .then((result) => {
        if (active) setMessage(result.message);
      })
      .catch(() => {
        if (active) setError("This verification link is invalid or expired. Request a new one below.");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [token]);

  const handleResend = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await postAuthForm("/email-verification/request/", { email });
      setMessage(result.message);
    } catch {
      setError("Unable to submit the request right now. Please try again later.");
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <section className="p-4 rounded-4 shadow-lg" style={{ width: "min(100% - 2rem, 420px)", backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}>
        <img className={`auth-brand-logo ${darkMode ? "dark" : "light"}`} src="/custom_logo.png" alt="ChatBot" />
        <h3 className="text-center mb-3">Verify your email</h3>
        {checking && <p role="status">Checking your link...</p>}
        {message && <p className="alert alert-success" role="status">{message}</p>}
        {error && <p className="text-danger" role="alert">{error}</p>}
        {!checking && (!token || error) && (
          <form onSubmit={handleResend}>
            <label className="form-label" htmlFor="verify-email">Account email</label>
            <input
              id="verify-email"
              type="email"
              autoComplete="email"
              className={`form-control mb-3 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <button type="submit" className="btn btn-success w-100">Send verification link</button>
          </form>
        )}
        <div className="text-center mt-3">
          <Link to={localStorage.getItem("token") ? "/chat" : "/login"}>
            {localStorage.getItem("token") ? "Continue to chat" : "Back to login"}
          </Link>
        </div>
      </section>
    </div>
  );
}
