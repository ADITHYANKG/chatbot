import React, { useState } from "react";
import axios from "axios";
import { Upload } from "lucide-react";

export default function FileUpload({ setFileContent, setIsTabular, setTableData, onUploadSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const file = event.target.elements.file.files[0];
    const token = localStorage.getItem("token");  // ✅ Retrieve token

    if (!token) {
      console.error("No token found in localStorage.");
      setError("You must be logged in to upload a file.");
      setLoading(false);
      return;
    }

    if (!file) {
      setError("Please select a file to upload.");
      setLoading(false);
      return;
    }

    const allowedTypes = ["pdf", "csv", "xls", "xlsx", "txt"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      setError(`Unsupported file type (${fileExtension}). Allowed: ${allowedTypes.join(", ")}`);
      setLoading(false);
      return;
    }

    console.log("Token being sent:", token);  // ✅ Debugging log
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/upload/", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("File Upload Response:", response.data);

      if (response.data.is_tabular) {
        setIsTabular(true);
        setTableData({
          headers: response.data.table_headers,
          rows: response.data.table_rows,
        });

        const tableString = response.data.table_headers.join(", ") + "\n" +
                            response.data.table_rows.map(row => row.join(", ")).join("\n");

        setFileContent(tableString);
      } else {
        setIsTabular(false);
        setFileContent(response.data.file_text);
      }

      // ✅ 🔥 Trigger refresh regardless of tabular or not
      onUploadSuccess();

    } catch (error) {
      console.error("File Upload Error:", error);
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleFileUpload} className="p-3 bg-light border rounded d-flex align-items-center gap-3">
      <input type="file" name="file" required className="form-control" accept=".pdf,.csv,.xls,.xlsx,.txt" />
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Uploading..." : <><Upload size={16} aria-hidden="true" /> Upload</>}
      </button>
      {/* {error && <p className="text-danger mt-2">{error}</p>} */}
    </form>
  );
}
