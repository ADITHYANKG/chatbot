import React from "react";
import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";

export default function FileContent({ isTabular, tableData, fileContent }) {
  return (
    <div className="file-preview-window">
      <h5 className="mb-3"><FileText size={18} aria-hidden="true" /> Extracted File Content</h5>
         
      {/* ✅ Tabular content */}
      {isTabular && tableData.headers.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-bordered table-striped table-sm">
            <thead className="table-light">
              <tr>
                {tableData.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td key={colIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // ✅ Render markdown-styled text
        <div className="text-preview-box markdown-body">
          <ReactMarkdown>{fileContent || "No content extracted."}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
