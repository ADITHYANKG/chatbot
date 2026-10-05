import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PASSWORD_REQUIREMENTS } from "../utils/passwordPolicy";

export default function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  darkMode,
  autoComplete,
  showRequirements = false,
  className = "mb-3",
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="input-group">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={showRequirements ? 8 : undefined}
          maxLength={1024}
          className={`form-control ${darkMode ? "bg-dark text-light border-secondary" : ""}`}
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          className={`btn btn-outline-secondary ${darkMode ? "border-secondary text-light" : ""}`}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {showRequirements && (
        <ul className="list-unstyled small mt-2 mb-0" aria-label="Password requirements">
          {PASSWORD_REQUIREMENTS.map((requirement) => {
            const met = requirement.test(value);
            return (
              <li key={requirement.label} className={met ? "text-success" : "text-muted"}>
                <span aria-hidden="true">{met ? "✓" : "○"}</span> {requirement.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
