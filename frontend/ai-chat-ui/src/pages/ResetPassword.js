import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import PasswordInput from "../components/PasswordInput";
import { PASSWORD_REQUIREMENTS_MESSAGE, passwordMeetsRequirements } from "../utils/passwordPolicy";

export default function ResetPassword() {
  const { resetPassword } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    if (!passwordMeetsRequirements(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    try {
      const result = await resetPassword(token, password);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError.message || "This reset link is invalid or expired.");
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <section className="p-4 rounded-4 shadow-lg" style={{ width: "min(100% - 2rem, 420px)", backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}>
        <h3 className="text-center mb-3">Choose a new password</h3>
        {!token && <p className="text-danger" role="alert">This reset link is missing or invalid.</p>}
        {token && !message && (
          <form onSubmit={handleSubmit}>
            <PasswordInput
              id="new-password"
              label="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              darkMode={darkMode}
              autoComplete="new-password"
              showRequirements
            />
            <PasswordInput
              id="confirm-password"
              label="Confirm password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              darkMode={darkMode}
              autoComplete="new-password"
            />
            {error && <p className="text-danger" role="alert">{error}</p>}
            <button type="submit" className="btn btn-success w-100">Update password</button>
          </form>
        )}
        {message && <p className="alert alert-success" role="status">{message}</p>}
        <div className="text-center mt-3"><Link to="/login">Back to login</Link></div>
      </section>
    </div>
  );
}