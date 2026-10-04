import { Bot, CircleAlert, UserRound } from "lucide-react";

const roleDetails = {
  user: { label: "You", Icon: UserRound },
  ai: { label: "Assistant", Icon: Bot },
  error: { label: "Error", Icon: CircleAlert },
};

export default function ChatMessage({ message }) {
  const { label, Icon } = roleDetails[message.role] || roleDetails.ai;

  return (
    <div className={`chat-bubble ${message.role}`}>
      <span className="d-flex align-items-center gap-1 fw-semibold mb-1">
        <Icon size={15} aria-hidden="true" /> {label}
      </span>
      {message.content}
    </div>
  );
}