import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { API_BASE_URL } from "../services/authApi";

export default function AccountEmail() {
  const { updateAccountEmail, resendAccountEmailVerification, logout } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetch(`${API_BASE_URL}/user/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Your session has expired. Please sign in again.");
        return response.json();
      })
      .then((account) => {
        setEmail(account.email || "");
        setVerified(account.email_verified);
        if (account.email_verified) navigate("/chat", { replace: true });
      })
      .catch((requestError) => {
        logout();
        setError(requestError.message);
      })
      .finally(() => setLoading(false));
  }, [logout, navigate, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const result = await updateAccountEmail(email);
      setVerified(false);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const result = await resendAccountEmailVerification();
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <section className="p-4 rounded-4 shadow-lg" style={{ width: "min(100% - 2rem, 420px)", backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}>
        <h3 className="text-center mb-3">Add a verified email</h3>
        {loading ? <p role="status">Loading account...</p> : (
          <>
            <p className="text-muted">Verify an email address to continue to your chats and recover your password.</p>
            <form onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="account-email">Email</label>
              <input
                id="account-email"
                type="email"
                autoComplete="email"
                className={`form-control mb-3 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button type="submit" className="btn btn-success w-100">Save and send verification link</button>
            </form>
            {!email && <p className="small mt-3">No email is currently linked to this account.</p>}
            {email && !verified && (
              <button type="button" className="btn btn-outline-secondary w-100 mt-2" onClick={handleResend}>
                Resend verification link
              </button>
            )}
          </>
        )}
        {message && <p className="alert alert-info mt-3" role="status">{message}</p>}
        {error && <p className="text-danger mt-3" role="alert">{error}</p>}
        <div className="text-center mt-3"><Link to="/login" onClick={logout}>Sign out</Link></div>
      </section>
    </div>
  );
}