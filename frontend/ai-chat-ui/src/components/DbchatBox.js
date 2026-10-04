import React, { useState, useRef, useEffect,useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { Database, Send } from "lucide-react";
import ChatMessage from "./ChatMessage";

export default function DbChatBox({dbHistory, setDbHistory,QueryHistoryRef,selectedSessionId,setSelectedSessionId,databasename,setdatabasename}) {
  const [query, setQuery] = useState("");
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const [heading,setheading]=useState("")
  const [formLoading,setFormLoading]=useState(false)
  const [deloading,setdeloading]=useState(false)
  const { darkMode } = useContext(ThemeContext);
  const [connected, setConnected] = useState(false);

  

  const [availableDatabases, setAvailableDatabases] = useState([]);

  const handlePasswordBlur = async () => {
  if (!config.hostname || !config.port || !config.user || !config.password) {
    return; // only fetch if all needed fields are filled
  }

  try {
    const response = await axios.post("http://localhost:8000/connect/", {
      db_config: {
        MYSQL_HOST: config.hostname,
        MYSQL_PORT: config.port,
        MYSQL_USER: config.user,
        MYSQL_PASSWORD: config.password,
        MYSQL_DATABASE: "__probe_only__"
      },fetch_mode:true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.status === "success") {
      console.log("db====",response.data.database)
      setAvailableDatabases(response.data.databases);
    } else {
      alert("Error: " + response.data.message);
      setAvailableDatabases([]);
    }
  } catch (err) {
    alert("Failed to fetch databases.");
    setAvailableDatabases([]);
    console.error(err);
  }
};





  const [openform,setopenform]=useState(false)
  const [config, setConfig] = useState({
    hostname: "localhost",
    port: "3306",
    user: "root",
    password: "",
    database: "",
  });

   

  const [sessionId, setSessionId] = useState(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbHistory]);
  
  //states for loading bar
  const [progressPercent, setProgressPercent] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isApiRunning, setIsApiRunning] = useState(false);
  // const estimatedTime = 5000;
  
  // console.log("selectedsessionid",selectedSessionId)
  // console.log("currentsesssionId",sessionId)
  let isBlocked=false
  // console.log("condition",selectedSessionId&&sessionId)
  if (selectedSessionId && sessionId){
       isBlocked = selectedSessionId !== sessionId;
  }
  
  // console.log(isBlocked)

  //logic for loading bar
  useEffect(() => {
    let animationFrame;
     
    const updateProgress = () => {
      if (!startTime || !isApiRunning) return;

  const now = performance.now();
  const elapsed = now - startTime;

  // Animate to max 95%, API response will force it to 100
  const percent = Math.min((elapsed / 5000) * 100, 99);
  setProgressPercent(Math.round(percent));

  if (percent < 99 && isApiRunning) {
    animationFrame = requestAnimationFrame(updateProgress);
  }
    };
    
    if (isApiRunning) {
      animationFrame = requestAnimationFrame(updateProgress);
    }
    
    return () => cancelAnimationFrame(animationFrame);
  }, [isApiRunning, startTime]);
  
  
  
  const handleConnect = async () => {
    
    setdeloading(false)
    if (!config.user || !config.password || !config.database) {
      alert("Please fill in user, password, and database name.");
      return;
    }
    
      
    console.log("database name:",config.database)
    setFormLoading(true); // ⏳ Start loading bar
    setIsApiRunning(true);
    setStartTime(performance.now());
    console.log("🕐 startTime:", startTime);
    
    let status="error"
    try {
      const response = await axios.post("http://localhost:8000/connect/", {
        db_config: {
          MYSQL_HOST: config.hostname,
          MYSQL_PORT: config.port,
          MYSQL_USER: config.user.toLowerCase(),
          MYSQL_PASSWORD: config.password,
          MYSQL_DATABASE: config.database.toLowerCase(),
        },
      }, { headers: { Authorization: `Bearer ${token}` } });
      status=response.data.status
      console.log("response---------",response.data.status)
      if (response.data.status === "connected") {
       
        setheading(config.database.toUpperCase())
        // setConnected(true);
        setSelectedSessionId(response.data.session_id)
        setSessionId(response.data.session_id); 
         
      } else {
        
        alert("Database connection failed: " + (response.data.message || "Unknown error"));
        setProgressPercent(0)
        setIsApiRunning(false)
        setFormLoading(false)
        return 
      }
    } catch (err) {
      console.log("catch")
      console.error("Connection error:", err);
      alert("Failed to connect to the database.");
    } finally {
    console.log("finally") 
    const endTime = performance.now();
    console.log("🕐 endtime:", endTime);
    const actualElapsed = endTime - startTime;
    console.log(`⏱️ API responded in ${actualElapsed.toFixed(2)} ms`);

     // ensure bar is filled
   setProgressPercent(100);
   console.log(config.database)
  console.log(progressPercent)
  
  // Reset the progress bar after short delay to show completion
  setTimeout(() => {
    setFormLoading(false);
    
     setIsApiRunning(false);
     if (status==="connected"){
           setopenform(false)
          setConfig({
          hostname: "localhost",
          port: "3306",
          user: "root",
          password: "",
          database: "",
        });
        
        setConnected(true);

  
      
  
     }
     
    setProgressPercent(0);
  }, 1000); // keep bar




    // //   setProgressPercent(100)
    // setFormLoading(false);
    // // setTimeout(() => {
    //   setFormLoading(false);
    // //   setIsApiRunning(false);
    // //   setProgressPercent(0);
    // // }, 500);
    
    
    // ✅ Stop loading bar
    }
  };
   
  //for db-form open and close
  const handleform=async()=>{
   setDbHistory([])

    setopenform(true)
  }
  

  
  const handleDisconnect = async () => {
    
     console.log("progresspercentage=",progressPercent)
    setdeloading(true)
    try {
      const response = await axios.post("http://localhost:8000/disconnect/",{},{ headers: { Authorization: `Bearer ${token}` } });
      // console.log("response=",response.data.status)
      if (response.data.status === "disconnected") {
        setConnected(false);
        setdatabasename("")
        setDbHistory([]);
        setopenform(false)
        setheading("")
       
      } else {
        alert("Failed to disconnect.");
      }
    } catch (err) {
      console.error("Disconnection error:", err);
      alert("Failed to disconnect.");
    }
  };
  
  
  

  const handleQuery = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    const newMessages = [...dbHistory, { role: "user", content: query }];
    setDbHistory(newMessages);
    setQuery("");
    setLoading(true);
    // console.log("handlequery executed")
    try {
      console.log("sessionid=",sessionId)
      const response = await axios.post(
        "http://localhost:8000/query/",
        { query,mode:"database",session_id:sessionId,database:heading.toLowerCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDbHistory([...newMessages, { role: "ai", content: response.data.response }]);
    } catch (error) {
      console.error("Query Error:", error);
      setDbHistory([...newMessages, { role: "error", content: "Error processing your request." }]);
    } finally {
      setLoading(false);
    }
    if (QueryHistoryRef?.current?.refreshqueryList) {
      console.log("🔄 Triggering sidebar history refresh...");
      QueryHistoryRef.current.refreshqueryList(); // This should now work
    }
    
   
  };
  
  // console.log("connected",connected)
  // console.log(dbHistory)
  

const isViewingOldHistory =
selectedSessionId && (!sessionId || selectedSessionId !== sessionId);


const displayDbName = isViewingOldHistory
  ? databasename
  : heading || databasename; 
// console.log("→ Display DB:", displayDbName, "| From:", isViewingOldHistory ? "databasename" : "heading");

// console.log("→ selectedSessionId:", selectedSessionId);
// console.log("→ sessionId:", sessionId);
// console.log("→ isViewingOldHistory:", isViewingOldHistory);

const statusText = connected && !isViewingOldHistory ? "Connected" : isViewingOldHistory ? "No connection" : "No connection";
const statusColor = connected && !isViewingOldHistory ? "green" : "grey";




console.log("openform=",openform)






  return (
    <div className="chat-panel ">
       
      {/* 🔌 DB Connection Form */}
      {/* ✅ Connection Status Box - always rendered */}
       

  
  



  <div className="db-connection-wrapper d-flex justify-content-center align-items-center pb-2 mb-4 border-bottom">
    <div className="w-100 rounded px-3 py-2 d-flex justify-content-around align-items-center " style={{width:"100%", maxWidth: "1000px" }}>
  
      {/* ✅ Left: Status Ring + Text */}
   <div className="d-flex align-items-center gap-2">
  <span
    className="d-inline-block"
    style={{
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      border: `5px solid ${statusColor}`,
      backgroundColor: "transparent"
    }}
  ></span>
  <span className="fw-semibold small">{statusText}</span>
</div>


      {/* ✅ Center: DB Name */}
      <div className="fw-bold text-center text-truncate small">
  <Database size={16} aria-hidden="true" /> {!openform &&  displayDbName || " "}
</div>

      
      {/* ✅ Right: Disconnect */}
      <div>{!isViewingOldHistory &&
  (
      
      
      connected?(
        <button className="btn btn-danger btn-sm" onClick={handleDisconnect} disabled={deloading}>
          {deloading ?<div className="d-flex align-items-center gap-2"><div className="spinner-border spinner-border-sm" />Disconnecting...</div> : "Disconnect"}
        </button>):(<button
      onClick={handleform}
      className="btn btn-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
      title="Toggle DB Connection"
    >
      <Database size={16} aria-hidden="true" />
      <span className="d-none d-md-inline">Connect</span>
    </button>)
        
    )  }
      </div>



    </div>
  </div>



{/* ✅ DB Connection Form Wrapper */}



<>{(!connected&&openform) && (
  
  
  <div className="db-connection-wrapper d-flex justify-content-center align-items-center mb-4 pb-4 border-bottom">
    <div className={`border rounded p-4 ${darkMode ? "bg-dark text-white" : "bg-light"}`} style={{ width: "100%", maxWidth: "700px" }}>



<form  onSubmit={(e) => { e.preventDefault(); handleConnect(); }}>


      <h6 className="fw-bold text-center mb-3"><Database size={18} aria-hidden="true" /> Connect your database</h6>
      
      <div className="row g-2 mb-2">
        <div className="col-6">
          <label className="form-label small mb-1">Hostname</label>
          <input
            className="form-control form-control-sm"
            placeholder="Hostname"
            value={config.hostname}
            onChange={(e) => setConfig({ ...config, hostname: e.target.value })}
            disabled={formLoading}
          />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Port</label>
          <input
            className="form-control form-control-sm"
            placeholder="Port number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: e.target.value })}
            disabled={formLoading}
          />
        </div>
      </div>

      <div className="row g-2 mb-2">
        <div className="col-6">
          <label className="form-label small mb-1">User</label>
          <input
            className="form-control form-control-sm"
            placeholder="User"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            disabled={formLoading}
          />
        </div>
        <div className="col-6">
          <label className="form-label small mb-1">Password</label>
          <input
            type="password"
            className="form-control form-control-sm"
            placeholder="Password"
            value={config.password}
            onBlur={handlePasswordBlur} 
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            disabled={formLoading}
          />
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-8">
          <label className="form-label small mb-1">Database Name</label>
     <input
  type="text"
  list="database-options"
  className="form-control form-control-sm"
  value={config.database}
  onChange={(e) =>
    setConfig({ ...config, database: e.target.value })
  }
/>
<datalist id="database-options">
  {availableDatabases.map((db) => (
    <option key={db} value={db} />
  ))}
</datalist>


        </div>
        <div className="col-4 d-flex align-items-end">
          <button
            type="submit"
            className="btn btn-success btn-sm w-100"
            onClick={handleConnect}
            disabled={formLoading}
          >
            <Database size={15} aria-hidden="true" /> Connect
          </button>
        </div>
      </div>

      {/* ✅ Progressive Loading Bar */}
      {formLoading && (
  <div className="custom-progress-container">
    <div className="custom-progress-label">
      <span>Trying to connect..</span>
      <span>{progressPercent}%</span>
    </div>
    <div className="custom-progress-bar">
      <div
        className="custom-progress-bar-fill"
        style={{ width: `${progressPercent}%` }}
      ></div>
    </div>
  </div>
)}
    </form>
    </div>
  </div>
)}
</>









 {/* 💬 Chat UI */}
     
     {!openform&& <div className="flex-grow-1 overflow-auto">
        {dbHistory.length === 0 ? (<>{connected? (<p className="text-center">Start querying the database...</p>):
        (<p className="text-center">Connect the db and start to query...</p>)}</>
          
          
        ) : (
          dbHistory.map((msg, index) => <ChatMessage key={index} message={msg} />)
        )}
        {loading && (
          <div className="text-center my-2">
            <div className="spinner-border spinner-border-sm text-success"></div>
            <p>DB Model is thinking...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>}
  {/* 🧠 Input Area */}
      <form onSubmit={handleQuery} className="chat-input-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type your database query..."
          disabled={loading || !connected ||isBlocked}
        />
        <button type="submit" disabled={loading || !connected }>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}












