import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ChatBox({ selectedFile, chatHistory, setChatHistory, onFileUploadSuccess }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);
  
  const handleQuery = async (event) => {
    event.preventDefault();
    if (!query.trim() || !selectedFile) return;

    const newMessages = [...chatHistory, { role: "user", content: query }];
    setChatHistory(newMessages);
    setQuery("");
    setLoading(true);
    
    try {
      const response = await axios.post(
        "http://localhost:8000/query/",
        { query, file_id: selectedFile.id,mode:"file" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChatHistory([...newMessages, { role: "ai", content: response.data.response }]);
    } catch (error) {
      console.error("Query Error:", error);
      setChatHistory([...newMessages, { role: "error", content: "⚠️ Error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/upload/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const uploadedFile = { id: response.data.file_id, filename: file.name };
      if (onFileUploadSuccess) onFileUploadSuccess(uploadedFile);
    } catch (error) {
      console.error("Upload failed", error);
      setChatHistory([...chatHistory, { role: "error", content: "⚠️ File upload failed." }]);
    }
  };
  
  return (
    <div className="chat-panel ">
      <div className="flex-grow-1  overflow-auto">
        {chatHistory.length === 0 ? (
          <p className=" text-center">Select a file and start chatting...</p>
        ) : (
          chatHistory.map((msg, index) => (
            <div key={index} className={`chat-bubble ${msg.role}`}>
              {msg.role === "user" ? "🧑‍💻 You:" : msg.role === "ai" ? "🤖 AI:" : "❌ Error:"} {msg.content}
            </div>
          ))
        )}
        {loading && (
          <div className="text-center my-2">
            <div className="spinner-border spinner-border-sm text-success"></div>
            <p className=" mt-1">AI is thinking...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleQuery} className="chat-input-bar">
        {/* Upload */}
        <label className="btn btn-outline-secondary mb-0">
          <i className="bi bi-paperclip"></i>
          <input
            type="file"
            style={{ display: "none" }}
            onChange={handleFileUpload}
            disabled={loading}
          />
        </label>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your message..."
          disabled={loading || !selectedFile}
        />

        {/* Send */}
        <button type="submit" disabled={loading || !selectedFile}>
          <i className="bi bi-send-fill"></i>
        </button>
      </form>
    </div>
  );
}
