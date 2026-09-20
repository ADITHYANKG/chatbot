import React from "react";
import ReactDOM from "react-dom/client";  // ✅ Use createRoot
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";
import './styles/styles.css';
import './styles/chat.css';
import './styles/professional-theme.css';  // This one last to override
  // ✅ Import global styles


// ✅ React 18 uses createRoot
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
