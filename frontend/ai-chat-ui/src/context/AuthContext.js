import { createContext, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(localStorage.getItem("token") || null);

  const login = async (username, password) => {
    try {
      const formData = new URLSearchParams();  // ✅ Use correct format
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch("http://localhost:8000/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",  // ✅ Explicitly set content-type
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem("token", data.access_token);
      setUser(data.access_token);

      return true;  // ✅ Return success so Login.js can proceed
    } catch (error) {
      console.error("Login Error:", error);
      return false;  // ✅ Return failure to prevent redirect
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
