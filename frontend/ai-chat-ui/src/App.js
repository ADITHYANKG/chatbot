import React, { useState, useContext, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider, ThemeContext } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChatBox from "./components/ChatBox";
import FileContent from "./components/FileContent";
import ProtectedRoute from "./components/ProtectedRoute";
import FileHistory from "./components/FileHistory";
import PromptHistory from "./components/PromptHistory";
import ImageChatBox from "./components/ImageChatBox";
import axios from "axios";
import DbChatBox from "./components/DbchatBox";
import QueryHistory from "./components/QueryHistory"
import NormalChatBox from "./components/NormalChatBox";
import NormalChatHistory from "./components/NormalChatHistory";

const getUsernameFromToken = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
    return JSON.parse(window.atob(paddedPayload)).sub || "User";
  } catch {
    return "User";
  }
};

function ChatPage() {
  
  
   //image bot
  const [mode, setMode] = useState("chat");
  // or "image"
  const [dbHistory, setDbHistory] = useState([]);
  const [imageHistory, setImageHistory] = useState([]);
  const promptHistoryRef = useRef();
  const normalChatHistoryRef = useRef();
  const [fileContent, setFileContent] = useState("");
  const [isTabular, setIsTabular] = useState(false);
  const [tableData, setTableData] = useState({ headers: [], rows: [] });
  const [chatHistory, setChatHistory] = useState([]);
  const [normalChatHistory, setNormalChatHistory] = useState([]);
  const [normalChatSessionId, setNormalChatSessionId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [databasename,setdatabasename]=useState(null)

  const token = localStorage.getItem("token");
  const username = token ? getUsernameFromToken(token) : "User";
  const { logout } = useContext(AuthContext);
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const QueryHistoryRef = useRef();
  const fileHistoryRef = useRef(); // ✅ Ref for sidebar refresh
 

  const handlenewchat=()=>{
    if (mode === "chat") {
      setNormalChatHistory([]);
      setNormalChatSessionId(null);
    } else if (mode === "file" ) {
      setSelectedFile(null);
      setChatHistory([]);
      setFileContent("");
      setIsTabular(false);
      setTableData({ headers: [], rows: [] });
    } else if (mode=="image") {
      setImageHistory([]);
    }else{
      setdatabasename("")
      setSelectedSessionId(null)
    setDbHistory([])
  }}
  const handleFileUploadSuccess = (newFile) => {
    fileHistoryRef.current?.refreshFileList(); // ✅ Refresh sidebar
    handleFileSelect(newFile); // ✅ Auto-load uploaded file
  };
  
  const handleFileSelect = async (file) => {
    setSelectedFile(file);
    try {
      const fileContentResponse = await axios.get(`http://localhost:8000/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (fileContentResponse.data) {
        setFileContent(fileContentResponse.data.text || "");
        setIsTabular(fileContentResponse.data.is_tabular || false);
        setTableData({
          headers: fileContentResponse.data.table_headers || [],
          rows: fileContentResponse.data.table_rows || [],
        });
      }

      const chatHistoryResponse = await axios.get(`http://localhost:8000/chats/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (chatHistoryResponse.data) {
        setChatHistory(chatHistoryResponse.data);
      }
    } catch (error) {
      console.error("Error fetching file details or chat history:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  return (
    <div className={`app-wrapper ${darkMode ? "dark-mode" : "light-mode"}`}>
      <header className="app-header">
        <button
          className="sidebar-toggle"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="chat-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {darkMode? <i className="bi bi-list text-white"></i> :<i className="bi bi-list"></i>}
        </button>
      {mode==="chat"&&(<h2>💬 Normal Chat</h2>)}
      {mode==="file"&&(<h2>💬 AI Chat with File</h2>)}
       {mode==="image"&&(<h2>💬 AI Image Generation</h2>)} 
       {mode==="database"&&(<h2>💬 AI Query Database</h2>)} 
        <div className="header-controls">
          <button onClick={toggleTheme} className="btn btn-sm">{darkMode ? "🔆" : "🌙"}</button>
          <button onClick={handleLogout} className="btn btn-sm btn-danger">Logout</button>
        </div>
      </header>

      <div className="app-body">
        <aside id="chat-sidebar" className={`sidebar ${sidebarOpen ? "open" : "collapsed"} border-end` } >
          <div className="sidebar-header ">
            <button className="btn btn-outline-primary w-100 mb-2" onClick={handlenewchat}>➕ New Chat</button>
            {/* <input type="text" className="form-control mb-2" placeholder="🔍 Search..." /> */}
             <button className={`btn-gradient-violet w-100 mb-2 ${mode === "chat" ? "chatbutton" : ""}`} onClick={() => setMode("chat")}>
              General Chat
            </button>
            <button className={`btn-gradient-violet  w-100 mb-2 ${mode === "file"?( "filebutton"):""}`} onClick={() => setMode("file")}>
              📄 File Chat 
            </button>
            <button className={`btn-gradient-violet file  w-100 mb-2 ${mode === "image" ? "imagebutton":"" }`}  onClick={() => setMode("image")}>
              🖼️ Image Engine 
            </button>
            <button className={`btn-gradient-violet  w-100 mb-2 ${mode === "database" ? "databasebutton":""}`}  onClick={() => setMode("database")}>
            🛢️ Db Query
            </button>
          </div>
          <div className="sidebar-scroll-area">
          {mode === "chat" && (
            <NormalChatHistory
              ref={normalChatHistoryRef}
              selectedSessionId={normalChatSessionId}
              onSelectChat={async (entry) => {
                setNormalChatSessionId(entry.session_id);
                try {
                  const response = await axios.get(
                    `http://localhost:8000/chat-history/${entry.session_id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  setNormalChatHistory(response.data.flatMap((turn) => [
                    { role: "user", content: turn.query },
                    { role: "ai", content: turn.response },
                  ]));
                } catch (error) {
                  console.error("Failed to load chat session:", error);
                }
              }}
            />
          )}
          {mode === "file"&&(
    <FileHistory ref={fileHistoryRef} onSelectFile={handleFileSelect} />
  ) }{mode==="image"&&
    (<PromptHistory
    ref={promptHistoryRef}
    onSelectPrompt={(entry) => {
      // Ensure base64 prefix is present
      if (!entry.image_url.startsWith("data:image")) {
        entry.image_url = `data:image/png;base64,${entry.image_url}`;
      }
  
      // Set this entry as the only one shown
      setImageHistory([entry]);
    }}
  />
 
  
  )}{mode==="database"&&(
 <QueryHistory
  ref={QueryHistoryRef}
  setdatabasename={setdatabasename}
  selectedSessionId={selectedSessionId}
  setSelectedSessionId={setSelectedSessionId}
  onSelectquery={async (entry) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`http://localhost:8000/db-history/${entry.session_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const messages = res.data.flatMap((item) => [
        { role: "user", content: item.query },
        { role: "ai", content: item.response }
      ]);
      
      setDbHistory(messages); // 💬 Restore chat history
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }}
/>

  )



  }
          </div>
          <div className="sidebar-user" title={username}>
            <div className="sidebar-user-avatar" aria-hidden="true">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="sidebar-user-name">{username}</span>
          </div>
        </aside>
        {sidebarOpen && (
          <button
            className="mobile-sidebar-backdrop"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="main-content">
        {mode === "chat" && (
          <NormalChatBox
            chatHistory={normalChatHistory}
            setChatHistory={setNormalChatHistory}
            sessionId={normalChatSessionId}
            setSessionId={setNormalChatSessionId}
            onConversationSaved={() => normalChatHistoryRef.current?.refreshChatList()}
          />
        )}
               {mode === "file" && (
            <>
            <div className="file-preview">
              <FileContent isTabular={isTabular} tableData={tableData} fileContent={fileContent} />
            </div>
            <ChatBox
              selectedFile={selectedFile}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              onFileUploadSuccess={handleFileUploadSuccess}
                />
       </> )}
        {mode==="image" &&(  <ImageChatBox
        history={imageHistory}
        setHistory={setImageHistory}
        promptHistoryRef={promptHistoryRef}
               />
        )}{mode==="database" &&(
          <DbChatBox
          selectedSessionId={selectedSessionId}
          databasename={databasename}
          setdatabasename={setdatabasename}
          setSelectedSessionId={setSelectedSessionId}
          QueryHistoryRef={QueryHistoryRef}
          dbHistory={dbHistory}
          setDbHistory={setDbHistory}
          />
        )

        }
          </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;


