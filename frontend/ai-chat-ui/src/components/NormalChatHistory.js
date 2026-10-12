import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import axios from "axios";
import { Search } from "lucide-react";
import { API_BASE_URL } from "../services/authApi";

const NormalChatHistory = forwardRef(({ selectedSessionId, onSelectChat }, ref) => {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSessions = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/chat-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  useImperativeHandle(ref, () => ({ refreshChatList: fetchSessions }));

  useEffect(() => {
    fetchSessions();
  }, []);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredSessions = sessions.filter((session) =>
    (session.title || "New chat").toLowerCase().includes(normalizedSearchTerm)
  );

  return (
    <div className="file-history p-0">
      <div className="normal-chat-history-heading">
        <h6 className="text-center fw-bold mb-2">Recent Chats</h6>
        <div className="input-group">
          <span className="input-group-text" aria-hidden="true"><Search size={15} /></span>
          <input
            type="search"
            className="form-control"
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Search chat history"
          />
        </div>
      </div>
      {filteredSessions.length === 0 ? (
        searchTerm.trim() ? (
          <p className="text-center">No chats match your search.</p>
        ) : (
          <p className="text-center">No chats yet.</p>
        )
      ) : (
        <ul className="list-unstyled normal-chat-history-list">
          {filteredSessions.map((session) => (
            <li
              key={session.session_id}
              className={`file-history-item text-truncate ${
                selectedSessionId === session.session_id ? "selected" : ""
              }`}
              onClick={() => onSelectChat(session)}
              title={session.title}
              style={{ cursor: "pointer" }}
            >
              {session.title || "New chat"}
              <div className="timestamp small text-muted">
                {new Date(session.time).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default NormalChatHistory;
