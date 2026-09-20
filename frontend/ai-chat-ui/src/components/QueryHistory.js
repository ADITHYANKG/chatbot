import React, { useEffect,useContext, useState, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { ThemeProvider, ThemeContext } from "../context/ThemeContext";
const QueryHistory = forwardRef(({ onSelectquery,setSelectedSessionId,selectedSessionId,setdatabasename}, ref) => {
  const [query, setquery] = useState([]);
  

  const [searchTerm, setSearchTerm] = useState("");
  const { darkMode, toggleTheme } = useContext(ThemeContext);
  const fetchquery = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const response = await axios.get("http://localhost:8000/db-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setquery(response.data);
    } catch (error) {
      console.error("Error fetching prompt history:", error);
    }
  };
  


 





  useImperativeHandle(ref, () => ({
    refreshqueryList: fetchquery,
    
  }));

  useEffect(() => {
    fetchquery();
  }, []);
    
    const filteredqueries = query
    .filter((p) =>
      p.query.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  
    
    // console.log(filteredqueries)
  
  //  console.log("entry.selectid",entry.session_id)
  return (
    <div className="file-history  p-0">
      
      <div className={`search-box sticky-top sidecol ${darkMode ? "dark-mode" : "light-mode"} pt-3 pb-2`}>
      
      <h6 className="text-center fw-bold mb-2"> <i className="bi bi-database-fill-gear"></i> My Chats </h6>

      <input
        type="text"
        className="form-control mb-3"
        placeholder="🔍 Search db queries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      </div>
     
      {filteredqueries.length === 0 ? (
        <p className=" text-center">No queries found.</p>
      ) : ( 
     <ul className="list-unstyled">
  {filteredqueries.map((entry) => (
    <li
      key={entry.session_id}
     className={`file-history-item text-truncate ${
    selectedSessionId === entry.session_id ? "selected" : ""
  }`}
      onClick={() => {
        setdatabasename(entry.database.toUpperCase())
        setSelectedSessionId(entry.session_id);
  
        onSelectquery(entry);
      }}  // We'll define this next
      title={`Session started: ${new Date(entry.time).toLocaleString()}`}
      style={{ cursor: "pointer" }}
    >
      🧾{entry.query.length > 30 ? entry.query.slice(0, 30) + "..." : entry.query}
      <div className="timestamp small">{entry.database} ({new Date(entry.time).toLocaleDateString()})</div>
    </li>
  ))}
</ul>

      )}</div>
    
  );
});

export default QueryHistory;
