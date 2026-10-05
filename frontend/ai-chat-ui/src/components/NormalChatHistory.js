import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../services/authApi";

const NormalChatHistory = forwardRef(({ selectedSessionId, onSelectChat }, ref) => {
  const [sessions, setSessions] = useState([]);

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

  return (
    <div className="file-history p-0">
      <div className="search-box sticky-top sidecol pt-3 pb-2">
        <h6 className="text-center fw-bold mb-2">Recent Chats</h6>
      </div>
      {sessions.length === 0 ? (
        <p className="text-center">No chats yet.</p>
      ) : (
        <ul className="list-unstyled">
          {sessions.map((session) => (
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
