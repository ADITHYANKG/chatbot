import { useState } from "react";

export default function ModelInfoButton({ modelName }) {
  const [open, setOpen] = useState(false);

  if (!modelName) return null;

  return (
    <span className="model-info-control">
      <button
        type="button"
        className="model-info-button"
        aria-label="Show model in use"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <img className="model-info-logo" src="/custom_logo.png" alt="" aria-hidden="true" />
      </button>
      {open && (
        <span className="model-info-popover" role="status">
          <span>Model in use</span>
          <strong>{modelName}</strong>
        </span>
      )}
    </span>
  );
}
