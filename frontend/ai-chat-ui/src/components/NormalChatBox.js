import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";

export default function NormalChatBox({
  chatHistory,
  setChatHistory,
  sessionId,
  setSessionId,
  onConversationSaved,
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  const handleQuery = async (event) => {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt || loading) return;

    const pendingMessages = [...chatHistory, { role: "user", content: prompt }];
    setChatHistory(pendingMessages);
    setQuery("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8000/query/",
        {
          query: prompt,
          mode: "chat",
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessionId(response.data.session_id);
      setChatHistory([
        ...pendingMessages,
        { role: "ai", content: response.data.response },
      ]);
      onConversationSaved?.();
    } catch (error) {
      console.error("Chat query error:", error);
      setChatHistory([
        ...pendingMessages,
        { role: "error", content: "Error processing your request." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel normal-chat-panel">
      <div className="flex-grow-1 overflow-auto">
        {chatHistory.length === 0 ? (
          <p className="text-center">Ask a question to start chatting.</p>
        ) : (
          chatHistory.map((message, index) => (
            <ChatMessage key={`${index}-${message.role}`} message={message} />
          ))
        )}
        {loading && (
          <div className="text-center my-2" role="status">
            <div className="spinner-border spinner-border-sm text-success" />
            <p className="mt-1">AI is thinking...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleQuery} className="chat-input-bar">
        <input
          type="text"
          aria-label="Message"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask anything..."
          disabled={loading}
        />
        <button type="submit" aria-label="Send message" disabled={loading || !query.trim()}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
