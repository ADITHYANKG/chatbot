// import { useState, useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useNavigate, Link } from "react-router-dom";

// export default function Register() {
//   const { login } = useContext(AuthContext);
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState(null);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);

//     const formData = new URLSearchParams();
//     formData.append("username", username);
//     formData.append("password", password);

//     try {
//       const response = await fetch("http://localhost:8000/register/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: formData,
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.detail || "Registration failed");
//       }

//       await login(username, password);
//       navigate("/chat");  // ✅ Redirect to chat after registration
//     } catch (error) {
//       setError(error.message);
//     }
//   };

//   return (
//     <div className="register-container">
//       <div className="register-box">
//         <h2>🚀 Create Your Account</h2>
//         <p className="subtext">Join and start chatting with AI.</p>
//         <form onSubmit={handleSubmit} className="register-form">
//           <div className="input-group">
//             <input
//               type="text"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               required
//               className="input-field"
//               placeholder="👤 Choose a Username"
//             />
//           </div>
//           <div className="input-group">
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               className="input-field"
//               placeholder="🔒 Choose a Password"
//             />
//           </div>
//           {error && <p className="error-message">{error}</p>}
//           <button type="submit" className="register-button">Sign Up 🚀</button>
//         </form>
//         <p className="login-link">
//           Already have an account? <Link to="/login">Login</Link>
//         </p>
//       </div>
//     </div>
//   );
// }
import { useState, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate, Link } from "react-router-dom";
import PasswordInput from "../components/PasswordInput";
import { PASSWORD_REQUIREMENTS_MESSAGE, passwordMeetsRequirements } from "../utils/passwordPolicy";
import { UserPlus } from "lucide-react";

export default function Register() {
  const { darkMode } = useContext(ThemeContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsRequirements(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("email", email);

    try {
      const response = await fetch("http://localhost:8000/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Registration failed");
      }

      navigate("/login", {
        state: { notice: "Account created. Check your email for a verification link before signing in." },
      });
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className={`min-vh-100 d-flex align-items-center justify-content-center ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <div
        className="auth-card p-4 rounded-4 shadow-lg"
        style={{ backgroundColor: darkMode ? "#1f1f1f" : "#fff" }}
      >
        <h3 className="text-center mb-2"><UserPlus size={22} aria-hidden="true" /> Create Your Account</h3>
        <p className="text-center text-muted mb-4">Join and start chatting with AI</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`form-control ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
              placeholder="Choose a username"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`form-control ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
              autoComplete="email"
            />
          </div>

          <PasswordInput
            id="register-password"
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            darkMode={darkMode}
            autoComplete="new-password"
            showRequirements
          />

          {error && <p className="text-danger text-center small mb-3">{error}</p>}

          <button type="submit" className="btn btn-success w-100">Create account</button>
        </form>

        <div className="text-center mt-3">
          <span className="me-1">Already have an account?</span>
          <Link to="/login" className={`fw-bold ${darkMode ? "text-light" : "text-primary"}`}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
