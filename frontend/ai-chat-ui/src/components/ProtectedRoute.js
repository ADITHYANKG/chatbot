import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../services/authApi";

const ProtectedRoute = ({ children }) => {
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
        if (active) setStatus(account.email_verified ? "ready" : "email");
      })
      .catch(() => {
        if (active) setStatus("login");
      });
    return () => { active = false; };
  }, [user]);

  if (!user || status === "login") return <Navigate to="/login" replace />;
  if (status === "email") return <Navigate to="/account/email" replace />;
  if (status !== "ready") return <div className="p-4 text-center" role="status">Checking account...</div>;
  return children;
};

export default ProtectedRoute;
