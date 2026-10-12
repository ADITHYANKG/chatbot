import { useState } from "react";

// Approximate mid-market USD/INR rate; this is for display only.
const USD_TO_INR_RATE = 95.7;

export default function ChatMessage({ message }) {
  const [showInr, setShowInr] = useState(false);
  const usage = message.role === "ai" ? message.usage : null;
  const tokenCount = usage?.total_tokens;
  const costUsd = usage?.cost == null ? null : Number(usage.cost);
  const costValue = costUsd == null || !Number.isFinite(costUsd)
    ? null
    : showInr ? costUsd * USD_TO_INR_RATE : costUsd;
  const costLabel = costValue != null
    ? showInr && costValue > 0 && costValue < 0.0001
      ? "<₹0.0001"
      : showInr
        ? `₹${costValue.toFixed(costValue > 0 && costValue < 1 ? 4 : 2)}`
        : `$${costValue.toFixed(costValue > 0 && costValue < 0.01 ? 8 : 4)}`
    : null;

  return (
    <div className={`chat-bubble ${message.role}`}>
      {message.content}
      {(tokenCount != null || costLabel) && (
        <div className="chat-usage" aria-label="Response usage">
          {tokenCount != null && <span>{Number(tokenCount).toLocaleString()} tokens</span>}
          {tokenCount != null && costLabel && <span aria-hidden="true">·</span>}
          {costLabel && (
            <button
              type="button"
              className="chat-usage-cost"
              onClick={() => setShowInr((current) => !current)}
              title={showInr ? "Show cost in USD" : `Show approximate INR at ₹${USD_TO_INR_RATE} per USD`}
              aria-label={`Cost ${costLabel}. Click to show in ${showInr ? "USD" : "INR"}.`}
            >
              {costLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
