// import { useState, useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useNavigate, Link } from "react-router-dom";

// export default function Login() {
//   const { login } = useContext(AuthContext);
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState(null);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);

//     const success = await login(username, password);  // ✅ Wait for login to complete

//     if (success) {
//       navigate("/chat");  // ✅ Redirect user only if login is successful
//     } else {
//       setError("Login failed. Please check your credentials.");
//     }
//   };
  
//   return (
//     <div className="login-container">
//       <div className="login-box">
//         <h2>🚀 Welcome Back</h2>
//         <p className="subtext">Log in to continue your AI conversations.</p>
//         <form onSubmit={handleSubmit} className="login-form">
//           <div className="input-group">
//             <input
//               type="text"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               required
//               className="input-field"
//               placeholder="👤 Username"
//             />
//           </div>
//           <div className="input-group">
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="input-field"
//               placeholder="🔒 Password"
//             />
//           </div>
//           {error && <p className="error-message">{error}</p>}
//           <button type="submit" className="login-button">Login 🚀</button>
//         </form>
//         <p className="signup-link">
//           Not a user? <Link to="/register">Sign Up Now</Link>
//         </p>
//       </div>
//     </div>
//   );
// }
import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { Bot } from "lucide-react";

export default function Login() {
  const { login } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const result = await login(form.username, form.password);
    if (result) {
      navigate(result.emailVerified ? "/chat" : "/account/email");
    } else {
      setError("Login failed. Check your username and password.");
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <div
        className="auth-card p-4 rounded-4 shadow-lg"
        style={{ backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}
      >
        <img className={`auth-brand-logo ${darkMode ? "dark" : "light"}`} src="/custom_logo.png" alt="ChatBot" />
        <h3 className="text-center mb-4"><Bot size={22} aria-hidden="true" /> Login to ChatBot</h3>
        {location.state?.notice && <p className="alert alert-info">{location.state.notice}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className={`form-control ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
              required
            />
          </div>
          <PasswordInput
            id="login-password"
            name="password"
            label="Password"
            value={form.password}
            onChange={handleChange}
            darkMode={darkMode}
            autoComplete="current-password"
            className="mb-4"
          />
          {error && <p className="text-danger small" role="alert">{error}</p>}
          <button type="submit" className="btn btn-success w-100">Login</button>
        </form>

        <div className="d-flex justify-content-between mt-3 small">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/verify-email">Resend verification</Link>
        </div>
        <div className="text-center mt-3">
          <span className="me-1">Don't have an account?</span>
          <Link to="/register" className={`fw-bold ${darkMode ? "text-light" : "text-primary"}`}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
