import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../services/authApi";

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch(`${API_BASE_URL}/user/`, {
      headers: { Authorization: `Bearer ${user}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Authentication required");
        return response.json();
      })
      .then((account) => {
        if (active) {
          if (!account.email_verified) setStatus("email");
          else if (adminOnly && !account.is_admin) setStatus("forbidden");
          else setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("login");
      });
    return () => { active = false; };
  }, [user, adminOnly]);

  if (!user || status === "login") return <Navigate to="/login" replace />;
  if (status === "email") return <Navigate to="/account/email" replace />;
  if (status === "forbidden") return <Navigate to="/chat" replace />;
  if (status !== "ready") return <div className="p-4 text-center" role="status">Checking account...</div>;
  return children;
};

export default ProtectedRoute;
