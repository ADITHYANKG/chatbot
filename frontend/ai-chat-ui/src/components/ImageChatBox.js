import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Image as ImageIcon, Send, Sparkles } from "lucide-react";

export default function ImageChatBox({ history, setHistory,promptHistoryRef }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    const newPrompt = { prompt, image_url: null };
    const updatedHistory = [newPrompt]; // overwrite old
    setHistory(updatedHistory);
    console.log("url")
    setPrompt("");
    setLoading(true);
    try {
      console.log("url2")
      const res = await axios.post("http://localhost:8000/query/", { prompt ,mode:"image"}, {
        headers: { Authorization: `Bearer ${token}`}}
      );
      const base64 = res.data.image_url;
      console.log("url3")
      const imageUrl = `data:image/png;base64,${base64}`;
      updatedHistory[updatedHistory.length - 1].image_url = imageUrl;
      
      setHistory([...updatedHistory]);
    } catch (err) {
      console.error("Image gen error", err);
    } finally {
      setLoading(false);
    }
   
    
    if (promptHistoryRef?.current?.refreshPromptList) {
      promptHistoryRef.current.refreshPromptList();
    }
    

    
  };
  
  return (
    <div className="chat-panel">
  <div className="flex-grow-1 overflow-auto d-flex justify-content-center">
    {history.length > 0 && (
      <div className="w-100 d-flex flex-column align-items-center px-3  ">
        <div className="w-100" style={{ maxWidth: "800px" }}>
          {/* Prompt Bubble */}
          <div className="prompt py-2 px-3 rounded-3" style={{ wordBreak: "break-word" }}>
            <strong><Sparkles size={16} aria-hidden="true" /> Prompt:</strong> {history[history.length - 1].prompt}
          </div>

          {/* Image Box */}
          {/* Image Box */}
<div className="py-3">
<div
  className=" d-flex align-items-start justify-content-start"
  style={{
    width: "60%",
    height: "450px",
    position: "relative",
    overflow: "hidden",
     // Optional: to give space from edge
  }}
>
  {/* Loader */}
  {loading && (
    <div className="rounded shadow d-flex w-100 h-100 border border-secondary flex-column align-items-center justify-content-center gap-2">
      <div className="spinner-border text-success" />
      <span className="d-flex align-items-center gap-2"><ImageIcon size={16} aria-hidden="true" /> Generating image...</span>
    </div>
  )}

  {/* Image */}
  {!loading && history[history.length - 1].image_url && (
    <img
      src={history[history.length - 1].image_url}
      alt="Can't load image"
      className="img-fluid rounded"
      style={{
        maxHeight: "100%",
        objectFit: "contain",
      }}
    />
  )}
</div>


</div>


        </div>
      </div>
    )}

    <div ref={bottomRef} />
  </div>

  <form onSubmit={handleSubmit} className="chat-input-bar">
    <input
      type="text"
      placeholder="Generate your image..."
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
    />
    <button type="submit" disabled={loading}>
      <Send size={18} aria-hidden="true" />
    </button>
  </form>
</div>

  );
}
