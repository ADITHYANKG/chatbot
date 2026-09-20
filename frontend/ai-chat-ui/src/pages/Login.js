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
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const { darkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(form.username, form.password);
    if (success) {
      navigate("/chat");
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <div
        className="p-4 rounded-4 shadow-lg"
        style={{
          minWidth: "340px",
          maxWidth: "420px",
          width: "100%",
          backgroundColor: darkMode ? "#1f1f1f" : "#fff",
        }}
      >
        <h3 className="text-center mb-4">🤖 Login to ChatBot</h3>
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
          <div className="mb-4">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={`form-control ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
              required
            />
          </div>
          <button type="submit" className="btn btn-success w-100">Login</button>
        </form>

        {/* Sign Up Link */}
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
