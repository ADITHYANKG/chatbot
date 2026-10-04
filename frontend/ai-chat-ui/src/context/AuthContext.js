import { createContext, useState } from "react";
import { postAuthForm } from "../services/authApi";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(localStorage.getItem("token") || null);

  const login = async (username, password) => {
    try {
      const data = await postAuthForm("/login/", { username, password });
      localStorage.setItem("token", data.access_token);
      setUser(data.access_token);
      return { emailVerified: data.email_verified === true };
    } catch (error) {
      console.error("Login Error:", error);
      return null;
    }
  };

  const requestPasswordReset = (email) => postAuthForm("/password-reset/request/", { email });
  const resetPassword = (token, new_password) =>
    postAuthForm("/password-reset/confirm/", { token, new_password });
  const updateAccountEmail = (email) =>
    postAuthForm("/account/email/", { email }, localStorage.getItem("token"));
  const resendAccountEmailVerification = () =>
    postAuthForm("/account/email/resend/", {}, localStorage.getItem("token"));

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        requestPasswordReset,
        resetPassword,
        updateAccountEmail,
        resendAccountEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
