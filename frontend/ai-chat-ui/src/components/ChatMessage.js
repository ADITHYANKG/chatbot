export default function ChatMessage({ message }) {
  return (
    <div className={`chat-bubble ${message.role}`}>
      {message.content}
    </div>
  );
}
