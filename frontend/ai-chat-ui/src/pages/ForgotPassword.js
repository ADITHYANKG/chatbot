import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

export default function ForgotPassword() {
  const { requestPasswordReset } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
    } catch {
      setError("Unable to submit the request right now. Please try again later.");
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <section className="p-4 rounded-4 shadow-lg" style={{ width: "min(100% - 2rem, 420px)", backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}>
        <img className={`auth-brand-logo ${darkMode ? "dark" : "light"}`} src="/custom_logo.png" alt="ChatBot" />
        <h3 className="text-center mb-3">Reset your password</h3>
        <p className="text-muted">Enter the verified email address on your account.</p>
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            className={`form-control mb-3 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {message && <p className="alert alert-info" role="status">{message}</p>}
          {error && <p className="text-danger" role="alert">{error}</p>}
          <button type="submit" className="btn btn-success w-100">Send reset link</button>
        </form>
        <div className="text-center mt-3"><Link to="/login">Back to login</Link></div>
      </section>
    </div>
  );
}
