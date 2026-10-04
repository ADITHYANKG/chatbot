import React, { useEffect,useContext, useState, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { FileText, FolderOpen, Search } from "lucide-react";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";
const FileHistory = forwardRef(({ onSelectFile }, ref) => {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const [sidebarselectfile,setsidebarselectfile]=useState(null)
  const fetchFiles = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const response = await axios.get("http://localhost:8000/files/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data);
    } catch (error) {
      console.error("Error fetching file history:", error);
    }
  };
  
  useImperativeHandle(ref, () => ({
    refreshFileList: fetchFiles,
  }));

  useEffect(() => {
    fetchFiles();
  }, []);
  
  const handleFileClick = async (file) => {
    const token = localStorage.getItem("token");

    try {
      const fileContentResponse = await axios.get(`http://localhost:8000/files/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const chatHistoryResponse = await axios.get(`http://localhost:8000/chats/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
     
      onSelectFile(file, fileContentResponse.data, chatHistoryResponse.data);
    } catch (error) {
      console.error("Error fetching file details:", error);
    }
  };

  const filteredFiles = files
    .filter((file) =>
      file.filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time));

  return (
    <div className="file-history  p-0">
      
      <div className={`search-box sticky-top sidecol ${darkMode ? "dark-mode" : "light-mode"} pt-3 pb-2`}>
      
      <h6 className="text-center fw-bold mb-2"><FolderOpen size={16} aria-hidden="true" /> My Files</h6>

      <div className="input-group mb-3">
        <span className="input-group-text" aria-hidden="true"><Search size={15} /></span>
        <input
          type="text"
          className="form-control"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search files"
        />
      </div>
      </div>
     
      {filteredFiles.length === 0 ? (
        <p className=" text-center">No files found.</p>
      ) : ( 
        <ul className="list-unstyled ">
          {filteredFiles.map((file) => (
            <li
              key={file.id}
                className={`file-history-item text-truncate ${
    sidebarselectfile===file.id ? "selected" : ""
  }`}
              onClick={() =>{
                
                
                setsidebarselectfile(file.id);
                handleFileClick(file);
              
              }}
              title={`Uploaded: ${new Date(file.upload_time).toLocaleString()}`}
              style={{ cursor: "pointer" }}
            >
              <FileText size={15} aria-hidden="true" /> {file.filename.length > 30 ? file.filename.slice(0, 30) + "..." : file.filename}
              <div className="timestamp small ">
                {new Date(file.upload_time).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}</div>
    
  );
});

export default FileHistory;
