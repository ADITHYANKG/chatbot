import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, RefreshCw, Search, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import { ThemeContext } from "../context/ThemeContext";
import { API_BASE_URL } from "../services/authApi";

export default function AdminDashboard() {
  const { darkMode } = useContext(ThemeContext);
  const token = localStorage.getItem("token");
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to load users");
      setUsers(data);
    } catch (requestError) {
      setError(requestError.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      `${user.username} ${user.email || ""}`.toLowerCase().includes(term)
    );
  }, [search, users]);

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.username} and their saved account data? This cannot be undone.`)) return;
    setDeletingId(user.id);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to delete user");
      setUsers((current) => current.filter((entry) => entry.id !== user.id));
    } catch (requestError) {
      setError(requestError.message || "Unable to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "-";

  return (
    <main className={`admin-page min-vh-100 p-3 p-md-4 ${darkMode ? "bg-dark text-light" : "bg-light text-dark"}`}>
      <div className="container-fluid admin-content">
        <div className="admin-heading d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="admin-heading-icon" aria-hidden="true"><ShieldCheck size={25} /></div>
            <div>
              <h1 className="h3 mb-1">Admin dashboard</h1>
              <p className="text-muted mb-0">Manage registered accounts and review account status.</p>
            </div>
          </div>
          <div className="admin-heading-actions d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={loadUsers} disabled={loading}>
              <RefreshCw size={16} className={loading ? "admin-refreshing" : ""} aria-hidden="true" /><span>Refresh</span>
            </button>
            <Link className="btn btn-outline-primary" to="/chat"><ArrowLeft size={16} aria-hidden="true" /><span>Back to chat</span></Link>
          </div>
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-4">
            <div className={`card admin-stat-card h-100 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}><div className="card-body d-flex align-items-center gap-3">
              <div className="admin-stat-icon users" aria-hidden="true"><Users size={20} /></div>
              <div><div className="text-muted small">Registered users</div><div className="fs-3 fw-semibold">{users.length}</div></div>
            </div></div>
          </div>
          <div className="col-12 col-sm-4">
            <div className={`card admin-stat-card h-100 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}><div className="card-body d-flex align-items-center gap-3">
              <div className="admin-stat-icon verified" aria-hidden="true"><UserCheck size={20} /></div>
              <div><div className="text-muted small">Verified emails</div><div className="fs-3 fw-semibold">{users.filter((user) => user.email_verified).length}</div></div>
            </div></div>
          </div>
          <div className="col-12 col-sm-4">
            <div className={`card admin-stat-card h-100 ${darkMode ? "bg-dark text-light border-secondary" : ""}`}><div className="card-body d-flex align-items-center gap-3">
              <div className="admin-stat-icon admins" aria-hidden="true"><ShieldCheck size={20} /></div>
              <div><div className="text-muted small">Administrators</div><div className="fs-3 fw-semibold">{users.filter((user) => user.is_admin).length}</div></div>
            </div></div>
          </div>
        </div>

        <section className={`card ${darkMode ? "bg-dark text-light border-secondary" : ""}`}>
          <div className="card-header admin-users-header d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h2 className="h5 mb-0">Users</h2>
            <div className="input-group admin-user-search-wrap">
              <span className={`input-group-text ${darkMode ? "bg-dark text-light border-secondary" : ""}`}><Search size={16} aria-hidden="true" /></span>
              <input
                className={`form-control admin-user-search ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
                type="search"
                placeholder="Search username or email"
                aria-label="Search users by username or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className={`table align-middle mb-0 ${darkMode ? "table-dark" : ""}`}>
              <thead><tr>
                <th scope="col">Username</th>
                <th scope="col">Email</th>
                <th scope="col">Email status</th>
                <th scope="col">Role</th>
                <th scope="col">Registered</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-4">Loading users...</td></tr>
                ) : visibleUsers.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-4">{users.length ? "No users match your search." : "No registered users."}</td></tr>
                ) : visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Username" className="fw-semibold">{user.username}</td>
                    <td data-label="Email" className="admin-user-email">{user.email || "-"}</td>
                    <td data-label="Email status"><span className={`badge ${user.email_verified ? "text-bg-success" : "text-bg-secondary"}`}>
                      {user.email_verified ? "Verified" : "Pending"}
                    </span></td>
                    <td data-label="Role">{user.is_admin ? "Admin" : "User"}</td>
                    <td data-label="Registered"><span className="admin-registration-date"><CalendarDays size={15} aria-hidden="true" />{formatDate(user.created_at)}</span></td>
                    <td data-label="Actions" className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger admin-delete-button"
                        disabled={user.is_admin || deletingId === user.id}
                        title={user.is_admin ? "Admin accounts cannot be deleted here" : "Delete user"}
                        onClick={() => deleteUser(user)}
                      >
                        <Trash2 size={15} aria-hidden="true" />{deletingId === user.id ? "Deleting..." : "Delete user"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
