import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Clock3, Image as ImageIcon, Send } from "lucide-react";
import ModelInfoButton from "./ModelInfoButton";
import { API_BASE_URL } from "../services/authApi";

export default function ImageChatBox({ history, setHistory,promptHistoryRef, modelName }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedImageUrl, setLoadedImageUrl] = useState(null);
  const [unavailableImageUrl, setUnavailableImageUrl] = useState(null);
  const token = localStorage.getItem("token");
  const bottomRef = useRef(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    const newPrompt = { prompt, image_url: null };
    setHistory([newPrompt]);
    setPrompt("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/query/`, { prompt, mode: "image" }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const imageUrl = res.data.image_url.startsWith("data:image") || res.data.image_url.startsWith("http")
        ? res.data.image_url
        : `data:image/png;base64,${res.data.image_url}`;
      setHistory([{
        ...newPrompt,
        image_url: imageUrl,
        usage: res.data.usage,
        generation_time_seconds: res.data.generation_time_seconds,
      }]);
    } catch (err) {
      console.error("Image gen error", err);
      setHistory([{ ...newPrompt, error: err.response?.data?.detail || "Image generation failed. Please try again." }]);
    } finally {
      setLoading(false);
    }
   
    
    if (promptHistoryRef?.current?.refreshPromptList) {
      promptHistoryRef.current.refreshPromptList();
    }
    

    
  };
  
  return (
    <div className="chat-panel">
      <div className="flex-grow-1 image-chat-messages">
        {history.length > 0 && (() => {
          const latest = history[history.length - 1];
          const imageIsLoaded = Boolean(latest.image_url && loadedImageUrl === latest.image_url);
          const imageIsUnavailable = Boolean(latest.image_url && unavailableImageUrl === latest.image_url);
          return (
            <>
              <div className="chat-bubble user">{latest.prompt}</div>
              <div className="image-generation-response">
                {(loading || latest.image_url || (!latest.error && latest.prompt)) && (
                  <div className={`image-generation-frame${imageIsLoaded ? " has-image" : ""}`}>
                    {latest.image_url && (
                      <img
                        src={latest.image_url}
                        alt={`Generated image: ${latest.prompt}`}
                        onLoad={() => setLoadedImageUrl(latest.image_url)}
                        onError={() => setUnavailableImageUrl(latest.image_url)}
                      />
                    )}
                    {!imageIsLoaded && (
                      <div className="image-generation-placeholder" role="status">
                        <div className="image-placeholder-glow" />
                        <div className="image-placeholder-icon"><ImageIcon size={27} aria-hidden="true" /></div>
                        <strong>{loading ? "Creating your image" : imageIsUnavailable ? "Saved image unavailable" : latest.image_url ? "Loading your image" : "Image data unavailable"}</strong>
                        <span>{loading ? "Waiting for an AI Horde community worker… We’ll stop after 3 minutes and show a warning." : imageIsUnavailable ? "This older image link may have expired. Generate the prompt again to restore it." : latest.image_url ? "Preparing the generated image…" : "Generate this prompt again to create and save its image."}</span>
                        <div className="image-placeholder-skeleton" aria-hidden="true"><i /><i /><i /></div>
                      </div>
                    )}
                  </div>
                )}
                {!loading && latest.error && <p className="image-generation-error">{latest.error}</p>}
                {!loading && latest.image_url && Number.isFinite(latest.generation_time_seconds) && (
                  <div className="image-generation-metadata">
                    <Clock3 size={14} aria-hidden="true" />
                    <span>
                      Generated in {latest.generation_time_seconds >= 60
                        ? `${Math.floor(latest.generation_time_seconds / 60)}m ${Math.round(latest.generation_time_seconds % 60)}s`
                        : `${latest.generation_time_seconds.toFixed(1)}s`}
                    </span>
                  </div>
                )}
              </div>
            </>
          );
        })()}
        <div ref={bottomRef} />
      </div>

  <form onSubmit={handleSubmit} className="chat-input-bar">
    <div className="chat-input-field">
      <input
        type="text"
        placeholder="Generate your image..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <ModelInfoButton modelName={modelName} />
    </div>
    <button type="submit" disabled={loading}>
      <Send size={18} aria-hidden="true" />
    </button>
  </form>
</div>

  );
}
