// import React, { useState } from "react";







// export default function PromptHistory({ history, onSelect }) {
//   const [searchTerm, setSearchTerm] = useState("");







//   const filteredPrompts = history
//     .filter((entry) =>
//       entry.prompt.toLowerCase().includes(searchTerm.toLowerCase())
//     )
//     .slice()
//     .reverse()
//     .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

//   return (
//     <div className="file-history p-2">
//       <h6 className="text-center fw-bold mb-2">📁 My Chats</h6>

//       <input
//         type="text"
//         className="form-control mb-3"
//         placeholder="🔍 Search images..."
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//       />

//       {filteredPrompts.length === 0 ? (
//         <p className="text-muted text-center">No images found.</p>
//       ) : (
//         <ul className="list-unstyled">
//           {filteredPrompts.map((entry, index) => (
//             <li
//               key={index}
//               className="file-history-item text-truncate"
//               onClick={() => onSelect(entry)}
//               title={entry.prompt}
//               style={{ cursor: "pointer" }}
//             >
//               🖼️ {entry.prompt.length > 30 ? entry.prompt.slice(0, 30) + "..." : entry.prompt}
//               {entry.time && (
//                 <div className="timestamp small text-muted">
//                   {new Date(entry.time).toLocaleDateString()}
//                 </div>
//               )}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
import React, { useEffect,useContext, useState, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";
const PromptHistory = forwardRef(({ onSelectPrompt }, ref) => {
  const [prompts, setPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarselectimg,setsidebarselectimg]=useState(null)
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const fetchPrompts = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const response = await axios.get("http://localhost:8000/image-prompts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrompts(response.data);
    } catch (error) {
      console.error("Error fetching prompt history:", error);
    }
  };
  
  useImperativeHandle(ref, () => ({
    refreshPromptList: fetchPrompts,
  }));
  
  useEffect(() => {
    fetchPrompts();
  }, []);
  
  const filteredPrompts = prompts
    .filter((p) =>
      p.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="file-history p-0"> 
    <div className={`search-box sticky-top sidecol ${darkMode ? "dark-mode" : "light-mode"} pt-3 pb-2`}>
      <h6 className="text-center fw-bold mb-2">🖼️ My Chats</h6>
      <input
        type="text"
        className="form-control mb-3"
        placeholder="🔍 Search images..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
</div>

      {filteredPrompts.length === 0 ? (
        <p className="text-muted text-center">No prompts found.</p>
      ) : (
        <ul className="list-unstyled">
          {filteredPrompts.map((entry) => (
            <li
              key={entry.id}
              className={`file-history-item text-truncate ${
    sidebarselectimg === entry.time ? "selected" : ""
  }`}
              onClick={() => 
                
                {
                  console.log("Selected ID:", entry);onSelectPrompt(entry);
                  setsidebarselectimg(entry.time);
                }




              }
              title={`Generated: ${new Date(entry.time).toLocaleString()}`}
              style={{ cursor: "pointer" }}
            >
              🖼️ {entry.prompt.length > 30 ? entry.prompt.slice(0, 30) + "..." : entry.prompt}
              <div className="timestamp small ">
                {new Date(entry.time).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default PromptHistory;
